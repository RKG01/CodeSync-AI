/**
 * @module services/aiService
 * @description Hugging Face Inference API integration with specialized prompts and Redis caching.
 */

import crypto from 'crypto';
import env from '../config/env.js';
import redisClient, { isRedisReady } from '../config/redis.js';

/** Cache TTL in seconds (1 hour) */
const CACHE_TTL = 3600;

/**
 * Creates a cache key from the input parameters.
 * @param {string} prefix - Cache key prefix.
 * @param  {...string} parts - Parts to hash.
 * @returns {string} The cache key.
 */
function cacheKey(prefix, ...parts) {
  const hash = crypto.createHash('sha256').update(parts.join('|')).digest('hex').substring(0, 16);
  return `ai:${prefix}:${hash}`;
}

/**
 * Retrieves a cached result from Redis.
 * @param {string} key - The cache key.
 * @returns {Promise<string|null>} The cached value or null.
 */
async function getFromCache(key) {
  if (!isRedisReady()) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

/**
 * Stores a result in Redis cache.
 * @param {string} key - The cache key.
 * @param {string} value - The value to cache.
 * @param {number} [ttl=CACHE_TTL] - Time to live in seconds.
 * @returns {Promise<void>}
 */
async function setCache(key, value, ttl = CACHE_TTL) {
  if (!isRedisReady()) return;
  try {
    await redisClient.set(key, value, { EX: ttl });
  } catch {
    // Silently fail â€” caching is non-critical
  }
}

/**
 * AI service using Hugging Face Inference Providers (OpenAI-compatible endpoint).
 * Uses Qwen2.5-Coder-32B-Instruct by default for high-quality code assistance.
 */
class AIService {
  constructor() {
    this.endpoint = 'https://router.huggingface.co/v1/chat/completions';
    this.model = env.HF_MODEL;
    this.apiKey = env.HF_API_KEY;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Sends a chat completion request to the Hugging Face Inference API.
   * @param {Array<{role: string, content: string}>} messages - Chat messages.
   * @param {number} [maxTokens=2048] - Maximum tokens to generate.
   * @returns {Promise<string>} The generated text response.
   */
  async complete(messages, maxTokens = 2048) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`HF API error ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in HF API response');
      }

      return content.trim();
    } catch (error) {
      console.error('AI API error:', error.message);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async debugCode(code, error, language, context) {
    const key = cacheKey('debug', code, error, language);
    const cached = await getFromCache(key);
    if (cached) return cached;

    const systemPrompt = `You are an expert ${language} developer and debugger. Analyze the provided code for bugs, errors, and potential issues. Provide:
1. **Bug Analysis**: Identify the specific bug(s) or issue(s)
2. **Root Cause**: Explain why the bug occurs
3. **Fix**: Provide the corrected code
4. **Prevention**: Suggest how to prevent similar issues

Be concise but thorough. Format your response in Markdown.`;

    const userPrompt = `${context ? `**Project Context:**\n${context}\n\n` : ''}**Language:** ${language}

**Code to debug:**
\`\`\`${language}
${code}
\`\`\`

${error ? `**Error message:**\n\`\`\`\n${error}\n\`\`\`` : 'No specific error message provided. Please analyze for potential issues.'}`;

    const result = await this.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    await setCache(key, result);
    return result;
  }

  async explainCode(code, language) {
    const key = cacheKey('explain', code, language);
    const cached = await getFromCache(key);
    if (cached) return cached;

    const systemPrompt = `You are an expert programming instructor. Explain the provided ${language} code clearly and thoroughly. Include:
1. **Overview**: What the code does at a high level
2. **Line-by-line breakdown**: Explain key sections
3. **Concepts**: Note any important patterns, algorithms, or concepts used
4. **Complexity**: Mention time/space complexity if relevant

Use clear, beginner-friendly language but don't oversimplify. Format in Markdown.`;

    const userPrompt = `Explain this ${language} code:

\`\`\`${language}
${code}
\`\`\``;

    const result = await this.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    await setCache(key, result);
    return result;
  }

  async suggestCode(code, cursorPosition, language, context) {
    const codeBeforeCursor = code.substring(0, cursorPosition);
    const codeAfterCursor = code.substring(cursorPosition);

    const systemPrompt = `You are an expert ${language} code completion engine. Given the code before and after the cursor, suggest the most likely code to insert at the cursor position. Provide:
1. **Primary suggestion**: The most likely completion
2. **Alternatives**: 2-3 alternative completions if applicable

Return suggestions as code blocks. Be precise and match the existing code style.`;

    const userPrompt = `${context ? `**Project Context:**\n${context}\n\n` : ''}**Language:** ${language}

**Code before cursor:**
\`\`\`${language}
${codeBeforeCursor}
\`\`\`

**Code after cursor:**
\`\`\`${language}
${codeAfterCursor}
\`\`\`

Suggest code to insert at the cursor position.`;

    const result = await this.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return result;
  }

  async chat(messages, codeContext) {
    const systemMessage = {
      role: 'system',
      content: `You are Synapse AI, an expert programming assistant integrated into a collaborative code editor. You help developers with:
- Writing and improving code
- Debugging issues
- Explaining concepts
- Suggesting best practices
- Answering programming questions

${codeContext ? `**Current Code Context:**\n${codeContext}` : ''}

Be concise, helpful, and practical. Format code in fenced code blocks with language tags. Use Markdown for formatting.`,
    };

    const result = await this.complete([systemMessage, ...messages]);
    return result;
  }
}

export const aiService = new AIService();
export default aiService;
