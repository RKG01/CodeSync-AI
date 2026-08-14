import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'synapse_token';
const USER_KEY = 'synapse_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me', { silent: true });
        setUser(res.data?.user || res.user || res);
        setToken(storedToken);
      } catch {
        // Token invalid â€” clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password }, { silent: true });
      const newToken = res.data?.accessToken || res.accessToken || res.token;
      const userData = res.data?.user || res.user || res;
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      toast.success('Welcome back!');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential }, { silent: true });
      const newToken = res.data?.accessToken || res.accessToken || res.token;
      const userData = res.data?.user || res.user || res;
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      toast.success('Signed in with Google!');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Google login failed' };
    }
  }, []);

  /**
   * Step 1: Send OTP to the user's email.
   * Validates username, email, and password on the server before sending.
   */
  const sendOtp = useCallback(async (username, email, password) => {
    try {
      const res = await api.post('/auth/send-otp', { username, email, password }, { silent: true });
      return { success: true, message: res.message || 'OTP sent', previewUrl: res.previewUrl };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to send OTP' };
    }
  }, []);

  /**
   * Step 2: Verify OTP and complete registration.
   */
  const register = useCallback(async (email, otp) => {
    try {
      const res = await api.post('/auth/register', { email, otp }, { silent: true });
      const newToken = res.data?.accessToken || res.accessToken || res.token;
      const userData = res.data?.user || res.user || res;
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      toast.success('Account created successfully!');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    toast.success('Logged out');
  }, []);

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      login,
      loginWithGoogle,
      sendOtp,
      register,
      logout,
    }),
    [user, token, loading, isAuthenticated, login, loginWithGoogle, sendOtp, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
