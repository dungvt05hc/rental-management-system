import apiClient from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5152/api';

// System Management API
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  dataType: string;
  description?: string;
  isEditable: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  modifiedBy?: string;
}

export interface SystemSettingsByCategory {
  category: string;
  settings: SystemSetting[];
}

export interface SystemInfo {
  version: string;
  environment: string;
  serverTime: string;
  defaultLanguage: string;
  totalLanguages: number;
  totalUsers: number;
  totalRooms: number;
  totalTenants: number;
  activeTenants: number;
  databaseInfo: Record<string, string>;
}

export interface CreateSystemSettingDto {
  key: string;
  value: string;
  category: string;
  dataType: string;
  description?: string;
  isEditable?: boolean;
  isVisible?: boolean;
}

export interface UpdateSystemSettingDto {
  value: string;
  description?: string;
}

export interface BulkUpdateSettingsDto {
  settings: { key: string; value: string }[];
}

export const systemManagementApi = {
  // Get system information
  getSystemInfo: async (): Promise<SystemInfo> => {
    const response = await apiClient.get(`${API_URL}/SystemManagement/info`);
    return response.data;
  },

  // Get all settings
  getAllSettings: async (): Promise<SystemSetting[]> => {
    const response = await apiClient.get(`${API_URL}/SystemManagement/settings`);
    return response.data;
  },

  // Get settings grouped by category
  getSettingsByCategory: async (): Promise<SystemSettingsByCategory[]> => {
    const response = await apiClient.get(`${API_URL}/SystemManagement/settings/by-category`);
    return response.data;
  },

  // Get setting by key
  getSettingByKey: async (key: string): Promise<SystemSetting> => {
    const response = await apiClient.get(`${API_URL}/SystemManagement/settings/${key}`);
    return response.data;
  },

  // Get settings by category name
  getSettingsByCategoryName: async (category: string): Promise<SystemSetting[]> => {
    const response = await apiClient.get(`${API_URL}/SystemManagement/settings/category/${category}`);
    return response.data;
  },

  // Create setting
  createSetting: async (data: CreateSystemSettingDto): Promise<SystemSetting> => {
    const response = await apiClient.post(`${API_URL}/SystemManagement/settings`, data);
    return response.data;
  },

  // Update setting
  updateSetting: async (key: string, data: UpdateSystemSettingDto): Promise<SystemSetting> => {
    const response = await apiClient.put(`${API_URL}/SystemManagement/settings/${key}`, data);
    return response.data;
  },

  // Bulk update settings
  bulkUpdateSettings: async (data: BulkUpdateSettingsDto): Promise<{ message: string; count: number }> => {
    const response = await apiClient.put(`${API_URL}/SystemManagement/settings/bulk`, data);
    return response.data;
  },

  // Delete setting
  deleteSetting: async (key: string): Promise<void> => {
    await apiClient.delete(`${API_URL}/SystemManagement/settings/${key}`);
  },

  // Seed default settings
  seedDefaultSettings: async (): Promise<{ message: string }> => {
    const response = await apiClient.post(`${API_URL}/SystemManagement/settings/seed`);
    return response.data;
  },

  // Export settings
  exportSettings: async (): Promise<Blob> => {
    const response = await apiClient.get(`${API_URL}/SystemManagement/settings/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import settings
  importSettings: async (jsonData: string): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post(`${API_URL}/SystemManagement/settings/import`, jsonData, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },
};
