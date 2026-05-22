import React, { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../utils/languageConfig';

export default function LanguageSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return SUPPORTED_LANGUAGES;
    const q = search.toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)
    );
  }, [search]);

  const current = SUPPORTED_LANGUAGES.find((l) => l.id === value) || SUPPORTED_LANGUAGES[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--text-xs)',
          padding: '2px 8px',
        }}
      >
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: current.color,
        }} />
        {current.name}
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dropdown)' }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: 0,
            width: '220px',
            maxHeight: '280px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 'calc(var(--z-dropdown) + 1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out',
          }}>
            <div style={{ padding: 'var(--space-2)', borderBottom: '1px solid var(--border-primary)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  placeholder="Search language..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  style={{ fontSize: 'var(--text-xs)', paddingLeft: '28px', height: '28px', padding: '4px 8px 4px 28px' }}
                />
              </div>
            </div>
            <div style={{ overflow: 'auto', padding: 'var(--space-1)' }}>
              {filtered.map((lang) => (
                <button
                  key={lang.id}
                  className="dropdown-item"
                  onClick={() => {
                    onChange(lang.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  style={{
                    background: lang.id === value ? 'var(--bg-hover)' : 'transparent',
                    color: lang.id === value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: lang.color,
                    flexShrink: 0,
                  }} />
                  {lang.name}
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  No languages found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
