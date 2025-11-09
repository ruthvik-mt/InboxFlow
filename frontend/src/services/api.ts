import axios from 'axios';
import Cookies from 'js-cookie';
import { EmailResponse, StatsResponse } from '../types';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

console.log('API Base URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // Increased to 120 seconds for Render cold starts
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API Request]', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor with better error handling
api.interceptors.response.use(
  response => {
    console.log('[API Response]', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Handle timeout specifically
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('[API] Request timed out - backend may be sleeping on Render');
      error.message = 'Server is starting up, please wait a moment and try again';
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('[API] Network error - check if backend is running');
      error.message = 'Cannot connect to server. Please check your connection.';
    }
    
    return Promise.reject(error);
  }
);

export const emailAPI = {
  // Fetch all emails with pagination
  fetchEmails: async (params?: {
    days?: number;
    size?: number;
    page?: number
  }): Promise<EmailResponse> => {
    const response = await api.get('/emails', { params });
    return response.data;
  },

  // Search emails
  searchEmails: async (params: {
    q?: string;
    account?: string;
    folder?: string;
    label?: string;
  }): Promise<EmailResponse> => {
    const response = await api.get('/emails/search', { params });
    return response.data;
  },

  // Get single email by ID
  getEmailById: async (id: string): Promise<EmailResponse> => {
    const response = await api.get(`/emails/${id}`);
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<StatsResponse> => {
    const response = await api.get('/stats');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;