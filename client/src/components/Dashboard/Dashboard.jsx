import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Code2, Users, Clock, Trash2, X, Search, Activity, Zap, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../Layout/Navbar';
import { ProjectContext } from '../../contexts/ProjectContext';
import { useAuth } from '../../hooks/useAuth';
import { formatTimestamp } from '../../utils/helpers';
import { SUPPORTED_LANGUAGES } from '../../utils/languageConfig';

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, loading, fetchProjects, createProject, deleteProject } = useContext(ProjectContext);
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--space-8) var(--space-12)',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ marginBottom: 'var(--space-8)' }}
        >
          <h1 style={{
            fontSize: 'var(--text-4xl)',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            marginBottom: 'var(--space-2)',
          }}>
            {greeting()},{' '}
            <span className="text-gradient">{user?.username || 'Developer'}</span>
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-lg)' }}>
            Your collaborative coding workspace
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-8)'
          }}
        >
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'var(--accent-blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <FolderOpen size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: '700' }}>{projects.length}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Total Projects</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'rgba(139, 92, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: '700' }}>{projects.filter(p => p.updatedAt && new Date(p.updatedAt) > new Date(Date.now() - 7*24*60*60*1000)).length}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Active this week</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
              <Zap size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: '700' }}>Ready</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>System Status</div>
            </div>
          </div>
        </motion.div>

        {/* Actions Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
          gap: 'var(--space-4)',
        }}>
          <div className="input-wrapper" style={{ maxWidth: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              className="input input-with-icon"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Project
          </button>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '160px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-8)',
            animation: 'fadeIn 0.5s ease-out',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto var(--space-4)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FolderOpen size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              {searchQuery ? 'Try a different search term' : 'Create your first project to get started'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
                <Plus size={16} />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
            style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  onClick={() => navigate(`/editor/${project.id}`)}
                  onDelete={() => deleteProject(project.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={createProject}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, index, onClick, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const languageColor = SUPPORTED_LANGUAGES.find((l) => l.id === project.language)?.color || '#888';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="card card-interactive"
      onClick={onClick}
      onPointerDown={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100px',
        background: `radial-gradient(circle at top right, ${languageColor}0d, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Code2 size={18} style={{ color: languageColor }} />
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          style={{ width: '28px', height: '28px', opacity: 0.4 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.4; }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <h3 style={{
        fontSize: 'var(--text-base)',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-1)',
      }}>
        {project.name}
      </h3>

      {project.description && (
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-4)',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.description}
        </p>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        marginTop: 'auto',
      }}>
        {project.language && (
          <span className="badge" style={{
            background: `${languageColor}15`,
            color: languageColor,
            border: `1px solid ${languageColor}30`,
          }}>
            {project.language}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <Clock size={11} />
          {formatTimestamp(project.updatedAt || project.createdAt)}
        </div>
        {project.collaborators?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <Users size={11} />
            {project.collaborators.length}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--surface-glass-heavy)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <p style={{ marginBottom: 'var(--space-4)', fontWeight: '500' }}>
            Delete this project?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const project = await onCreate(name.trim(), description.trim(), language);
    setLoading(false);
    if (project) {
      onClose();
      navigate(`/editor/${project.id || project._id}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <label className="input-label">Project Name</label>
            <input
              type="text"
              className="input"
              placeholder="my-awesome-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="input-label">Description (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="A brief description of your project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">Language</label>
            <select
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {SUPPORTED_LANGUAGES.filter((l) => !['plaintext', 'markdown', 'json', 'yaml', 'xml'].includes(l.id)).map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
