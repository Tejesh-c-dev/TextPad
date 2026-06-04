import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { copyToClipboard } from '../lib/api.js';

export default function SettingsPanel({ slug, note, language, readOnly, theme, onClose, onChange, onToggleTheme, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const shareUrl = window.location.href;

  function handleCopyLink() {
    copyToClipboard(shareUrl);
    toast.success('Link copied!');
  }

  function handleCopyMarkdown() {
    const md = `[${note?.title || slug}](${shareUrl})`;
    copyToClipboard(md);
    toast.success('Markdown link copied!');
  }

  const rowStyle = {
    borderBottom: '1px solid var(--border)',
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-sm animate-slide-in-right"
        style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Note Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Share section */}
          <div className="px-5 py-4" style={rowStyle}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Share
            </h3>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2 overflow-hidden"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <span className="text-xs truncate flex-1 font-mono" style={{ color: 'var(--text-2)' }}>
                {shareUrl}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ background: '#6351e8', color: 'white' }}
                onMouseEnter={e => e.currentTarget.style.background = '#7c6af5'}
                onMouseLeave={e => e.currentTarget.style.background = '#6351e8'}
              >
                Copy Link
              </button>
              <button
                onClick={handleCopyMarkdown}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                Copy as MD
              </button>
            </div>
          </div>

          {/* Display section */}
          <div className="px-5 py-4" style={rowStyle}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Display
            </h3>

            {/* Theme toggle */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color: 'var(--text)' }}>Theme</span>
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
          </div>

          {/* Access section */}
          <div className="px-5 py-4" style={rowStyle}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Access
            </h3>

            {/* Read only toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm" style={{ color: 'var(--text)' }}>Read Only</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  Prevent others from editing
                </p>
              </div>
              <button
                onClick={() => onChange({ readOnly: !readOnly })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                style={{ background: readOnly ? '#6351e8' : 'var(--bg-3)' }}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${readOnly ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                  style={{ transform: readOnly ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </div>

          {/* Info section */}
          <div className="px-5 py-4" style={rowStyle}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Info
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Slug', value: `/${slug}` },
                { label: 'Language', value: language },
                { label: 'Views', value: note?.viewCount?.toLocaleString() || '—' },
                { label: 'Created', value: note?.createdAt ? new Date(note.createdAt).toLocaleDateString() : '—' },
                { label: 'Last edited by', value: note?.lastEditedBy || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#ef4444' }}>
              Danger Zone
            </h3>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1px solid #ef444433', color: '#ef4444' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ef444411'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Delete Note
              </button>
            ) : (
              <div className="rounded-lg p-3" style={{ background: '#ef444411', border: '1px solid #ef444433' }}>
                <p className="text-xs mb-3" style={{ color: '#ef4444' }}>
                  This will permanently delete this note and all its versions. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onDelete}
                    className="flex-1 py-2 rounded-lg text-xs font-medium text-white"
                    style={{ background: '#ef4444' }}
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}