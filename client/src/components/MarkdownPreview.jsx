
import React, { useMemo } from 'react';
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Custom renderer for task lists
const renderer = new marked.Renderer();
renderer.listitem = (text) => {
  if (/^\[[ x]\]\s/.test(text.raw || text)) {
    const checked = /^\[x\]/.test(text.raw || text);
    const content = (text.raw || text).replace(/^\[[ x]\]\s/, '');
    return `<li style="list-style:none;margin-left:-1.5em"><input type="checkbox" ${checked ? 'checked' : ''} disabled /> ${content}</li>`;
  }
  return `<li>${typeof text === 'object' ? text.text : text}</li>`;
};

export default function MarkdownPreview({ content }) {
  const html = useMemo(() => {
    if (!content) return '<p style="opacity:0.4">Nothing to preview yet...</p>';
    try {
      return marked.parse(content, { renderer });
    } catch {
      return '<p>Error rendering markdown</p>';
    }
  }, [content]);

  return (
    <div
      className="markdown-preview h-full"
      style={{ minHeight: '100%' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}