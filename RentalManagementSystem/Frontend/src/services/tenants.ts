import { apiService } from './api';
import type { 
  Tenant, 
  CreateTenantRequest, 
  UpdateTenantRequest, 
  TenantSearchRequest,
  AssignRoomRequest,
  PaginatedResult,
  ApiResponse 
} from '../types';

export const tenantService = {
  // Get all tenants with pagination and filtering
  async getTenants(params?: TenantSearchRequest): Promise<ApiResponse<PaginatedResult<Tenant>>> {
    return apiService.get<PaginatedResult<Tenant>>('/tenants', params);
  },

  // Get tenant by ID
  async getTenant(id: string): Promise<ApiResponse<Tenant>> {
    return apiService.get<Tenant>(`/tenants/${id}`);
  },

  // Create new tenant
  async createTenant(tenant: CreateTenantRequest): Promise<ApiResponse<Tenant>> {
    return apiService.post<Tenant>('/tenants', tenant);
  },

  // Update tenant
  async updateTenant(id: string, tenant: UpdateTenantRequest): Promise<ApiResponse<Tenant>> {
    return apiService.put<Tenant>(`/tenants/${id}`, tenant);
  },

  // Delete tenant
  async deleteTenant(id: string): Promise<ApiResponse> {
    return apiService.delete(`/tenants/${id}`);
  },

  // Assign tenant to room
  async assignRoom(id: string, assignment: AssignRoomRequest): Promise<ApiResponse<Tenant>> {
    return apiService.post<Tenant>(`/tenants/${id}/assign-room`, assignment);
  },

  // Remove tenant from room
  async removeFromRoom(id: string): Promise<ApiResponse<Tenant>> {
    return apiService.post<Tenant>(`/tenants/${id}/remove-room`, {});
  },

  // Get active tenants
  async getActiveTenants(): Promise<ApiResponse<Tenant[]>> {
    return apiService.get<Tenant[]>('/tenants/active');
  },

  // Get tenants by status
  async getTenantsByStatus(status: string): Promise<ApiResponse<Tenant[]>> {
    return apiService.get<Tenant[]>(`/tenants/status/${status}`);
  },

  // Get tenants by room
  async getTenantsByRoom(roomId: string): Promise<ApiResponse<Tenant[]>> {
    return apiService.get<Tenant[]>(`/tenants/room/${roomId}`);
  },

  // Check-in tenant
  async checkInTenant(id: string, roomId: string, checkInDate: string): Promise<ApiResponse<Tenant>> {
    return apiService.post<Tenant>(`/tenants/${id}/checkin`, {
      roomId,
      checkInDate
    });
  },

  // Check-out tenant
  async checkOutTenant(id: string, checkOutDate: string): Promise<ApiResponse<Tenant>> {
    return apiService.post<Tenant>(`/tenants/${id}/checkout`, {
      checkOutDate
    });
  }
};
