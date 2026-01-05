import axios, { type AxiosInstance, type AxiosResponse, AxiosError } from 'axios';
import type { ApiResponse } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5152/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
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

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API methods
export const apiService = {
  // GET request
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // POST request
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // PUT request
  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  // DELETE request
  async delete<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url, { data });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// Error handler
function handleApiError(error: any): ApiResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response?.data) {
      // Return API error response
      return axiosError.response.data as ApiResponse;
    }
    
    if (axiosError.code === 'ECONNABORTED') {
      return {
        success: false,
        message: 'Request timeout. Please try again.',
        errors: ['Request timeout']
      };
    }
    
    if (!axiosError.response) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        errors: ['Network error']
      };
    }
  }
  
  return {
    success: false,
    message: 'An unexpected error occurred.',
    errors: ['Unknown error']
  };
}

export default apiClient;
