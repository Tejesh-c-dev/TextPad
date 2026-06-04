const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  title: { type: String, default: 'Untitled' },
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: String, default: 'anonymous' },
  label: { type: String, default: '' },
}, { _id: true });

const noteSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_-]+$/, 'Slug can only contain letters, numbers, hyphens, and underscores'],
    minlength: 1,
    maxlength: 100,
  },
  title: {
    type: String,
    default: 'Untitled',
    maxlength: 200,
    trim: true,
  },
  content: {
    type: String,
    default: '',
    maxlength: 1000000, // 1MB text limit
  },
  password: {
    type: String,
    default: null,
    select: false,
  },
  isProtected: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  language: {
    type: String,
    default: 'markdown',
    enum: ['markdown', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'yaml', 'bash', 'sql', 'rust', 'go', 'java', 'cpp', 'plaintext'],
  },
  theme: {
    type: String,
    default: 'dark',
    enum: ['dark', 'light'],
  },
  versions: {
    type: [versionSchema],
    default: [],
  },
  activeUsers: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  lastEditedBy: {
    type: String,
    default: 'anonymous',
  },
  expiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0, sparse: true },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index for search
noteSchema.index({ createdAt: -1 });
noteSchema.index({ updatedAt: -1 });

// Virtual for version count
noteSchema.virtual('versionCount').get(function () {
  return this.versions.length;
});

// Save version before content update (keep last 50 versions)
noteSchema.methods.saveVersion = async function (savedBy = 'anonymous', label = '') {
  if (this.content || this.title) {
    this.versions.push({
      content: this.content,
      title: this.title,
      savedAt: new Date(),
      savedBy,
      label,
    });

    // Keep only the last 50 versions
    if (this.versions.length > 50) {
      this.versions = this.versions.slice(-50);
    }
  }
};

// Increment view count
noteSchema.methods.incrementViews = async function () {
  this.viewCount = (this.viewCount || 0) + 1;
  await this.save();
};

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;