import { apiService } from './api';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User, 
  ApiResponse 
} from '../types';

export const authService = {
  // Login user
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/auth/login', credentials);
  },

  // Register new user (Admin only)
  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return apiService.post<User>('/auth/register', userData);
  },

  // Get current user profile
  async getProfile(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/auth/profile');
  },

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.put<User>('/auth/profile', userData);
  },

  // User administration (list, roles) lives in userManagementService.

  // Local logout (clear token)
  logout(): void {
    tokenStorage.clear();
    window.location.href = '/login';
  }
};

// Local storage helpers
export const tokenStorage = {
  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  },

  removeToken(): void {
    localStorage.removeItem('authToken');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem('user');
  },

  clear(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};
