import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Code2, Users, Clock, Trash2, X, Search, Activity, Zap, Shield, Swords, Users2 } from 'lucide-react';
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--space-8) var(--space-12)',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Dynamic Gamified Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="dashboard-header-gamified"
        >
          <div className="header-greeting">
            <h1>WELCOME BACK, <span className="text-blood">{user?.username?.toUpperCase() || 'WARRIOR'}</span></h1>
            <p>Your collaborative workspace and combat arena awaits.</p>
          </div>
        </motion.div>

        {/* Gamified Entry Points */}
        <div className="dashboard-entry-grid">
          <motion.div 
            className="entry-card blood-card"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => navigate('/arena')}
          >
            <div className="entry-icon"><Swords size={48} /></div>
            <div className="entry-content">
              <h2>THE ARENA</h2>
              <p>Ranked 1v1 coding battles. Destroy your opponents and claim your Elo.</p>
              <span className="entry-action">ENTER COMBAT ➔</span>
            </div>
          </motion.div>

          <motion.div 
            className="entry-card cyber-card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => navigate('/collab')}
          >
            <div className="entry-icon"><Users2 size={48} /></div>
            <div className="entry-content">
              <h2>QUICK MATCH</h2>
              <p>Casual pair programming. Collaborate with strangers to build or learn.</p>
              <span className="entry-action">FIND PARTNER ➔</span>
            </div>
          </motion.div>

          <motion.div 
            className="entry-card stealth-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => setShowNewModal(true)}
          >
            <div className="entry-icon"><Plus size={48} /></div>
            <div className="entry-content">
              <h2>NEW PROJECT</h2>
              <p>Start a new private workspace or invite your trusted allies.</p>
              <span className="entry-action">INITIALIZE ➔</span>
            </div>
          </motion.div>
        </div>

        {/* Projects Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="projects-section"
        >
          <div className="projects-header">
            <h2><FolderOpen size={24} /> ACTIVE PROTOCOLS ({projects.length})</h2>
            <div className="search-bar-gamified">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search archives..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="projects-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: '160px', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state-gamified">
              <Shield size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>NO ARCHIVES FOUND</h3>
              <p>{searchQuery ? 'Adjust your search parameters.' : 'Your workspace is empty.'}</p>
            </div>
          ) : (
            <div className="projects-grid">
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
            </div>
          )}
        </motion.div>
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
  const languageColor = SUPPORTED_LANGUAGES.find((l) => l.id === project.language)?.color || '#ff2a2a';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5, boxShadow: '0 0 20px rgba(255, 42, 42, 0.2)' }}
      className="project-card-gamified"
      onClick={onClick}
    >
      <div className="project-card-header">
        <div className="lang-icon" style={{ color: languageColor }}>
          <Code2 size={24} />
        </div>
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <h3 className="project-title">{project.name}</h3>
      
      {project.description && (
        <p className="project-desc">{project.description}</p>
      )}

      <div className="project-meta">
        {project.language && (
          <span className="meta-badge" style={{ borderColor: languageColor, color: languageColor }}>
            {project.language}
          </span>
        )}
        <span className="meta-info"><Clock size={12} /> {formatTimestamp(project.updatedAt || project.createdAt)}</span>
        {project.collaborators?.length > 0 && (
          <span className="meta-info"><Users size={12} /> {project.collaborators.length}</span>
        )}
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="delete-overlay" onClick={(e) => e.stopPropagation()}>
          <p>TERMINATE PROTOCOL?</p>
          <div className="delete-actions">
            <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>ABORT</button>
            <button className="btn-confirm" onClick={onDelete}>CONFIRM</button>
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
      navigate(`/editor/${project.id}`);
    }
  };

  return (
    <div className="modal-backdrop-gamified" onClick={onClose}>
      <div className="modal-gamified" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>INITIALIZE NEW PROTOCOL</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>PROTOCOL IDENTIFIER</label>
            <input
              type="text"
              placeholder="Enter project name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>MISSION BRIEFING (OPTIONAL)</label>
            <input
              type="text"
              placeholder="Describe the objective..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>PRIMARY WEAPONRY (LANGUAGE)</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {SUPPORTED_LANGUAGES.filter((l) => !['plaintext', 'markdown', 'json', 'yaml', 'xml'].includes(l.id)).map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>ABORT</button>
            <button type="submit" className="btn-submit" disabled={loading || !name.trim()}>
              {loading ? 'INITIALIZING...' : 'ENGAGE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
