const { Server } = require('socket.io');
const Note = require('../models/Note');

// In-memory presence tracking: { slug -> Map<socketId, userInfo> }
const roomPresence = new Map();
// Autosave debounce timers per slug
const autosaveTimers = new Map();
// In-memory note content buffer (for memory-mode)
const noteBuffer = new Map();

function isMongoConnected() {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
}

function getRoomUsers(slug) {
  const room = roomPresence.get(slug);
  if (!room) return [];
  return Array.from(room.values());
}

async function autosaveNote(slug, content, title, username) {
  try {
    if (isMongoConnected()) {
      const note = await Note.findOne({ slug });
      if (!note) return;

      // Save a version every ~10 saves or on significant changes
      const shouldVersion = note.versions.length === 0 ||
        Math.abs((note.content || '').length - content.length) > 200;

      if (shouldVersion && (note.content !== content)) {
        await note.saveVersion(username, 'Autosave');
      }

      note.content = content;
      note.title = title || note.title;
      note.lastEditedBy = username || 'anonymous';
      await note.save();
    } else {
      // Memory fallback
      const existing = noteBuffer.get(slug) || {};
      noteBuffer.set(slug, { ...existing, content, title: title || existing.title || 'Untitled', updatedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error(`Autosave failed for ${slug}:`, err.message);
  }
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    let currentSlug = null;
    let currentUser = null;

    // Join a note room
    socket.on('note:join', ({ slug, user }) => {
      if (!slug || !user) return;

      currentSlug = slug.toLowerCase().trim();
      currentUser = {
        socketId: socket.id,
        username: user.username || 'Anonymous',
        color: user.color || '#6366f1',
        cursor: null,
        joinedAt: new Date().toISOString(),
      };

      socket.join(currentSlug);

      // Track presence
      if (!roomPresence.has(currentSlug)) {
        roomPresence.set(currentSlug, new Map());
      }
      roomPresence.get(currentSlug).set(socket.id, currentUser);

      // Notify room of new user
      socket.to(currentSlug).emit('presence:join', currentUser);

      // Send current presence list to new user
      socket.emit('presence:list', getRoomUsers(currentSlug));

      console.log(`👤 ${currentUser.username} joined /${currentSlug} (${getRoomUsers(currentSlug).length} users)`);
    });

    // Real-time content sync
    socket.on('note:change', ({ slug, content, title, cursor }) => {
      if (!slug || slug !== currentSlug) return;

      // Broadcast to all others in room
      socket.to(slug).emit('note:update', {
        content,
        title,
        cursor,
        username: currentUser?.username,
        socketId: socket.id,
        timestamp: Date.now(),
      });

      // Update cursor in presence
      if (currentSlug && currentUser) {
        const room = roomPresence.get(currentSlug);
        if (room && cursor !== undefined) {
          const user = room.get(socket.id);
          if (user) {
            user.cursor = cursor;
            room.set(socket.id, user);
          }
        }
      }

      // Debounced autosave (3 seconds after last change)
      if (autosaveTimers.has(slug)) {
        clearTimeout(autosaveTimers.get(slug));
      }
      const timer = setTimeout(() => {
        autosaveNote(slug, content, title, currentUser?.username);
        autosaveTimers.delete(slug);
      }, 3000);
      autosaveTimers.set(slug, timer);
    });

    // Cursor position updates
    socket.on('cursor:move', ({ slug, position, selection }) => {
      if (!slug || slug !== currentSlug) return;
      socket.to(slug).emit('cursor:update', {
        socketId: socket.id,
        username: currentUser?.username,
        color: currentUser?.color,
        position,
        selection,
      });
    });

    // User typing indicator
    socket.on('user:typing', ({ slug, isTyping }) => {
      if (!slug || slug !== currentSlug) return;
      socket.to(slug).emit('user:typing', {
        socketId: socket.id,
        username: currentUser?.username,
        color: currentUser?.color,
        isTyping,
      });
    });

    // Manual save version
    socket.on('note:saveVersion', async ({ slug, label }) => {
      if (!slug || !isMongoConnected()) return;
      try {
        const note = await Note.findOne({ slug });
        if (note) {
          await note.saveVersion(currentUser?.username || 'anonymous', label || 'Manual save');
          await note.save();
          socket.emit('version:saved', { message: 'Version saved', versionCount: note.versions.length });
          io.to(slug).emit('version:update', { versionCount: note.versions.length });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to save version' });
      }
    });

    // Note settings change
    socket.on('note:settings', ({ slug, settings }) => {
      if (!slug || slug !== currentSlug) return;
      socket.to(slug).emit('note:settings', { settings, username: currentUser?.username });
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      if (currentSlug && currentUser) {
        const room = roomPresence.get(currentSlug);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            roomPresence.delete(currentSlug);
          }
        }

        socket.to(currentSlug).emit('presence:leave', {
          socketId: socket.id,
          username: currentUser.username,
        });

        console.log(`👋 ${currentUser.username} left /${currentSlug}`);
      }
    });
  });

  console.log('🔌 Socket.IO initialized');
  return io;
}

module.exports = { initSocket };