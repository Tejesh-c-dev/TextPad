import React from 'react';
import { copyToClipboard } from '../lib/api.js';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { value: 'markdown', label: 'Markdown', icon: '📝' },
  { value: 'javascript', label: 'JavaScript', icon: '🟡' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'html', label: 'HTML', icon: '🌐' },
  { value: 'css', label: 'CSS', icon: '🎨' },
  { value: 'json', label: 'JSON', icon: '📦' },
  { value: 'yaml', label: 'YAML', icon: '⚙️' },
  { value: 'bash', label: 'Bash', icon: '💻' },
  { value: 'sql', label: 'SQL', icon: '🗄️' },
  { value: 'rust', label: 'Rust', icon: '🦀' },
  { value: 'go', label: 'Go', icon: '🐹' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚡' },
  { value: 'plaintext', label: 'Plain Text', icon: '📄' },
];

export default function Toolbar({ view, onViewChange, language, onLanguageChange, onSave, onToggleTheme, theme, readOnly, content }) {

  function handleCopyContent() {
    copyToClipboard(content);
    toast.success('Copied to clipboard!');
  }

  function handleDownload() {
    const ext = language === 'markdown' ? 'md' : language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : language === 'html' ? 'html' : language === 'css' ? 'css' : language === 'json' ? 'json' : language === 'yaml' ? 'yaml' : language === 'bash' ? 'sh' : language === 'sql' ? 'sql' : language === 'rust' ? 'rs' : language === 'go' ? 'go' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'txt';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const btnBase = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all`;
  const btnStyle = (active) => ({
    background: active ? 'var(--accent-subtle)' : 'transparent',
    color: active ? 'var(--accent-hover)' : 'var(--text-2)',
    border: `1px solid ${active ? 'rgba(99,81,232,0.3)' : 'transparent'}`,
  });

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>

      {/* View mode */}
      <div className="flex items-center gap-0.5 mr-2">
        {[
          { id: 'edit', icon: '✏️', label: 'Edit' },
          { id: 'split', icon: '⊞', label: 'Split' },
          { id: 'preview', icon: '👁', label: 'Preview' },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={btnBase}
            style={btnStyle(view === id)}
            title={label}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />

      {/* Language selector */}
      <div className="relative flex-shrink-0">
        <select
          value={language}
          onChange={e => onLanguageChange(e.target.value)}
          disabled={readOnly}
          className="appearance-none pl-2 pr-6 py-1.5 rounded-md text-xs font-medium cursor-pointer outline-none"
          style={{
            background: 'var(--bg-3)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'inherit',
          }}
        >
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.icon} {l.label}</option>
          ))}
        </select>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }}>▾</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        {!readOnly && (
          <button
            onClick={onSave}
            className={btnBase}
            style={{ color: 'var(--text-2)', border: '1px solid transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Save (⌘S)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span className="hidden sm:inline">Save</span>
          </button>
        )}

        <button
          onClick={handleCopyContent}
          className={btnBase}
          style={{ color: 'var(--text-2)', border: '1px solid transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Copy content"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>

        <button
          onClick={handleDownload}
          className={btnBase}
          style={{ color: 'var(--text-2)', border: '1px solid transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Download file"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        <button
          onClick={onToggleTheme}
          className={btnBase}
          style={{ color: 'var(--text-2)', border: '1px solid transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}