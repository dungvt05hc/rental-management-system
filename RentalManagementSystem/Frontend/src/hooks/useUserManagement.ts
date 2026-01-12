import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementService } from '../services/userManagementService';
import type {
  UserFilterDto,
  CreateUserDto,
  UpdateUserDto,
  UserActivationDto,
  ResetUserPasswordDto,
  BulkUserOperationDto,
} from '../types';

// Query keys
export const userManagementKeys = {
  all: ['user-management'] as const,
  lists: () => [...userManagementKeys.all, 'list'] as const,
  list: (filters: UserFilterDto) => [...userManagementKeys.lists(), filters] as const,
  details: () => [...userManagementKeys.all, 'detail'] as const,
  detail: (id: string) => [...userManagementKeys.details(), id] as const,
  statistics: () => [...userManagementKeys.all, 'statistics'] as const,
  roles: () => [...userManagementKeys.all, 'roles'] as const,
  auditLog: (id: string) => [...userManagementKeys.all, 'audit-log', id] as const,
};

/**
 * Hook to get paginated users list
 */
export function useUsers(filters: UserFilterDto) {
  return useQuery({
    queryKey: userManagementKeys.list(filters),
    queryFn: async () => {
      const response = await userManagementService.getUsers(filters);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch users');
      }
      return response.data!;
    },
  });
}

/**
 * Hook to get a single user by ID
 */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: userManagementKeys.detail(userId!),
    queryFn: async () => {
      const response = await userManagementService.getUserById(userId!);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch user');
      }
      return response.data!;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to get available roles
 */
export function useRoles() {
  return useQuery({
    queryKey: userManagementKeys.roles(),
    queryFn: async () => {
      const response = await userManagementService.getAvailableRoles();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch roles');
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to get user statistics
 */
export function useUserStatistics() {
  return useQuery({
    queryKey: userManagementKeys.statistics(),
    queryFn: async () => {
      const response = await userManagementService.getUserStatistics();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch statistics');
      }
      return response.data!;
    },
  });
}

/**
 * Hook to get user audit log
 */
export function useUserAuditLog(userId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: userManagementKeys.auditLog(userId!),
    queryFn: async () => {
      const response = await userManagementService.getUserAuditLog(userId!, limit);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch audit log');
      }
      return response.data!;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserDto) => {
      const response = await userManagementService.createUser(userData);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create user');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
    },
  });
}

/**
 * Hook to update a user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: UpdateUserDto }) => {
      const response = await userManagementService.updateUser(userId, userData);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update user');
      }
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
    },
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await userManagementService.deleteUser(userId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete user');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
    },
  });
}

/**
 * Hook to activate/deactivate a user
 */
export function useSetUserActivation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      activationData,
    }: {
      userId: string;
      activationData: UserActivationDto;
    }) => {
      const response = await userManagementService.setUserActivation(userId, activationData);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update user activation');
      }
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
    },
  });
}

/**
 * Hook to reset user password
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({
      userId,
      resetData,
    }: {
      userId: string;
      resetData: ResetUserPasswordDto;
    }) => {
      const response = await userManagementService.resetUserPassword(userId, resetData);
      if (!response.success) {
        throw new Error(response.message || 'Failed to reset password');
      }
      return response.data!;
    },
  });
}

/**
 * Hook to assign roles to a user
 */
export function useAssignRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const response = await userManagementService.assignRoles(userId, roles);
      if (!response.success) {
        throw new Error(response.message || 'Failed to assign roles');
      }
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.roles() });
    },
  });
}

/**
 * Hook to remove roles from a user
 */
export function useRemoveRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const response = await userManagementService.removeRoles(userId, roles);
      if (!response.success) {
        throw new Error(response.message || 'Failed to remove roles');
      }
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.roles() });
    },
  });
}

/**
 * Hook to perform bulk operations on users
 */
export function useBulkUserOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bulkOperation: BulkUserOperationDto) => {
      const response = await userManagementService.bulkUserOperation(bulkOperation);
      if (!response.success) {
        throw new Error(response.message || 'Failed to perform bulk operation');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userManagementKeys.statistics() });
    },
  });
}
