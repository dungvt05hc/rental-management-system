import { apiService } from './api';
import type { 
  Room, 
  CreateRoomRequest, 
  UpdateRoomRequest, 
  RoomSearchRequest,
  PaginatedResult,
  ApiResponse 
} from '../types';

export const roomService = {
  // Get all rooms with pagination and filtering
  async getRooms(params?: RoomSearchRequest): Promise<ApiResponse<PaginatedResult<Room>>> {
    return apiService.get<PaginatedResult<Room>>('/rooms', params);
  },

  // Get room by ID
  async getRoom(id: string): Promise<ApiResponse<Room>> {
    return apiService.get<Room>(`/rooms/${id}`);
  },

  // Create new room
  async createRoom(room: CreateRoomRequest): Promise<ApiResponse<Room>> {
    return apiService.post<Room>('/rooms', room);
  },

  // Update room
  async updateRoom(id: string, room: UpdateRoomRequest): Promise<ApiResponse<Room>> {
    return apiService.put<Room>(`/rooms/${id}`, room);
  },

  // Delete room
  async deleteRoom(id: string): Promise<ApiResponse> {
    return apiService.delete(`/rooms/${id}`);
  },

  // Get available rooms
  async getAvailableRooms(): Promise<ApiResponse<Room[]>> {
    return apiService.get<Room[]>('/rooms/available');
  },

  // Get rooms by status
  async getRoomsByStatus(status: string): Promise<ApiResponse<Room[]>> {
    return apiService.get<Room[]>(`/rooms/status/${status}`);
  },

  // Assign tenant to room
  async assignTenant(roomId: string, tenantId: string): Promise<ApiResponse<Room>> {
    return apiService.post<Room>(`/rooms/${roomId}/assign`, { tenantId });
  },

  // Remove tenant from room
  async removeTenant(roomId: string): Promise<ApiResponse<Room>> {
    return apiService.post<Room>(`/rooms/${roomId}/remove-tenant`);
  }
};
