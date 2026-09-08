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

// Query string params sent with a GET request
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

// Generic API methods
export const apiService = {
  // GET request
  async get<T = unknown>(url: string, params?: QueryParams): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      return handleApiError<T>(error);
    }
  },

  // POST request
  async post<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError<T>(error);
    }
  },

  // PUT request
  async put<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError<T>(error);
    }
  },

  // PATCH request
  async patch<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.patch<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return handleApiError<T>(error);
    }
  },

  // DELETE request
  async delete<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete<ApiResponse<T>>(url, { data });
      return response.data;
    } catch (error) {
      return handleApiError<T>(error);
    }
  },

  // GET một endpoint trả file thô (ví dụ File(bytes, "text/csv") ở controller).
  // Không dùng get() được: những endpoint đó không bọc kết quả trong
  // ApiResponse, và responseType phải nằm trong axios config chứ không phải
  // trong params — nếu nhét vào params thì nó chỉ thành một query string vô
  // nghĩa còn body vẫn bị parse thành JSON.
  // Lỗi được ném ra nguyên trạng để caller tự xử lý, vì Promise<Blob> không
  // có chỗ nào để trả về ApiResponse lỗi.
  async getFile(url: string, params?: QueryParams): Promise<Blob> {
    const response = await apiClient.get<Blob>(url, { params, responseType: 'blob' });
    return response.data;
  },
};

// Error handler — mọi nhánh đều trả về lỗi nên không nhánh nào đặt `data`,
// vì vậy an toàn khi khớp với ApiResponse<T> của lời gọi.
function handleApiError<T>(error: unknown): ApiResponse<T> {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response?.data) {
      // Return API error response
      return axiosError.response.data as ApiResponse<T>;
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
