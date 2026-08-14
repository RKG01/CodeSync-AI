import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { registerSynapseTheme } from '../../utils/themes';
import { getLanguageFromFilename } from '../../utils/helpers';
import { useTheme } from '../../contexts/ThemeContext';

export default function CodeEditor({
  file,
  doc,
  provider,
  awareness,
  onCursorChange,
  onSave,
  onDebug,
  onChange,
  language: languageOverride,
  synced,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const { theme } = useTheme();
  const initializedFileRef = useRef(null);

  const language = languageOverride || getLanguageFromFilename(file?.name || file?.path || '');

  // Store latest callbacks in refs so handleEditorMount doesn't go stale
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onDebugRef = useRef(onDebug);
  onDebugRef.current = onDebug;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    registerSynapseTheme(monaco);
    monaco.editor.setTheme(theme === 'light' ? 'synapse-light' : 'synapse-dark');

    // Load file content as fallback (the useEffect below will bind Yjs when ready)
    if (file && file.content !== undefined && file.content !== null) {
      editor.setValue(file.content);
    }

    // Cursor change tracking
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChangeRef.current) {
        onCursorChangeRef.current({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSaveRef.current) {
        onSaveRef.current(editor.getValue());
      }
    });

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
      () => {
        if (onDebugRef.current) {
          const selection = editor.getSelection();
          const selectedText = editor.getModel().getValueInRange(selection);
          onDebugRef.current(selectedText || editor.getValue());
        }
      }
    );

    // Track content changes
    editor.onDidChangeModelContent(() => {
      if (onChangeRef.current) {
        onChangeRef.current(editor.getValue());
      }
    });

    // Focus editor
    editor.focus();
  }, [theme, file]);

  /**
   * Sets up the Yjs MonacoBinding and seeds the Yjs document
   * with the file's saved content if the Yjs doc is empty.
   */
  function setupBinding(editor, yjsDoc, yjsProvider, yjsAwareness, currentFile) {
    const yText = yjsDoc.getText('monaco');

    // Clean up old binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    // If the Yjs document is empty AND we have saved content from the DB,
    // seed it into the Yjs document BEFORE creating the binding.
    const fileId = currentFile?.id || currentFile?._id || currentFile?.path;
    if (yText.length === 0 && currentFile?.content && initializedFileRef.current !== fileId) {
      yText.insert(0, currentFile.content);
      initializedFileRef.current = fileId;
    }

    console.log('[CodeEditor] Creating MonacoBinding for', fileId, 'yText length:', yText.length);

    bindingRef.current = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      yjsAwareness || null
    );
  }

  // Cleanup binding on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, []);

  // Bind Yjs when doc/provider become available and have finished syncing
  useEffect(() => {
    if (editorRef.current && doc && provider && synced) {
      // Only set up binding if it hasn't been set up for this specific doc
      if (!bindingRef.current || bindingRef.current.doc !== doc) {
        console.log('[CodeEditor] Yjs doc/provider synced, creating binding');
        setupBinding(editorRef.current, doc, provider, awareness, file);
        // Store doc reference on the binding to track which doc we are bound to
        if (bindingRef.current) {
          bindingRef.current.doc = doc;
        }
      }
    }
  }, [doc, provider, awareness, synced]); // Removed 'file' from dependencies to prevent re-binding on auto-saves

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'light' ? 'synapse-light' : 'synapse-dark');
    }
  }, [theme]);

  const editorOptions = useMemo(() => ({
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: true,
    minimap: {
      enabled: true,
      maxColumn: 80,
      renderCharacters: false,
      showSlider: 'mouseover',
    },
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: false,
    tabSize: 2,
    wordWrap: 'off',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    padding: { top: 12, bottom: 12 },
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection',
    guides: {
      indentation: true,
      bracketPairs: true,
    },
    suggest: {
      showMethods: true,
      showFunctions: true,
      showConstructors: true,
      showFields: true,
      showVariables: true,
      showClasses: true,
      showStructs: true,
      showInterfaces: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showConstants: true,
      showEnums: true,
      showEnumMembers: true,
      showKeywords: true,
      showWords: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showSnippets: true,
    },
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
      useShadows: false,
    },
  }), []);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        language={language}
        theme="synapse-dark"
        onMount={handleEditorMount}
        options={editorOptions}
        loading={
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0d0d14',
          }}>
            <div className="spinner" />
          </div>
        }
      />
    </div>
  );
}
