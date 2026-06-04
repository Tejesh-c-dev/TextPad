import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, timeAgo, copyToClipboard, sanitizeSlug } from '../lib/api.js';
import { useSocket } from '../hooks/useSocket.js';
import { useUser } from '../hooks/useUser.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import Editor from '../components/Editor.jsx';
import MarkdownPreview from '../components/MarkdownPreview.jsx';
import PresenceBar from '../components/PresenceBar.jsx';
import VersionHistory from '../components/VersionHistory.jsx';
import SettingsPanel from '../components/SettingsPanel.jsx';
import Toolbar from '../components/Toolbar.jsx';

const RECENT_KEY = 'cn_recent_notes';

function addToRecent(slug, title) {
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const filtered = recent.filter(r => r.slug !== slug);
    const updated = [{ slug, title, visitedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

export default function NotePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();

  // Note state
  const [note, setNote] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // UI state
  const [view, setView] = useState('edit'); // 'edit' | 'preview' | 'split'
  const [showVersions, setShowVersions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [versionCount, setVersionCount] = useState(0);
  const [language, setLanguage] = useState('markdown');
  const [readOnly, setReadOnly] = useState(false);

  // Remote content update ref (to avoid loops)
  const remoteUpdateRef = useRef(null);
  const saveTimerRef = useRef(null);
  const titleInputRef = useRef(null);

  // Socket
  const { connected, presence, typingUsers, on, emitChange, emitSettings, saveVersion } = useSocket(slug, user);

  // Load note
  useEffect(() => {
    if (!slug) return;
    loadNote();
  }, [slug]);

  async function loadNote() {
    setLoading(true);
    try {
      const data = await api.getNote(slug);
      setNote(data);
      setContent(data.content || '');
      setTitle(data.title || 'Untitled');
      setLanguage(data.language || 'markdown');
      setVersionCount(data.versionCount || 0);
      setReadOnly(data.readOnly || false);
      addToRecent(slug, data.title);
      document.title = `${data.title || slug} — CollabNotes`;
    } catch (err) {
      if (err.status === 404) {
        // Auto-create note from URL
        try {
          await api.createNote({ slug, title: 'Untitled', content: '' });
          setNote({ slug, title: 'Untitled', content: '', language: 'markdown' });
          setContent('');
          setTitle('Untitled');
          document.title = `${slug} — CollabNotes`;
          addToRecent(slug, 'Untitled');
        } catch (createErr) {
          if (createErr.status === 409) {
            // Race condition - try loading again
            loadNote();
            return;
          }
          setNotFound(true);
        }
      } else {
        toast.error('Failed to load note');
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Socket event handlers
  on('note:update', useCallback(({ content: remoteContent, title: remoteTitle, username }) => {
    remoteUpdateRef.current = { content: remoteContent, title: remoteTitle };
    if (remoteContent !== undefined) setContent(remoteContent);
    if (remoteTitle !== undefined) {
      setTitle(remoteTitle);
      document.title = `${remoteTitle} — CollabNotes`;
    }
  }, []));

  on('note:settings', useCallback(({ settings }) => {
    if (settings.language) setLanguage(settings.language);
    if (settings.readOnly !== undefined) setReadOnly(settings.readOnly);
  }, []));

  on('version:saved', useCallback(({ versionCount: vc }) => {
    if (vc !== undefined) setVersionCount(vc);
    toast.success('Version saved');
  }, []));

  on('version:update', useCallback(({ versionCount: vc }) => {
    if (vc !== undefined) setVersionCount(vc);
  }, []));

  // Autosave logic
  const scheduleAutosave = useCallback((newContent, newTitle) => {
    setIsDirty(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistNote(newContent, newTitle);
    }, 2000);
  }, [slug]);

  async function persistNote(c, t) {
    if (readOnly) return;
    setSaving(true);
    try {
      await api.updateNote(slug, {
        content: c,
        title: t,
        savedBy: user?.username,
      });
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) {
      if (err.status !== 404) {
        console.error('Save failed:', err);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleContentChange(newContent) {
    // Skip if this is a remote update coming in
    if (remoteUpdateRef.current?.content === newContent) {
      remoteUpdateRef.current = null;
      return;
    }
    setContent(newContent);
    scheduleAutosave(newContent, title);
    emitChange(newContent, title);
  }

  function handleTitleChange(newTitle) {
    setTitle(newTitle);
    document.title = `${newTitle} — CollabNotes`;
    scheduleAutosave(content, newTitle);
    emitChange(content, newTitle);
  }

  function handleLanguageChange(lang) {
    setLanguage(lang);
    emitSettings({ language: lang });
    api.updateNote(slug, { language: lang }).catch(() => {});
  }

  function handleCopyLink() {
    copyToClipboard(window.location.href);
    toast.success('Link copied!');
  }

  function handleManualSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    persistNote(content, title);
    saveVersion('Manual save');
  }

  async function handleRestoreVersion(versionContent, versionTitle) {
    setContent(versionContent);
    setTitle(versionTitle);
    scheduleAutosave(versionContent, versionTitle);
    emitChange(versionContent, versionTitle);
    setShowVersions(false);
    toast.success('Version restored');
  }

  function handleSettingsChange(settings) {
    if (settings.language) handleLanguageChange(settings.language);
    if (settings.readOnly !== undefined) {
      setReadOnly(settings.readOnly);
      emitSettings({ readOnly: settings.readOnly });
      api.updateNote(slug, { readOnly: settings.readOnly }).catch(() => {});
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
        toast.success('Saved!', { duration: 1500 });
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setView(v => v === 'preview' ? 'edit' : 'preview');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, title, slug]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: '#6351e8' }} />
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>Loading /{slug}...</span>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Note not found</h2>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-2)' }}>/{slug} doesn't exist</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#6351e8', color: 'white' }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const totalUsers = presence.length + 1; // +1 for self

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 z-20"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>

        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#6351e8"/>
            <path d="M7 9h14M7 14h10M7 19h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Divider */}
        <span style={{ color: 'var(--border-hover)' }}>/</span>

        {/* Title */}
        <input
          ref={titleInputRef}
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          disabled={readOnly}
          className="flex-1 min-w-0 bg-transparent outline-none font-semibold text-sm truncate"
          style={{ color: 'var(--text)', maxWidth: '240px' }}
          spellCheck={false}
        />

        {/* Slug badge */}
        <span className="text-xs px-2 py-0.5 rounded-md font-mono hidden sm:inline"
          style={{ background: 'var(--bg-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
          /{slug}
        </span>

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          {saving ? (
            <span style={{ color: 'var(--text-3)' }} className="hidden sm:flex items-center gap-1">
              <span className="w-3 h-3 border border-current rounded-full animate-spin border-t-transparent" />
              Saving...
            </span>
          ) : isDirty ? (
            <span style={{ color: 'var(--warning)' }} className="hidden sm:inline">Unsaved</span>
          ) : lastSaved ? (
            <span style={{ color: 'var(--success)' }} className="hidden sm:inline">✓ Saved</span>
          ) : null}
        </div>

        <div className="flex-1" />

        {/* Presence */}
        <PresenceBar presence={presence} typingUsers={typingUsers} user={user} />

        {/* Connection */}
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse-dot' : 'bg-red-400'}`} />
          <span className="hidden sm:inline" style={{ color: 'var(--text-3)' }}>
            {connected ? (totalUsers > 1 ? `${totalUsers} online` : 'Connected') : 'Offline'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            title="Copy shareable link"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={() => setShowVersions(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 relative"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            title="Version history"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M12 7v5l4 2"/>
            </svg>
            <span className="hidden sm:inline">History</span>
            {versionCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: '#6351e8', color: 'white' }}>
                {versionCount > 9 ? '9+' : versionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            title="Settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        view={view}
        onViewChange={setView}
        language={language}
        onLanguageChange={handleLanguageChange}
        onSave={handleManualSave}
        onToggleTheme={toggleTheme}
        theme={theme}
        readOnly={readOnly}
        content={content}
      />

      {/* Editor area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Edit view */}
        {(view === 'edit' || view === 'split') && (
          <div className={`flex flex-col ${view === 'split' ? 'w-1/2 border-r' : 'w-full'}`}
            style={{ borderColor: 'var(--border)' }}>
            <Editor
              content={content}
              language={language}
              theme={theme}
              readOnly={readOnly}
              onChange={handleContentChange}
            />
          </div>
        )}

        {/* Preview view */}
        {(view === 'preview' || view === 'split') && (
          <div className={`${view === 'split' ? 'w-1/2' : 'w-full'} overflow-auto`}>
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 text-xs flex items-center gap-2 flex-shrink-0 animate-fade-in"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
          <span className="flex gap-0.5">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-current animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          <span>
            {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
        <div className="flex items-center gap-4">
          <span>{content.length.toLocaleString()} chars</span>
          <span>{content.split('\n').length} lines</span>
          {content.trim() && <span>{content.trim().split(/\s+/).length} words</span>}
        </div>
        <div className="flex items-center gap-3">
          {readOnly && <span className="text-yellow-500">Read Only</span>}
          <span className="capitalize">{language}</span>
          {lastSaved && <span>Saved {timeAgo(lastSaved)}</span>}
        </div>
      </div>

      {/* Version History Panel */}
      {showVersions && (
        <VersionHistory
          slug={slug}
          onClose={() => setShowVersions(false)}
          onRestore={handleRestoreVersion}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          slug={slug}
          note={note}
          language={language}
          readOnly={readOnly}
          theme={theme}
          onClose={() => setShowSettings(false)}
          onChange={handleSettingsChange}
          onToggleTheme={toggleTheme}
          onDelete={async () => {
            if (!confirm('Delete this note permanently?')) return;
            await api.deleteNote(slug);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}