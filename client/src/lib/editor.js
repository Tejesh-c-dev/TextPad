import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { githubLight } from '@uiw/codemirror-theme-github';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { sql } from '@codemirror/lang-sql';
import { rust } from '@codemirror/lang-rust';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { go } from '@codemirror/lang-go';

const langMap = {
  markdown: () => markdown({ base: markdownLanguage }),
  javascript: () => javascript({ jsx: true }),
  typescript: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  json: () => json(),
  yaml: () => yaml(),
  sql: () => sql(),
  rust: () => rust(),
  java: () => java(),
  cpp: () => cpp(),
  go: () => go(),
  bash: () => [],
  plaintext: () => [],
};

export function createEditorState({ doc, language = 'markdown', theme = 'dark', onChange, onCursor, readOnly = false }) {
  const langExt = langMap[language] ? langMap[language]() : [];

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange?.(update.state.doc.toString());
    }
    if (update.selectionSet) {
      const sel = update.state.selection.main;
      onCursor?.({ from: sel.from, to: sel.to, head: sel.head });
    }
  });

  const editorTheme = EditorView.theme({
    '&': { height: '100%', background: 'transparent' },
    '.cm-content': { fontFamily: '"Geist Mono", "Fira Code", monospace' },
    '.cm-scroller': { fontFamily: '"Geist Mono", "Fira Code", monospace' },
  });

  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      indentWithTab,
    ]),
    langExt,
    theme === 'dark' ? oneDark : githubLight,
    editorTheme,
    updateListener,
    EditorState.readOnly.of(readOnly),
    EditorView.lineWrapping,
  ];

  return EditorState.create({ doc: doc || '', extensions });
}