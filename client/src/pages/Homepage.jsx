import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, generateSlug, sanitizeSlug } from '../lib/api.js';
import { useTheme } from '../hooks/useTheme.jsx';

const RECENT_KEY = 'cn_recent_notes';

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [recent, setRecent] = useState(getRecent());

  function handleGo(e) {
    e.preventDefault();
    const s = sanitizeSlug(slug.trim() || generateSlug());
    if (s) navigate(`/${s}`);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    const s = sanitizeSlug(slug.trim() || generateSlug());
    try {
      await api.createNote({ slug: s, title: 'Untitled', content: '' });
    } catch (err) {
      if (err.status !== 409) {
        toast.error('Failed to create note');
        setCreating(false);
        return;
      }
    }
    navigate(`/${s}`);
  }

  const examples = [
    { slug: 'quickstart', label: 'Quick Start Guide', icon: '🚀' },
    { slug: 'meeting-notes', label: 'Meeting Notes', icon: '📋' },
    { slug: 'code-snippets', label: 'Code Snippets', icon: '💻' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#6351e8"/>
            <path d="M7 9h14M7 14h10M7 19h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="font-display font-bold text-lg tracking-tight" style={{ color: 'var(--text)' }}>
            CollabNotes
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}
            onMouseEnter={e => e.target.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
          >
            GitHub
          </a>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #6351e8 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-hover)', border: '1px solid rgba(99,81,232,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot inline-block" />
            Real-time collaboration
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4 leading-tight tracking-tight" style={{ color: 'var(--text)' }}>
            Notes that live{' '}
            <span style={{ color: 'var(--accent-hover)' }}>together</span>
          </h1>
          <p className="text-lg mb-10" style={{ color: 'var(--text-2)' }}>
            Create a note, share the link, collaborate instantly. No sign-up required.
          </p>

          {/* Main input */}
          <form onSubmit={handleGo} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-4">
            <div className="flex-1 flex items-center rounded-xl px-4 gap-2"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <span className="text-sm font-mono select-none" style={{ color: 'var(--text-3)' }}>
                {window.location.host}/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(sanitizeSlug(e.target.value))}
                placeholder="my-note"
                className="flex-1 bg-transparent outline-none py-3 text-sm font-mono"
                style={{ color: 'var(--text)' }}
                autoFocus
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 justify-center"
              style={{
                background: '#6351e8',
                color: 'white',
                boxShadow: '0 0 20px rgba(99,81,232,0.3)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#7c6af5'}
              onMouseLeave={e => e.currentTarget.style.background = '#6351e8'}
            >
              {creating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Open Note →</>
              )}
            </button>
          </form>

          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Enter a name or leave blank for a random URL
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl w-full mx-auto mt-16 px-4">
          {[
            { icon: '⚡', label: 'Real-time sync' },
            { icon: '📝', label: 'Markdown + code' },
            { icon: '🔒', label: 'Password protect' },
            { icon: '⏳', label: 'Version history' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Recent notes */}
        {recent.length > 0 && (
          <div className="relative z-10 max-w-3xl w-full mx-auto mt-10 px-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
              Recent Notes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {recent.slice(0, 6).map(item => (
                <button
                  key={item.slug}
                  onClick={() => navigate(`/${item.slug}`)}
                  className="flex items-center gap-3 rounded-xl p-3 text-left transition-all group"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'var(--bg-3)' }}>
                    📄
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {item.title || item.slug}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>/{item.slug}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs" style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
        CollabNotes — Open, real-time, no account needed.
      </footer>
    </div>
  );
}