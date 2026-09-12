import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationsService } from '../services/invitations';
import type { CreateInvitationRequest } from '../types';

export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
};

/**
 * Hook to list every invitation
 */
export function useInvitations() {
  return useQuery({
    queryKey: invitationKeys.lists(),
    queryFn: async () => {
      const response = await invitationsService.getInvitations();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch invitations');
      }
      return response.data!;
    },
  });
}

/**
 * Hook to issue a new invitation code
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateInvitationRequest) => {
      const response = await invitationsService.createInvitation(request);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create invitation');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
    },
  });
}

/**
 * Hook to revoke an unused invitation
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await invitationsService.revokeInvitation(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to revoke invitation');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.lists() });
    },
  });
}
