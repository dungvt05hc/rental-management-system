import { apiService } from './api';
import type { 
  Customer, 
  CreateCustomerRequest, 
  UpdateCustomerRequest, 
  CustomerSearchRequest,
  AssignRoomRequest,
  PaginatedResult,
  ApiResponse 
} from '../types';

export const customerService = {
  // Get all customers with pagination and filtering
  async getCustomers(params?: CustomerSearchRequest): Promise<ApiResponse<PaginatedResult<Customer>>> {
    return apiService.get<PaginatedResult<Customer>>('/customers', params);
  },

  // Get customer by ID
  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return apiService.get<Customer>(`/customers/${id}`);
  },

  // Create new customer
  async createCustomer(customer: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    return apiService.post<Customer>('/customers', customer);
  },

  // Update customer
  async updateCustomer(id: string, customer: UpdateCustomerRequest): Promise<ApiResponse<Customer>> {
    return apiService.put<Customer>(`/customers/${id}`, customer);
  },

  // Delete customer
  async deleteCustomer(id: string): Promise<ApiResponse> {
    return apiService.delete(`/customers/${id}`);
  },

  // Assign customer to room
  async assignRoom(id: string, assignment: AssignRoomRequest): Promise<ApiResponse<Customer>> {
    return apiService.post<Customer>(`/customers/${id}/assign-room`, assignment);
  },

  // Remove customer from room
  async unassignRoom(id: string): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>(`/customers/${id}/unassign-room`, {});
  },

  // Get active customers
  async getActiveCustomers(): Promise<ApiResponse<Customer[]>> {
    return apiService.get<Customer[]>('/customers/active');
  },

  // Get customers without a room assignment
  async getUnassignedCustomers(): Promise<ApiResponse<Customer[]>> {
    return apiService.get<Customer[]>('/customers/unassigned');
  },

  // Get customers by room
  async getCustomersByRoom(roomId: string): Promise<ApiResponse<Customer[]>> {
    return apiService.get<Customer[]>(`/customers/room/${roomId}`);
  }
};
