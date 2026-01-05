import { apiService } from './api';
import type { 
  Item, 
  CreateItemRequest, 
  UpdateItemRequest, 
  ItemSearchRequest,
  PaginatedResult,
  ApiResponse 
} from '../types';

export const itemService = {
  // Get all items with pagination and filtering
  async getItems(params?: ItemSearchRequest): Promise<ApiResponse<PaginatedResult<Item>>> {
    return apiService.get<PaginatedResult<Item>>('/items', params);
  },

  // Get item by ID
  async getItem(id: string): Promise<ApiResponse<Item>> {
    return apiService.get<Item>(`/items/${id}`);
  },

  // Create new item
  async createItem(item: CreateItemRequest): Promise<ApiResponse<Item>> {
    return apiService.post<Item>('/items', item);
  },

  // Update item
  async updateItem(id: string, item: UpdateItemRequest): Promise<ApiResponse<Item>> {
    return apiService.put<Item>(`/items/${id}`, item);
  },

  // Delete item
  async deleteItem(id: string): Promise<ApiResponse> {
    return apiService.delete(`/items/${id}`);
  },

  // Get all active items
  async getActiveItems(): Promise<ApiResponse<Item[]>> {
    return apiService.get<Item[]>('/items/active');
  },

  // Get items by category
  async getItemsByCategory(category: string): Promise<ApiResponse<Item[]>> {
    return apiService.get<Item[]>(`/items/category/${category}`);
  },

  // Get all categories
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>('/items/categories');
  }
};
