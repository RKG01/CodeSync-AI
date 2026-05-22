/**
 * Language configuration for the editor.
 */

export const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', ext: ['js', 'jsx', 'mjs', 'cjs'], color: '#f7df1e' },
  { id: 'typescript', name: 'TypeScript', ext: ['ts', 'tsx'], color: '#3178c6' },
  { id: 'python', name: 'Python', ext: ['py'], color: '#3776ab' },
  { id: 'java', name: 'Java', ext: ['java'], color: '#ed8b00' },
  { id: 'cpp', name: 'C++', ext: ['cpp', 'cc', 'c++', 'hpp'], color: '#00599c' },
  { id: 'c', name: 'C', ext: ['c', 'h'], color: '#555555' },
  { id: 'go', name: 'Go', ext: ['go'], color: '#00add8' },
  { id: 'rust', name: 'Rust', ext: ['rs'], color: '#dea584' },
  { id: 'ruby', name: 'Ruby', ext: ['rb'], color: '#cc342d' },
  { id: 'php', name: 'PHP', ext: ['php'], color: '#777bb3' },
  { id: 'swift', name: 'Swift', ext: ['swift'], color: '#fa7343' },
  { id: 'kotlin', name: 'Kotlin', ext: ['kt'], color: '#7f52ff' },
  { id: 'dart', name: 'Dart', ext: ['dart'], color: '#0175c2' },
  { id: 'html', name: 'HTML', ext: ['html', 'htm'], color: '#e34f26' },
  { id: 'css', name: 'CSS', ext: ['css'], color: '#1572b6' },
  { id: 'scss', name: 'SCSS', ext: ['scss', 'sass'], color: '#cc6699' },
  { id: 'json', name: 'JSON', ext: ['json'], color: '#292929' },
  { id: 'markdown', name: 'Markdown', ext: ['md'], color: '#083fa1' },
  { id: 'yaml', name: 'YAML', ext: ['yaml', 'yml'], color: '#cb171e' },
  { id: 'xml', name: 'XML', ext: ['xml', 'svg'], color: '#0060ac' },
  { id: 'sql', name: 'SQL', ext: ['sql'], color: '#e38c00' },
  { id: 'shell', name: 'Shell', ext: ['sh', 'bash'], color: '#89e051' },
  { id: 'powershell', name: 'PowerShell', ext: ['ps1'], color: '#012456' },
  { id: 'dockerfile', name: 'Dockerfile', ext: ['dockerfile'], color: '#2496ed' },
  { id: 'lua', name: 'Lua', ext: ['lua'], color: '#000080' },
  { id: 'r', name: 'R', ext: ['r'], color: '#276dc3' },
  { id: 'plaintext', name: 'Plain Text', ext: ['txt'], color: '#888888' },
];

/**
 * Get language config by ID.
 */
export function getLanguageById(langId) {
  return SUPPORTED_LANGUAGES.find((l) => l.id === langId) || SUPPORTED_LANGUAGES[SUPPORTED_LANGUAGES.length - 1];
}

/**
 * Get language config from file extension.
 */
export function getLanguageByExtension(ext) {
  const lower = (ext || '').toLowerCase().replace(/^\./, '');
  return SUPPORTED_LANGUAGES.find((l) => l.ext.includes(lower)) || SUPPORTED_LANGUAGES[SUPPORTED_LANGUAGES.length - 1];
}

/**
 * File extension to icon color mapping.
 */
export function getFileIconColor(filename) {
  if (!filename) return '#888';
  const ext = filename.split('.').pop()?.toLowerCase();
  const lang = SUPPORTED_LANGUAGES.find((l) => l.ext.includes(ext));
  return lang?.color || '#888888';
}
