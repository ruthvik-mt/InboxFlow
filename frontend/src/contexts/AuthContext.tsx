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
  register: (email: string, password: string, name: string, otp: string) => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Define checkAuth
    const checkAuth = async () => {
      const token = Cookies.get('token');
      
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        
        setUser(response.data);
      } catch (err: any) {
        console.error('[Auth] Authentication check failed');
        console.error('[Auth] Error status:', err.response?.status);
        console.error('[Auth] Error data:', err.response?.data);
        console.error('[Auth] Error message:', err.message);
        
        // Only remove token if it's actually invalid (not network errors)
        if (err.response?.status === 401 || err.response?.status === 403) {
          Cookies.remove('token', { path: '/' });
          setUser(null);
        } else {
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // We only want this to run once on mount

  // Debug logs when user or loading changes
  useEffect(() => {
  }, [user, loading]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      
      Cookies.set('token', response.data.token, { 
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      
      setUser(response.data.user);
    } catch (err: any) {
      console.error('[Auth] Login failed:', err.response?.data);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, otp: string) => {
    try {
      await api.post('/auth/register', { email, password, name, otp });
    } catch (err: any) {
      console.error('[Auth] Registration failed:', err.response?.data);
      throw err;
    }
  };

  const sendOTP = async (email: string) => {
    try {
      await api.post('/auth/send-otp', { email });
    } catch (err: any) {
      console.error('[Auth] Send OTP failed:', err.response?.data);
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      await api.delete('/auth/me');
      
      Cookies.remove('token', { path: '/' });
      setUser(null);
    } catch (err: any) {
      console.error('[Auth] Account deletion failed:', err.response?.data);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('[Auth] Logout request failed:', err);
    } finally {
      Cookies.remove('token', { path: '/' });
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, sendOTP, deleteAccount, logout, loading }}>
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
