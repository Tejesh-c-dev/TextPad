const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');
const Note = require('../models/Note');

const router = express.Router();
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

// In-memory fallback store for when MongoDB is unavailable
const memoryStore = new Map();

// Validation schemas
const createNoteSchema = Joi.object({
  slug: Joi.string().pattern(/^[a-z0-9_-]+$/).min(1).max(100).optional(),
  title: Joi.string().max(200).optional().default('Untitled'),
  content: Joi.string().max(1000000).optional().default(''),
  password: Joi.string().min(4).max(100).optional(),
  readOnly: Joi.boolean().optional().default(false),
  language: Joi.string().valid('markdown','javascript','typescript','python','html','css','json','yaml','bash','sql','rust','go','java','cpp','plaintext').optional(),
  theme: Joi.string().valid('dark','light').optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
});

const updateNoteSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  content: Joi.string().max(1000000).optional(),
  language: Joi.string().valid('markdown','javascript','typescript','python','html','css','json','yaml','bash','sql','rust','go','java','cpp','plaintext').optional(),
  theme: Joi.string().valid('dark','light').optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  readOnly: Joi.boolean().optional(),
  saveVersion: Joi.boolean().optional(),
  versionLabel: Joi.string().max(100).optional(),
  savedBy: Joi.string().max(50).optional(),
});

function isMongoConnected() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

// Helper: get or create note (memory fallback)
async function getNote(slug) {
  if (isMongoConnected()) {
    return await Note.findOne({ slug });
  }
  return memoryStore.get(slug) || null;
}

async function saveNote(noteData) {
  if (isMongoConnected()) {
    if (noteData._id) {
      return await Note.findByIdAndUpdate(noteData._id, noteData, { new: true, runValidators: true });
    }
    const note = new Note(noteData);
    return await note.save();
  }
  // Memory fallback
  const existing = memoryStore.get(noteData.slug);
  const note = {
    ...existing,
    ...noteData,
    _id: existing?._id || noteData.slug,
    id: noteData.slug,
    versions: existing?.versions || [],
    viewCount: existing?.viewCount || 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryStore.set(noteData.slug, note);
  return note;
}

// GET /api/notes/:slug — fetch a note
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const note = await getNote(slug);

    if (!note) {
      return res.status(404).json({ error: 'Note not found', exists: false });
    }

    // Increment views
    if (isMongoConnected() && note.incrementViews) {
      note.incrementViews().catch(() => {});
    }

    const safeNote = {
      id: note._id || note.id,
      slug: note.slug,
      title: note.title,
      content: note.content,
      language: note.language || 'markdown',
      theme: note.theme || 'dark',
      tags: note.tags || [],
      isProtected: note.isProtected,
      readOnly: note.readOnly || false,
      activeUsers: note.activeUsers || 0,
      viewCount: note.viewCount || 0,
      lastEditedBy: note.lastEditedBy || 'anonymous',
      versionCount: note.versions?.length || 0,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };

    res.json(safeNote);
  } catch (err) {
    next(err);
  }
});

// POST /api/notes — create a note
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = createNoteSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const slug = value.slug || nanoid();

    // Check uniqueness
    const existing = await getNote(slug);
    if (existing) {
      return res.status(409).json({ error: 'A note with this slug already exists', slug });
    }

    const noteData = {
      slug,
      title: value.title || 'Untitled',
      content: value.content || '',
      language: value.language || 'markdown',
      theme: value.theme || 'dark',
      tags: value.tags || [],
      readOnly: value.readOnly || false,
      isProtected: !!value.password,
      versions: [],
    };

    if (value.password) {
      noteData.password = await bcrypt.hash(value.password, 10);
    }

    const note = await saveNote(noteData);

    res.status(201).json({
      id: note._id || note.id,
      slug: note.slug,
      title: note.title,
      content: note.content,
      language: note.language,
      theme: note.theme,
      tags: note.tags,
      isProtected: note.isProtected,
      readOnly: note.readOnly,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    next(err);
  }
});

