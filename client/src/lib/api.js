const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Notes
  getNote: (slug) => request(`/notes/${slug}`),
  createNote: (data) => request('/notes', { method: 'POST', body: data }),
  updateNote: (slug, data) => request(`/notes/${slug}`, { method: 'PATCH', body: data }),
  deleteNote: (slug) => request(`/notes/${slug}`, { method: 'DELETE' }),
  verifyPassword: (slug, password) => request(`/notes/${slug}/verify`, { method: 'POST', body: { password } }),

  // Versions
  getVersions: (slug) => request(`/notes/${slug}/versions`),
  getVersion: (slug, versionId) => request(`/notes/${slug}/versions/${versionId}`),

  // Auth
  createSession: () => request('/auth/session', { method: 'POST' }),
};

// Generate a random slug
export function generateSlug() {
  const words = ['notes','ideas','draft','memo','doc','log','plan','todo','blog','wiki','pad','board','page','text','write'];
  const word = words[Math.floor(Math.random() * words.length)];
  const id = Math.random().toString(36).slice(2, 6);
  return `${word}-${id}`;
}

// Sanitize slug input
export function sanitizeSlug(input) {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 100);
}

// Format file size
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format relative time
export function timeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}