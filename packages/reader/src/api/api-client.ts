import axios, { AxiosInstance } from 'axios';

// API Configuration - load from localStorage or environment variable
const getBackendEndpoint = (): string => {
  try {
    const savedEndpoint = localStorage.getItem('backendEndpoint');
    if (savedEndpoint) {
      return savedEndpoint;
    }
  } catch (error) {
    console.error('Failed to load backend endpoint from localStorage:', error);
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

const API_BASE_URL = getBackendEndpoint();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to update the baseURL dynamically
export const updateApiBaseUrl = (newBaseUrl: string): void => {
  apiClient.defaults.baseURL = newBaseUrl;
  console.log('API base URL updated to:', newBaseUrl);
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

