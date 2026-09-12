import { apiService } from './api';
import type {
  ApiResponse,
  Invitation,
  CreateInvitationRequest,
  CreatedInvitation
} from '../types';

const BASE_URL = '/invitations';

/**
 * Mã mời — chỉ Admin gọi được, backend chặn bằng [Authorize(Roles = "Admin")].
 */
export const invitationsService = {
  // Danh sách lời mời, mới nhất trước.
  async getInvitations(): Promise<ApiResponse<Invitation[]>> {
    return apiService.get<Invitation[]>(BASE_URL);
  },

  // Sinh mã mời mới. Mã gốc chỉ có trong response này — database chỉ giữ bản
  // băm, nên không hiển thị lại được ở màn hình danh sách.
  async createInvitation(request: CreateInvitationRequest): Promise<ApiResponse<CreatedInvitation>> {
    return apiService.post<CreatedInvitation>(BASE_URL, request);
  },

  // Thu hồi một mã chưa dùng.
  async revokeInvitation(id: string): Promise<ApiResponse<boolean>> {
    return apiService.post<boolean>(`${BASE_URL}/${id}/revoke`);
  }
};
