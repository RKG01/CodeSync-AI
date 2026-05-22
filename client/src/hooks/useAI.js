import { useState, useCallback } from 'react';
import aiService from '../services/aiService';

/**
 * Hook for AI interactions with loading/error states and conversation persistence.
 */
export function useAI(projectId) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const resetState = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  const resetConversation = useCallback(() => {
    setConversationId(null);
    setResponse(null);
    setError(null);
  }, []);

  const setActiveConversation = useCallback((id) => {
    setConversationId(id);
  }, []);

  const debug = useCallback(async (code, errorMsg, language, fileId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.debugCode(projectId, code, errorMsg, language, fileId);
      setResponse(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const explain = useCallback(async (code, language) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.explainCode(projectId, code, language);
      setResponse(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const suggest = useCallback(async (code, cursorPosition, language) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.suggestCode(projectId, code, cursorPosition, language);
      setResponse(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const chat = useCallback(async (message, fileId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.chat(projectId, message, fileId, conversationId);
      if (result?.data?.conversationId) {
        setConversationId(result.data.conversationId);
      }
      setResponse(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, conversationId]);

  const loadConversations = useCallback(async () => {
    try {
      const result = await aiService.getConversations(projectId);
      return result?.data?.conversations || [];
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
      return [];
    }
  }, [projectId]);

  const loadHistory = useCallback(async (convId) => {
    try {
      const result = await aiService.getConversationHistory(convId);
      return result?.data?.messages || [];
    } catch (err) {
      console.error('Failed to load history:', err.message);
      return [];
    }
  }, []);

  return {
    loading,
    response,
    error,
    conversationId,
    debug,
    explain,
    suggest,
    chat,
    resetState,
    resetConversation,
    setActiveConversation,
    loadConversations,
    loadHistory,
  };
}

export default useAI;
