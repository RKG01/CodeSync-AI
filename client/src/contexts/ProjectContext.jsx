import React, { createContext, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/projects');
      const list = data.data?.projects || data.projects || data || [];
      setProjects(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name, description, language) => {
    try {
      const data = await api.post('/projects', { name, description, language });
      const project = data.data?.project || data.project || data;
      setProjects((prev) => [project, ...prev]);
      toast.success('Project created!');
      return project;
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
      return null;
    }
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => (p.id || p._id) !== projectId));
      if ((currentProject?.id || currentProject?._id) === projectId) {
        setCurrentProject(null);
      }
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete project');
    }
  }, [currentProject]);

  const selectProject = useCallback((project) => {
    setCurrentProject(project);
  }, []);

  const value = useMemo(
    () => ({
      projects,
      currentProject,
      loading,
      fetchProjects,
      createProject,
      deleteProject,
      selectProject,
    }),
    [projects, currentProject, loading, fetchProjects, createProject, deleteProject, selectProject]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
