import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('cn_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setLoading(false);
        return;
      } catch {}
    }
    initSession();
  }, []);

  async function initSession() {
    try {
      const res = await fetch('/api/auth/session', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('cn_user', JSON.stringify(data));
        setUser(data);
      }
    } catch {
      const fallback = { username: 'Anonymous', color: '#6366f1' };
      setUser(fallback);
    } finally {
      setLoading(false);
    }
  }

  function updateUsername(username) {
    if (!username.trim()) return;
    const updated = { ...user, username: username.trim() };
    setUser(updated);
    localStorage.setItem('cn_user', JSON.stringify(updated));
  }

  return (
    <UserContext.Provider value={{ user, loading, updateUsername }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
