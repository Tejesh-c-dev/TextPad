import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, timeAgo, formatSize } from '../lib/api.js';

export default function VersionHistory({ slug, onClose, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [slug]);

  async function loadVersions() {
    setLoading(true);
    try {
      const data = await api.getVersions(slug);
      setVersions(data.versions || []);
    } catch (err) {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview(version) {
    setSelected(version.id || version._id);
    setLoadingPreview(true);
    try {
      const data = await api.getVersion(slug, version.id || version._id);
      setPreview(data);
    } catch {
      toast.error('Failed to load version');
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleRestore() {
    if (!preview) return;
    onRestore(preview.content, preview.title);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-xl animate-slide-in-right"
        style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Version History</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              {versions.length} saved {versions.length === 1 ? 'version' : 'versions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: '#6351e8' }} />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-3)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M12 7v5l4 2"/>
            </svg>
            <div className="text-center">
              <p className="font-medium" style={{ color: 'var(--text-2)' }}>No versions yet</p>
              <p className="text-sm mt-1">Versions are saved automatically as you edit</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Version list */}
            <div className="w-52 flex-shrink-0 overflow-y-auto"
              style={{ borderRight: '1px solid var(--border)' }}>
              {versions.map((v) => {
                const vid = v.id || v._id;
                const isSelected = selected === vid;
                return (
                  <button
                    key={vid}
                    onClick={() => loadPreview(v)}
                    className="w-full text-left px-3 py-3 transition-all"
                    style={{
                      background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                      borderLeft: `2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    }}
                  >
                    <div className="text-xs font-medium mb-0.5 truncate" style={{ color: 'var(--text)' }}>
                      {v.label || 'Autosave'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {timeAgo(v.savedAt)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      by {v.savedBy || 'unknown'}
                    </div>
                    {v.size !== undefined && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {formatSize(v.size)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview panel */}
            <div className="flex-1 flex flex-col min-w-0">
              {preview ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                        {preview.title || 'Untitled'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {timeAgo(preview.savedAt)} by {preview.savedBy}
                      </div>
                    </div>
                    <button
                      onClick={handleRestore}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                      style={{ background: '#6351e8' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#7c6af5'}
                      onMouseLeave={e => e.currentTarget.style.background = '#6351e8'}
                    >
                      Restore
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <pre className="p-4 text-xs leading-relaxed whitespace-pre-wrap break-words"
                      style={{ color: 'var(--text-2)', fontFamily: '"Geist Mono", monospace' }}>
                      {preview.content || '(empty)'}
                    </pre>
                  </div>
                </>
              ) : loadingPreview ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--border)', borderTopColor: '#6351e8' }} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
                  Select a version to preview
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}