'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((newToken: string, userData: User) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore — we clear locally regardless
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, [token]);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setToken(storedToken);
        setUser(data);
      } else {
        // Token is invalid/expired — clear it
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, isLoading, token, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
