import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2, Share2, ChevronDown, LogOut, User, Settings, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { getInitials, generateUserColor } from '../../utils/helpers';

export default function Navbar({ projectName, onShareClick, onlineUsers = [] }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const isEditor = location.pathname.startsWith('/editor');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        height: 'var(--navbar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        background: 'var(--surface-glass-heavy)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        zIndex: 'var(--z-sticky)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Left: Logo */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
        onClick={() => navigate('/dashboard')}
      >
        <div style={{
          width: '28px',
          height: '28px',
          background: 'var(--gradient-primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 12px rgba(59,130,246,0.2)',
        }}>
          <Code2 size={15} color="white" />
        </div>
        <span style={{
          fontSize: 'var(--text-base)',
          fontWeight: '600',
          background: 'var(--text-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          CodeSync AI
        </span>
      </motion.div>

      {/* Center: Project name (when in editor) */}
      {isEditor && projectName && (
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <span style={{ opacity: 0.5 }}>⟨</span>
          {projectName}
          <span style={{ opacity: 0.5 }}>⟩</span>
        </div>
      )}

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Online users */}
        {isEditor && onlineUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginRight: 'var(--space-2)' }}>
            {onlineUsers.slice(0, 4).map((u, i) => (
              <div
                key={u.id || i}
                className="tooltip-wrapper"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: u.color || generateUserColor(u.name),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'white',
                  border: '2px solid var(--bg-primary)',
                  marginLeft: i > 0 ? '-8px' : '0',
                  zIndex: 10 - i,
                  position: 'relative',
                }}
              >
                {getInitials(u.name)}
                <span className="tooltip">{u.name}</span>
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                border: '2px solid var(--bg-primary)',
                marginLeft: '-8px',
              }}>
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Share button */}
        {isEditor && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-secondary btn-sm"
            onClick={onShareClick}
            style={{ gap: 'var(--space-2)' }}
          >
            <Share2 size={14} />
            Share
          </motion.button>
        )}

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-ghost"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-1) var(--space-2)',
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: generateUserColor(user?.username || user?.email || 'user'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: 'white',
            }}>
              {getInitials(user?.username || user?.email || 'U')}
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: '100px' }} className="truncate">
              {user?.username || user?.email || 'User'}
            </span>
            <ChevronDown size={14} style={{
              color: 'var(--text-muted)',
              transition: 'transform var(--transition-spring)',
              transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)',
            }} />
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="dropdown-menu" 
                style={{ minWidth: '180px' }}
              >
              <div style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border-primary)', marginBottom: 'var(--space-1)' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: '500', color: 'var(--text-primary)' }}>
                  {user?.username || 'User'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {user?.email || ''}
                </div>
              </div>
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate(`/profile/${user.id}`); }}>
                <User size={14} />
                Profile
              </button>
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); }}>
                <Settings size={14} />
                Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                <LogOut size={14} />
                Sign out
              </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}
