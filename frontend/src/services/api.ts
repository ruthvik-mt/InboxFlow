import axios from 'axios';
import Cookies from 'js-cookie';
import { EmailResponse, StatsResponse } from '../types';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

console.log('API Base URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add error interceptor
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
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