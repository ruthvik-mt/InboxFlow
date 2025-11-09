import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '../services/api';

interface User {
  _id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Component mounted, checking auth...');
    checkAuth();
  }, []);

  // Add debug logs when user or loading changes
  useEffect(() => {
    console.log('[AuthContext] State changed - Loading:', loading, 'User:', user?.email || 'null');
  }, [user, loading]);

  const checkAuth = async () => {
    const token = Cookies.get('token');
    
    console.log('[Auth] ========================================');
    console.log('[Auth] Starting authentication check...');
    console.log('[Auth] Token exists in cookie:', !!token);
    console.log('[Auth] Token value (first 20 chars):', token?.substring(0, 20));
    console.log('[Auth] Current user state:', user);
    console.log('[Auth] Current loading state:', loading);
    
    if (!token) {
      console.log('[Auth] ❌ No token found, user not authenticated');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      console.log('[Auth] 🔄 Making request to /auth/me...');
      const response = await api.get('/auth/me');
      console.log('[Auth] ✅ Response received:', response.status);
      console.log('[Auth] ✅ User data:', response.data);
      
      setUser(response.data);
      console.log('[Auth] ✅ User state updated successfully');
    } catch (err: any) {
      console.error('[Auth] ❌ Authentication check failed');
      console.error('[Auth] Error status:', err.response?.status);
      console.error('[Auth] Error data:', err.response?.data);
      console.error('[Auth] Error message:', err.message);
      
      // Only remove token if it's actually invalid (not network errors)
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[Auth] Token is invalid or expired, removing...');
        Cookies.remove('token', { path: '/' });
        setUser(null);
      } else {
        console.log('[Auth] Network/server error, keeping token for retry');
        // Don't clear user on network errors
      }
    } finally {
      console.log('[Auth] Setting loading to false');
      setLoading(false);
      console.log('[Auth] ========================================');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[Auth] 🔐 Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      
      console.log('[Auth] Login response received:', response.data);
      
      // Store token in cookie
      Cookies.set('token', response.data.token, { 
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      
      console.log('[Auth] Cookie set, token:', response.data.token.substring(0, 20));
      console.log('[Auth] ✅ Login successful:', response.data.user);
      setUser(response.data.user);
    } catch (err: any) {
      console.error('[Auth] ❌ Login failed:', err.response?.data);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      console.log('[Auth] 📝 Attempting registration for:', email);
      const response = await api.post('/auth/register', { email, password, name });
      
      // Store token in cookie
      Cookies.set('token', response.data.token, { 
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      
      console.log('[Auth] ✅ Registration successful:', response.data.user);
      setUser(response.data.user);
    } catch (err: any) {
      console.error('[Auth] ❌ Registration failed:', err.response?.data);
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('[Auth] 👋 Logging out...');
      await api.post('/auth/logout');
    } catch (err) {
      console.error('[Auth] Logout request failed:', err);
    } finally {
      Cookies.remove('token', { path: '/' });
      setUser(null);
      console.log('[Auth] ✅ Logged out, user cleared');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};