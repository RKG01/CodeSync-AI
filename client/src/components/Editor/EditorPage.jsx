import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Save, Wand2, Bug, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../Layout/Navbar';
import Sidebar from '../Layout/Sidebar';
import StatusBar from '../Layout/StatusBar';
import EditorTabs from './EditorTabs';
import CodeEditor from './CodeEditor';
import CollaborativeCursors from './CollaborativeCursors';
import FileTree from '../FileExplorer/FileTree';
import CreateFileModal from '../FileExplorer/CreateFileModal';
import AIPanel from '../AI/AIPanel';
import ChatPanel from '../Collaboration/ChatPanel';
import ShareModal from '../Collaboration/ShareModal';
import { EditorContext } from '../../contexts/EditorContext';
import { ProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../hooks/useAuth';
import useYjs from '../../hooks/useYjs';
import usePresence from '../../hooks/usePresence';
import useWebSocket from '../../hooks/useWebSocket';
import { getLanguageFromFilename } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EditorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { selectProject, currentProject } = useContext(ProjectContext);
  const {
    activeFile, openFiles, files, unsavedFiles,
    openFile, closeFile, setActiveFile,
    createFile, deleteFile, fetchFiles, setProject,
    markUnsaved, markSaved,
  } = useContext(EditorContext);

  const [activePanel, setActivePanel] = useState('files');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [editorContent, setEditorContent] = useState('');
  const [projectLoading, setProjectLoading] = useState(true);
  const editorContentRef = useRef('');
  const lastSavedContentRef = useRef('');

  // Code execution state
  const [runOutput, setRunOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // Yjs collaboration
  const { doc, provider, awareness, connected: yjsConnected, synced: yjsSynced } = useYjs(
    projectId,
    activeFile?.path || activeFile?.name,
    user
  );

  // Presence tracking
  const { users: onlineUsers } = usePresence(awareness);

  // General WebSocket
  const { connected: wsConnected, sendMessage, subscribe } = useWebSocket(token);

  const language = getLanguageFromFilename(activeFile?.name || activeFile?.path || '');

  // Load project and files
  useEffect(() => {
    async function loadProject() {
      setProjectLoading(true);
      try {
        const data = await api.get(`/projects/${projectId}`);
        const proj = data.data?.project || data.project || data;
        setProject(proj);
        selectProject(proj);
        await fetchFiles(projectId);
      } catch (err) {
        toast.error('Failed to load project');
        navigate('/dashboard');
      } finally {
        setProjectLoading(false);
      }
    }
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const handlePanelToggle = useCallback((panelId) => {
    setActivePanel((prev) => (prev === panelId ? null : panelId));
  }, []);

  const handleCursorChange = useCallback((pos) => {
    setCursorPosition(pos);
  }, []);

  const handleSave = useCallback(async (content, isAutoSave = false) => {
    if (!activeFile || !projectId) return;
    try {
      await api.put(`/projects/${projectId}/files/${activeFile.id || activeFile._id}`, {
        content,
      });
      markSaved(activeFile.id || activeFile._id || activeFile.path);
      lastSavedContentRef.current = content;
      if (!isAutoSave) {
        toast.success('Saved', { duration: 1500, style: { fontSize: '13px' } });
      }
    } catch (err) {
      if (!isAutoSave) toast.error('Failed to save');
    }
  }, [activeFile, projectId, markSaved]);

  // Auto-save effect
  useEffect(() => {
    if (!activeFile || !projectId) return;
    
    // Initialize lastSavedContentRef when file changes
    lastSavedContentRef.current = editorContentRef.current;

    const intervalId = setInterval(() => {
      const currentContent = editorContentRef.current;
      if (currentContent && currentContent !== lastSavedContentRef.current) {
        handleSave(currentContent, true);
      }
    }, 5000); // 5 seconds

    return () => clearInterval(intervalId);
  }, [activeFile, projectId, handleSave]);

  const handleRun = useCallback(async () => {
    if (!activeFile || isRunning) return;

    // Get code from editor ref
    const code = editorContentRef.current;
    if (!code || !code.trim()) {
      toast.error('No code to run');
      return;
    }

    setIsRunning(true);
    setShowTerminal(true);
    setRunOutput({ stdout: '', stderr: '', status: 'running' });

    try {
      const data = await api.post('/code/run', {
        code,
        language: language || 'javascript',
      });
      const result = data.data || data;
      setRunOutput({
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        duration: result.duration,
        status: result.exitCode === 0 ? 'success' : 'error',
      });
    } catch (err) {
      setRunOutput({
        stdout: '',
        stderr: err.message || 'Execution failed',
        exitCode: 1,
        duration: 0,
        status: 'error',
      });
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, language, isRunning]);

  const handleDebug = useCallback(async (code) => {
    setActivePanel('ai');
  }, []);

  const handleCreateFile = useCallback((type) => {
    setCreateType(type);
    setShowCreateModal(true);
  }, []);

  const handleCreateSubmit = useCallback(async (name, path, type, lang) => {
    await createFile(projectId, name, path, type, lang);
    setShowCreateModal(false);
  }, [projectId, createFile]);

  if (projectLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading project...</span>
      </div>
    );
  }

  const showFilesPanel = activePanel === 'files';
  const showAIPanel = activePanel === 'ai';
  const showChatPanel = activePanel === 'chat';
  const showRightPanel = showAIPanel || showChatPanel;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <CollaborativeCursors />

      {/* Navbar */}
      <Navbar
        projectName={currentProject?.name || 'Untitled'}
        onShareClick={() => setShowShareModal(true)}
        onlineUsers={onlineUsers}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar activePanel={activePanel} onPanelToggle={handlePanelToggle} />

        {/* File explorer panel */}
        <AnimatePresence>
          {showFilesPanel && (
            <motion.div 
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 'var(--panel-width)', opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              <div style={{ width: 'var(--panel-width)', height: '100%' }}>
                <FileTree
                  files={files}
                  projectId={projectId}
                  onCreateFile={handleCreateFile}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Editor Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-3)',
            height: '36px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-primary)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <button
                className="btn btn-ghost btn-sm"
                title="Run (Ctrl+Enter)"
                onClick={handleRun}
                disabled={isRunning || !activeFile}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                {isRunning ? (
                  <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent-yellow)' }} />
                ) : (
                  <Play size={13} style={{ color: 'var(--accent-green)' }} />
                )}
                {isRunning ? 'Running...' : 'Run'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                title="Save (Ctrl+S)"
                onClick={() => handleSave(editorContentRef.current)}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                <Save size={13} />
                Save
              </button>
              <button className="btn btn-ghost btn-sm" title="Format" style={{ fontSize: 'var(--text-xs)' }}>
                <Wand2 size={13} />
                Format
              </button>
              {showTerminal && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowTerminal(false)}
                  style={{ fontSize: 'var(--text-xs)', marginLeft: 'var(--space-2)' }}
                  title="Hide Terminal"
                >
                  <X size={13} />
                  Terminal
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <button
                className="btn btn-ghost btn-sm"
                title="AI Debug (Ctrl+Shift+D)"
                onClick={() => handleDebug(editorContentRef.current)}
                style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-purple)' }}
              >
                <Bug size={13} />
                AI Debug
              </button>
            </div>
          </div>

          {/* Editor Tabs */}
          <EditorTabs
            openFiles={openFiles}
            activeFile={activeFile}
            onSelectTab={setActiveFile}
            onCloseTab={closeFile}
            unsavedFiles={unsavedFiles}
          />

          {/* Code Editor + Terminal */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Editor */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {activeFile ? (
                <CodeEditor
                  key={activeFile.id || activeFile._id || activeFile.path}
                  file={activeFile}
                  doc={doc}
                  provider={provider}
                  awareness={awareness}
                  synced={yjsSynced}
                  onCursorChange={handleCursorChange}
                  onSave={handleSave}
                  onDebug={handleDebug}
                  onChange={(val) => { editorContentRef.current = val; setEditorContent(val); }}
                  language={language}
                />
              ) : (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 'var(--space-4)',
                  background: '#0d0d14',
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: 'var(--gradient-primary)',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.3,
                  }}>
                    <Play size={24} color="white" />
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                    Select a file to start editing
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-tertiary)', borderRadius: '3px', fontSize: '10px' }}>Ctrl+S</kbd> Save</span>
                    <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-tertiary)', borderRadius: '3px', fontSize: '10px' }}>Ctrl+Shift+D</kbd> AI Debug</span>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Output Panel */}
            <AnimatePresence>
              {showTerminal && runOutput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '200px', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    flexShrink: 0,
                    borderTop: '2px solid var(--border-primary)',
                    background: '#0a0a0f',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  {/* Terminal header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 12px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-primary)',
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Terminal
                      </span>
                      {runOutput.status === 'running' && (
                        <span style={{ fontSize: '10px', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Loader2 size={10} style={{ animation: 'spin 0.7s linear infinite' }} /> Running...
                        </span>
                      )}
                      {runOutput.status === 'success' && (
                        <span style={{ fontSize: '10px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✓ Exited with code 0 ({runOutput.duration}ms)
                        </span>
                      )}
                      {runOutput.status === 'error' && (
                        <span style={{ fontSize: '10px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ✗ Exited with code {runOutput.exitCode} ({runOutput.duration}ms)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowTerminal(false)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                        padding: '2px', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Terminal content */}
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px 12px',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: '12px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {runOutput.stdout && (
                      <div style={{ color: '#e2e8f0' }}>{runOutput.stdout}</div>
                    )}
                    {runOutput.stderr && (
                      <div style={{ color: '#f87171' }}>{runOutput.stderr}</div>
                    )}
                    {runOutput.status !== 'running' && !runOutput.stdout && !runOutput.stderr && (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No output</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right panel (AI or Chat) */}
        {showRightPanel && (
          <div style={{
            width: 'var(--ai-panel-width)',
            flexShrink: 0,
            animation: 'slideInRight 0.2s ease-out',
          }}>
            {showAIPanel && (
              <AIPanel
                projectId={projectId}
                activeFile={activeFile}
                editorContent={editorContent}
                language={language}
                onClose={() => setActivePanel(null)}
              />
            )}
            {showChatPanel && (
              <ChatPanel
                projectId={projectId}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        language={language}
        line={cursorPosition.line}
        column={cursorPosition.column}
        connected={yjsConnected}
        onlineCount={onlineUsers.length + 1}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateFileModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSubmit}
        />
      )}
      {showShareModal && (
        <ShareModal
          projectId={projectId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
