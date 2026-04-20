import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { storage } from '../utils/storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Restore session on app start ──────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await storage.getItem('auth_token');
        const storedUser = await storage.getItem('auth_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ─── Handle token expiry from API interceptor ─────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleForceLogout = async () => {
      setToken(null);
      setUser(null);
      setError(null);
      router.replace('/(auth)/login');
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  // ─── Persist auth data ────────────────────────────────────
  const persistAuth = async (tokenVal, userVal) => {
    await storage.setItem('auth_token', tokenVal);
    await storage.setItem('auth_user', JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  };

  // ─── Register ─────────────────────────────────────────────
  const register = useCallback(async ({ name, email, phone, password, shopName }) => {
    setError(null);
    try {
      const { data } = await authAPI.register({ name, email, phone, password, shopName });
      await persistAuth(data.token, data.user);
      return data;
    } catch (err) {
      let msg = 'Registration failed.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.data?.errors) {
        msg = err.response.data.errors.map(e => e.msg).join('\n');
      } else if (err.message?.includes('Network Error')) {
        msg = 'Cannot connect to server. Make sure the backend is running on port 5000.';
      } else if (err.message) {
        msg = err.message;
      }
      console.error('Register error:', err.response?.data || err.message);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ─── Login ────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const { data } = await authAPI.login({ email, password });
      await persistAuth(data.token, data.user);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    await storage.deleteItem('auth_token');
    await storage.deleteItem('auth_user');
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    error,
    register,
    login,
    logout,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