// PATCH /api/notes/:slug — update a note
router.patch('/:slug', async (req, res, next) => {
  try {
    const { error, value } = updateNoteSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { slug } = req.params;

    if (isMongoConnected()) {
      let note = await Note.findOne({ slug });
      if (!note) return res.status(404).json({ error: 'Note not found' });

      if (note.readOnly) return res.status(403).json({ error: 'Note is read-only' });

      // Save version if requested
      if (value.saveVersion) {
        await note.saveVersion(value.savedBy || 'anonymous', value.versionLabel || '');
      }

      const updates = {};
      if (value.title !== undefined) updates.title = value.title;
      if (value.content !== undefined) updates.content = value.content;
      if (value.language !== undefined) updates.language = value.language;
      if (value.theme !== undefined) updates.theme = value.theme;
      if (value.tags !== undefined) updates.tags = value.tags;
      if (value.readOnly !== undefined) updates.readOnly = value.readOnly;
      if (value.savedBy !== undefined) updates.lastEditedBy = value.savedBy;

      Object.assign(note, updates);
      await note.save();

      return res.json({
        id: note._id,
        slug: note.slug,
        title: note.title,
        content: note.content,
        language: note.language,
        updatedAt: note.updatedAt,
        versionCount: note.versions.length,
      });
    } else {
      // Memory fallback
      const note = memoryStore.get(slug);
      if (!note) return res.status(404).json({ error: 'Note not found' });

      const updates = { ...note };
      if (value.title !== undefined) updates.title = value.title;
      if (value.content !== undefined) updates.content = value.content;
      if (value.language !== undefined) updates.language = value.language;
      if (value.theme !== undefined) updates.theme = value.theme;
      if (value.tags !== undefined) updates.tags = value.tags;
      updates.updatedAt = new Date().toISOString();

      if (value.saveVersion) {
        updates.versions = [...(note.versions || []), {
          _id: Date.now().toString(),
          content: note.content,
          title: note.title,
          savedAt: new Date().toISOString(),
          savedBy: value.savedBy || 'anonymous',
          label: value.versionLabel || '',
        }].slice(-50);
      }

      memoryStore.set(slug, updates);
      return res.json(updates);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:slug/versions — get version history
router.get('/:slug/versions', async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (isMongoConnected()) {
      const note = await Note.findOne({ slug }).select('versions slug title');
      if (!note) return res.status(404).json({ error: 'Note not found' });

      const versions = note.versions.slice().reverse().map(v => ({
        id: v._id,
        title: v.title,
        contentPreview: (v.content || '').slice(0, 200),
        savedAt: v.savedAt,
        savedBy: v.savedBy,
        label: v.label,
        size: (v.content || '').length,
      }));

      return res.json({ slug, versions, total: versions.length });
    } else {
      const note = memoryStore.get(slug);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      return res.json({ slug, versions: (note.versions || []).reverse(), total: note.versions?.length || 0 });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:slug/versions/:versionId — restore specific version
router.get('/:slug/versions/:versionId', async (req, res, next) => {
  try {
    const { slug, versionId } = req.params;

    if (isMongoConnected()) {
      const note = await Note.findOne({ slug });
      if (!note) return res.status(404).json({ error: 'Note not found' });

      const version = note.versions.id(versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      return res.json({
        id: version._id,
        content: version.content,
        title: version.title,
        savedAt: version.savedAt,
        savedBy: version.savedBy,
        label: version.label,
      });
    } else {
      const note = memoryStore.get(slug);
      const version = note?.versions?.find(v => v._id === versionId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      return res.json(version);
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:slug — delete a note
router.delete('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (isMongoConnected()) {
      const result = await Note.deleteOne({ slug });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Note not found' });
    } else {
      if (!memoryStore.has(slug)) return res.status(404).json({ error: 'Note not found' });
      memoryStore.delete(slug);
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/notes/:slug/verify — verify note password
router.post('/:slug/verify', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ error: 'Password required' });

    let note;
    if (isMongoConnected()) {
      note = await Note.findOne({ slug }).select('+password');
    } else {
      note = memoryStore.get(slug);
    }

    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!note.isProtected) return res.json({ valid: true });

    const valid = await bcrypt.compare(password, note.password);
    res.json({ valid });
  } catch (err) {
    next(err);
  }
});

module.exports = router;