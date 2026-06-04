import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket(slug, user) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const handlers = useRef({});

  const on = useCallback((event, handler) => {
    handlers.current[event] = handler;
  }, []);

  useEffect(() => {
    if (!slug || !user) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('note:join', { slug, user });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('presence:list', (users) => {
      setPresence(users.filter(u => u.socketId !== socket.id));
    });

    socket.on('presence:join', (user) => {
      setPresence(prev => {
        const existing = prev.find(u => u.socketId === user.socketId);
        if (existing) return prev;
        return [...prev, user];
      });
    });

    socket.on('presence:leave', ({ socketId }) => {
      setPresence(prev => prev.filter(u => u.socketId !== socketId));
      setTypingUsers(prev => prev.filter(u => u.socketId !== socketId));
    });

    socket.on('note:update', (data) => {
      handlers.current['note:update']?.(data);
    });

    socket.on('cursor:update', (data) => {
      handlers.current['cursor:update']?.(data);
    });

    socket.on('note:settings', (data) => {
      handlers.current['note:settings']?.(data);
    });

    socket.on('version:saved', (data) => {
      handlers.current['version:saved']?.(data);
    });

    socket.on('version:update', (data) => {
      handlers.current['version:update']?.(data);
    });

    socket.on('user:typing', ({ socketId, username, color, isTyping }) => {
      if (socketId === socket.id) return;
      setTypingUsers(prev => {
        if (isTyping) {
          if (prev.find(u => u.socketId === socketId)) return prev;
          return [...prev, { socketId, username, color }];
        } else {
          return prev.filter(u => u.socketId !== socketId);
        }
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setPresence([]);
    };
  }, [slug, user?.username]);

  const emitChange = useCallback((content, title, cursor) => {
    socketRef.current?.emit('note:change', { slug, content, title, cursor });
  }, [slug]);

  const emitCursor = useCallback((position, selection) => {
    socketRef.current?.emit('cursor:move', { slug, position, selection });
  }, [slug]);

  const emitTyping = useCallback((isTyping) => {
    socketRef.current?.emit('user:typing', { slug, isTyping });
  }, [slug]);

  const emitSettings = useCallback((settings) => {
    socketRef.current?.emit('note:settings', { slug, settings });
  }, [slug]);

  const saveVersion = useCallback((label) => {
    socketRef.current?.emit('note:saveVersion', { slug, label });
  }, [slug]);

  return {
    connected,
    presence,
    typingUsers,
    on,
    emitChange,
    emitCursor,
    emitTyping,
    emitSettings,
    saveVersion,
  };
}