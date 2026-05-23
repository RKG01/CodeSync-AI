import React, { createContext, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [activeFile, setActiveFileState] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());

  const openFile = useCallback(async (file) => {
    // If we don't have content yet (from the tree listing), fetch it
    let fullFile = file;
    if (file.content === undefined || file.content === null) {
      try {
        const projectId = file.project_id || project?.id;
        if (projectId) {
          const data = await api.get(`/projects/${projectId}/files/${file.id || file._id}`);
          const fetched = data.data?.file || data.file || data;
          fullFile = { ...file, ...fetched };
        }
      } catch (err) {
        console.error('Failed to fetch file content:', err);
      }
    }

    setOpenFiles((prev) => {
      const exists = prev.find((f) => (f.id || f._id) === (fullFile.id || fullFile._id) || f.path === fullFile.path);
      if (exists) {
        // Update existing entry with fetched content
        return prev.map((f) =>
          ((f.id || f._id) === (fullFile.id || fullFile._id) || f.path === fullFile.path)
            ? { ...f, ...fullFile }
            : f
        );
      }
      return [...prev, fullFile];
    });
    setActiveFileState(fullFile);
  }, [project]);

  const closeFile = useCallback((fileId) => {
    setOpenFiles((prev) => {
      const filtered = prev.filter((f) => (f.id || f._id) !== fileId && f.path !== fileId);
      return filtered;
    });
    setActiveFileState((current) => {
      if (current && ((current.id || current._id) === fileId || current.path === fileId)) {
        // Switch to last open file or null
        setOpenFiles((prev) => {
          const remaining = prev.filter((f) => (f.id || f._id) !== fileId && f.path !== fileId);
          if (remaining.length > 0) {
            const next = remaining[remaining.length - 1];
            // We set it inside a timeout to avoid state collision
            setTimeout(() => setActiveFileState(next), 0);
          }
          return remaining;
        });
        return null;
      }
      return current;
    });
    setUnsavedFiles((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  const setActiveFile = useCallback((fileId) => {
    setOpenFiles((prev) => {
      const file = prev.find((f) => (f.id || f._id) === fileId || f.path === fileId);
      if (file) setActiveFileState(file);
      return prev;
    });
  }, []);

  const markUnsaved = useCallback((fileId) => {
    setUnsavedFiles((prev) => new Set(prev).add(fileId));
  }, []);

  const markSaved = useCallback((fileId) => {
    setUnsavedFiles((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  const createFile = useCallback(async (projectId, name, path, type = 'file', language) => {
    try {
      const data = await api.post(`/projects/${projectId}/files`, {
        name,
        path,
        type,
        language,
        content: '',
      });
      const newFile = data.data?.file || data.file || data;
      setFiles((prev) => [...prev, newFile]);
      if (type === 'file') {
        openFile(newFile);
      }
      toast.success(`${type === 'folder' ? 'Folder' : 'File'} created`);
      return newFile;
    } catch (err) {
      toast.error(err.message || 'Failed to create file');
      return null;
    }
  }, [openFile]);

  const deleteFile = useCallback(async (projectId, fileId) => {
    try {
      await api.delete(`/projects/${projectId}/files/${fileId}`);
      setFiles((prev) => prev.filter((f) => (f.id || f._id) !== fileId));
      closeFile(fileId);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  }, [closeFile]);

  const updateFileTree = useCallback((newFiles) => {
    setFiles(newFiles);
  }, []);

  const fetchFiles = useCallback(async (projectId) => {
    try {
      const data = await api.get(`/projects/${projectId}/files`);
      const fileList = data.data?.files || data.files || data || [];
      setFiles(fileList);
      return fileList;
    } catch (err) {
      console.error('Failed to fetch files:', err);
      return [];
    }
  }, []);

  const value = useMemo(
    () => ({
      activeFile,
      openFiles,
      project,
      files,
      unsavedFiles,
      setProject,
      openFile,
      closeFile,
      setActiveFile,
      createFile,
      deleteFile,
      updateFileTree,
      fetchFiles,
      markUnsaved,
      markSaved,
    }),
    [activeFile, openFiles, project, files, unsavedFiles, openFile, closeFile, setActiveFile, createFile, deleteFile, updateFileTree, fetchFiles, markUnsaved, markSaved]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
