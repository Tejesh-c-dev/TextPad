import React, { useState } from 'react';

function Avatar({ user, size = 24 }) {
  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : '??';
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ring-2"
      style={{
        width: size,
        height: size,
        background: user.color || '#6351e8',
        fontSize: size * 0.35,
        ringColor: 'var(--bg)',
        boxShadow: `0 0 0 2px var(--bg)`,
      }}
      title={user.username}
    >
      {initials}
    </div>
  );
}

export default function PresenceBar({ presence, typingUsers, user }) {
  const [showList, setShowList] = useState(false);
  const MAX_VISIBLE = 3;
  const typingSet = new Set(typingUsers.map(u => u.socketId));

  if (presence.length === 0) return null;

  return (
    <div className="relative flex items-center">
      {/* Stacked avatars */}
      <div className="flex items-center" style={{ gap: '-4px' }}>
        {presence.slice(0, MAX_VISIBLE).map((u, i) => (
          <div
            key={u.socketId}
            style={{ marginLeft: i > 0 ? '-6px' : 0, zIndex: MAX_VISIBLE - i }}
            className="relative"
          >
            <Avatar user={u} size={26} />
            {typingSet.has(u.socketId) && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-[var(--bg)]"
                style={{ animation: 'pulseDot 1s ease-in-out infinite' }} />
            )}
          </div>
        ))}
        {presence.length > MAX_VISIBLE && (
          <button
            onClick={() => setShowList(s => !s)}
            className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ml-[-6px] z-10"
            style={{
              background: 'var(--bg-3)',
              color: 'var(--text-2)',
              boxShadow: '0 0 0 2px var(--bg)',
              border: '1px solid var(--border)',
            }}
          >
            +{presence.length - MAX_VISIBLE}
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {showList && presence.length > MAX_VISIBLE && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowList(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 rounded-xl p-2 min-w-[180px] animate-slide-up"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div className="text-xs font-semibold px-2 py-1 mb-1" style={{ color: 'var(--text-3)' }}>
              {presence.length} online
            </div>
            {presence.map(u => (
              <div key={u.socketId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
                <Avatar user={u} size={22} />
                <span className="text-sm" style={{ color: 'var(--text)' }}>{u.username}</span>
                {typingSet.has(u.socketId) && (
                  <span className="text-xs ml-auto" style={{ color: 'var(--success)' }}>typing...</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}