import React, { useEffect, useRef, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { createEditorState } from '../lib/editor.js';

export default function Editor({ content, language, theme, readOnly, onChange, onCursor }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const isExternalUpdateRef = useRef(false);
  const prevContentRef = useRef(content);
  const prevLanguageRef = useRef(language);
  const prevThemeRef = useRef(theme);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const state = createEditorState({
      doc: content || '',
      language: language || 'markdown',
      theme: theme || 'dark',
      readOnly: readOnly || false,
      onChange: (newContent) => {
        if (!isExternalUpdateRef.current) {
          prevContentRef.current = newContent;
          onChange?.(newContent);
        }
      },
      onCursor,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    prevLanguageRef.current = language;
    prevThemeRef.current = theme;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only run once on mount

  // Handle language or theme change by recreating editor state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (language === prevLanguageRef.current && theme === prevThemeRef.current && readOnly === view.state.readOnly) return;

    const currentContent = view.state.doc.toString();
    const newState = createEditorState({
      doc: currentContent,
      language: language || 'markdown',
      theme: theme || 'dark',
      readOnly: readOnly || false,
      onChange: (newContent) => {
        if (!isExternalUpdateRef.current) {
          prevContentRef.current = newContent;
          onChange?.(newContent);
        }
      },
      onCursor,
    });

    view.setState(newState);
    prevLanguageRef.current = language;
    prevThemeRef.current = theme;
  }, [language, theme, readOnly]);

  // Handle external content updates (from socket)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === content) return;
    if (content === prevContentRef.current) return;

    // Apply external update without triggering onChange
    isExternalUpdateRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content || '',
      },
      // Try to preserve cursor position
    });
    prevContentRef.current = content;
    isExternalUpdateRef.current = false;
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto"
      style={{
        background: theme === 'light' ? '#ffffff' : '#282c34',
        fontFamily: '"Geist Mono", "Fira Code", monospace',
      }}
    />
  );
}