/**
 * @module services/contextBuilder
 * @description Builds AI context from project files by extracting imports and related code.
 */

import File from '../models/File.js';

/**
 * Language-specific import/require regex patterns.
 * @type {Object<string, RegExp[]>}
 */
const IMPORT_PATTERNS = {
  javascript: [
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  typescript: [
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*\s*from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  python: [
    /^import\s+(\S+)/gm,
    /^from\s+(\S+)\s+import/gm,
  ],
  java: [
    /^import\s+(?:static\s+)?([^;]+);/gm,
  ],
  go: [
    /import\s+"([^"]+)"/g,
    /import\s+\(\s*([^)]+)\)/gs,
  ],
  rust: [
    /use\s+([^;]+);/g,
  ],
  ruby: [
    /require\s+['"]([^'"]+)['"]/g,
    /require_relative\s+['"]([^'"]+)['"]/g,
  ],
  php: [
    /use\s+([^;]+);/g,
    /require(?:_once)?\s+['"]([^'"]+)['"]/g,
    /include(?:_once)?\s+['"]([^'"]+)['"]/g,
  ],
};

/**
 * Extracts import paths from code based on the programming language.
 * @param {string} code - The source code to extract imports from.
 * @param {string} language - The programming language of the code.
 * @returns {string[]} Array of import path strings.
 */
export function extractImports(code, language) {
  const patterns = IMPORT_PATTERNS[language] || IMPORT_PATTERNS.javascript;
  const imports = [];

  for (const pattern of patterns) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const importPath = match[1]?.trim();
      if (importPath) {
        imports.push(importPath);
      }
    }
  }

  return [...new Set(imports)];
}

/**
 * Finds related project files based on extracted import paths.
 * Matches imports against file paths in the project.
 * @param {string} projectId - The project UUID.
 * @param {string[]} imports - Array of import path strings.
 * @returns {Promise<Array<Object>>} Array of matching file records with content.
 */
export async function getRelatedFiles(projectId, imports) {
  if (!imports.length) return [];

  const allFiles = await File.findByProject(projectId);
  const relatedFiles = [];

  for (const imp of imports) {
    // Normalize the import path (remove leading ./ or ../, extensions, etc.)
    const normalizedImport = imp
      .replace(/^\.\//, '')
      .replace(/^\.\.\//, '')
      .replace(/\.(js|ts|jsx|tsx|py|java|go|rs|rb|php)$/, '');

    for (const file of allFiles) {
      if (file.is_directory) continue;

      const normalizedPath = file.path
        .replace(/\.(js|ts|jsx|tsx|py|java|go|rs|rb|php)$/, '');

      if (
        normalizedPath.endsWith(normalizedImport) ||
        file.name.replace(/\.[^.]+$/, '') === normalizedImport.split('/').pop()
      ) {
        // Fetch full file content
        const fullFile = await File.findById(file.id);
        if (fullFile) {
          relatedFiles.push(fullFile);
        }
        break;
      }
    }
  }

  return relatedFiles;
}

/**
 * Builds a comprehensive AI context string from a project's files.
 * Includes the current file's content and related imported files.
 * @param {string} projectId - The project UUID.
 * @param {string|null} [currentFileId=null] - The currently active file UUID.
 * @returns {Promise<string>} Formatted context string for AI prompts.
 */
export async function buildContext(projectId, currentFileId = null) {
  const contextParts = [];

  // Get the current file
  let currentFile = null;
  if (currentFileId) {
    currentFile = await File.findById(currentFileId);
  }

  if (currentFile && currentFile.content) {
    contextParts.push(`**Current file (${currentFile.name}):**`);
    contextParts.push(`\`\`\`${currentFile.language || 'plaintext'}`);
    contextParts.push(currentFile.content);
    contextParts.push('```');

    // Extract and resolve imports
    const imports = extractImports(currentFile.content, currentFile.language || 'javascript');

    if (imports.length > 0) {
      const relatedFiles = await getRelatedFiles(projectId, imports);

      if (relatedFiles.length > 0) {
        contextParts.push('\n**Related files:**');

        for (const file of relatedFiles.slice(0, 5)) {
          // Limit to 5 related files to avoid overly long context
          const truncatedContent = file.content?.substring(0, 1500) || '';
          contextParts.push(`\n*${file.path}:*`);
          contextParts.push(`\`\`\`${file.language || 'plaintext'}`);
          contextParts.push(truncatedContent);
          if (file.content && file.content.length > 1500) {
            contextParts.push('// ... (truncated)');
          }
          contextParts.push('```');
        }
      }
    }
  }

  // Get project file structure overview
  const allFiles = await File.findByProject(projectId);
  if (allFiles.length > 0) {
    contextParts.push('\n**Project structure:**');
    const fileList = allFiles
      .map((f) => `${f.is_directory ? '📁' : '📄'} ${f.path}`)
      .slice(0, 30)
      .join('\n');
    contextParts.push(fileList);
    if (allFiles.length > 30) {
      contextParts.push(`... and ${allFiles.length - 30} more files`);
    }
  }

  return contextParts.join('\n');
}

export default { buildContext, extractImports, getRelatedFiles };
