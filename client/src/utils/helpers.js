/**
 * Generate a consistent color from a user ID string.
 */
const USER_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e879f9', '#22d3ee', '#a78bfa', '#fb923c',
];

export function generateUserColor(userId) {
  if (!userId) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/**
 * File extension to icon name mapping (lucide-react icon names).
 */
const EXTENSION_ICON_MAP = {
  js: 'FileCode2',
  jsx: 'FileCode2',
  ts: 'FileCode2',
  tsx: 'FileCode2',
  py: 'FileCode',
  java: 'FileCode',
  cpp: 'FileCode',
  c: 'FileCode',
  go: 'FileCode',
  rs: 'FileCode',
  html: 'Globe',
  css: 'Palette',
  scss: 'Palette',
  json: 'Braces',
  md: 'FileText',
  txt: 'FileText',
  yaml: 'FileText',
  yml: 'FileText',
  xml: 'FileCode',
  svg: 'Image',
  png: 'Image',
  jpg: 'Image',
  gif: 'Image',
  env: 'Lock',
  gitignore: 'GitBranch',
  dockerfile: 'Box',
  sh: 'Terminal',
  bash: 'Terminal',
};

export function getFileIcon(filename) {
  if (!filename) return 'File';
  const ext = filename.split('.').pop()?.toLowerCase();
  return EXTENSION_ICON_MAP[ext] || 'File';
}

/**
 * Get Monaco language ID from filename.
 */
const EXT_TO_LANGUAGE = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  md: 'markdown',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  ps1: 'powershell',
  dockerfile: 'dockerfile',
  lua: 'lua',
  r: 'r',
  swift: 'swift',
  kt: 'kotlin',
  dart: 'dart',
  toml: 'ini',
  ini: 'ini',
  txt: 'plaintext',
  svg: 'xml',
};

export function getLanguageFromFilename(filename) {
  if (!filename) return 'plaintext';
  const parts = filename.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
  const name = filename.toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';
  return EXT_TO_LANGUAGE[ext] || 'plaintext';
}

/**
 * Format a timestamp into a human-readable relative or absolute string.
 */
export function formatTimestamp(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format time for chat messages.
 */
export function formatTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Debounce a function.
 */
export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Conditional class name joiner.
 */
export function classNames(...args) {
  return args
    .flat()
    .filter((arg) => typeof arg === 'string' && arg.length > 0)
    .join(' ');
}

/**
 * Generate initials from a name/email.
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str, maxLen = 30) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}
