import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { registerCodeSyncTheme } from '../../utils/themes';
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
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const { theme } = useTheme();
  const initializedFileRef = useRef(null);

  const language = languageOverride || getLanguageFromFilename(file?.name || file?.path || '');

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom theme
    registerCodeSyncTheme(monaco);
    monaco.editor.setTheme(theme === 'light' ? 'codesync-light' : 'codesync-dark');

    // Set up Yjs binding if doc is available
    if (doc && provider) {
      setupBinding(editor, doc, provider, awareness, file);
    } else {
      // No Yjs doc, load file content directly
      if (file && file.content !== undefined && file.content !== null) {
        editor.setValue(file.content);
      }
    }

    // Cursor change tracking
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave(editor.getValue());
      }
    });

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
      () => {
        if (onDebug) {
          const selection = editor.getSelection();
          const selectedText = editor.getModel().getValueInRange(selection);
          onDebug(selectedText || editor.getValue());
        }
      }
    );

    // Track content changes
    editor.onDidChangeModelContent(() => {
      if (onChange) {
        onChange(editor.getValue());
      }
    });

    // Focus editor
    editor.focus();
  }, [doc, provider, awareness, onCursorChange, onSave, onDebug, theme, file]);

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
    // This is what prevents the "empty file" bug when switching tabs.
    const fileId = currentFile?.id || currentFile?._id || currentFile?.path;
    if (yText.length === 0 && currentFile?.content && initializedFileRef.current !== fileId) {
      yText.insert(0, currentFile.content);
      initializedFileRef.current = fileId;
    }

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

  // Re-bind when doc changes (e.g. user switches to a different file)
  useEffect(() => {
    if (editorRef.current && doc && provider) {
      setupBinding(editorRef.current, doc, provider, awareness, file);
    }
  }, [doc, provider, awareness]);

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'light' ? 'codesync-light' : 'codesync-dark');
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
        theme="codesync-dark"
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
