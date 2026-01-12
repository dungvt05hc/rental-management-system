import { apiService } from './api';
import type {
  ApiResponse,
  User,
  CreateUserDto,
  UpdateUserDto,
  UserFilterDto,
  PaginatedUsersDto,
  UserActivationDto,
  ResetUserPasswordDto,
  RoleDto,
  UserStatisticsDto,
  BulkUserOperationDto,
} from '../types';

const BASE_URL = '/SystemManagement/users';

/**
 * User Management Service
 * Handles all user-related API operations
 */
export const userManagementService = {
  /**
   * Get paginated and filtered list of users
   */
  async getUsers(filter: UserFilterDto): Promise<ApiResponse<PaginatedUsersDto>> {
    const params = new URLSearchParams();
    
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.pageSize) params.append('pageSize', filter.pageSize.toString());
    if (filter.searchTerm) params.append('searchTerm', filter.searchTerm);
    if (filter.role) params.append('role', filter.role);
    if (filter.isActive !== undefined) params.append('isActive', filter.isActive.toString());
    if (filter.sortBy) params.append('sortBy', filter.sortBy);
    if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);

    return apiService.get<PaginatedUsersDto>(`${BASE_URL}?${params.toString()}`);
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return apiService.get<User>(`${BASE_URL}/${userId}`);
  },

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<ApiResponse<User>> {
    return apiService.post<User>(BASE_URL, userData);
  },

  /**
   * Update user information
   */
  async updateUser(userId: string, userData: UpdateUserDto): Promise<ApiResponse<User>> {
    return apiService.put<User>(`${BASE_URL}/${userId}`, userData);
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<ApiResponse<boolean>> {
    return apiService.delete<boolean>(`${BASE_URL}/${userId}`);
  },

  /**
   * Activate or deactivate a user account
   */
  async setUserActivation(
    userId: string,
    activationData: UserActivationDto
  ): Promise<ApiResponse<boolean>> {
    return apiService.put<boolean>(`${BASE_URL}/${userId}/activation`, activationData);
  },

  /**
   * Reset user password (Admin only)
   */
  async resetUserPassword(
    userId: string,
    resetData: ResetUserPasswordDto
  ): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>(`${BASE_URL}/${userId}/reset-password`, resetData);
  },

  /**
   * Assign roles to a user
   */
  async assignRoles(userId: string, roles: string[]): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>(`${BASE_URL}/${userId}/roles`, roles);
  },

  /**
   * Remove roles from a user
   */
  async removeRoles(userId: string, roles: string[]): Promise<ApiResponse<boolean>> {
    return apiService.delete<boolean>(`${BASE_URL}/${userId}/roles`, roles);
  },

  /**
   * Get all available roles
   */
  async getAvailableRoles(): Promise<ApiResponse<RoleDto[]>> {
    return apiService.get<RoleDto[]>(`${BASE_URL}/roles/available`);
  },

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<ApiResponse<UserStatisticsDto>> {
    return apiService.get<UserStatisticsDto>(`${BASE_URL}/statistics`);
  },

  /**
   * Perform bulk operations on users
   */
  async bulkUserOperation(
    bulkOperation: BulkUserOperationDto
  ): Promise<ApiResponse<number>> {
    return apiService.post<number>(`${BASE_URL}/bulk`, bulkOperation);
  },

  /**
   * Get user audit log
   */
  async getUserAuditLog(userId: string, limit: number = 50): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>(`${BASE_URL}/${userId}/audit-log?limit=${limit}`);
  },
};
