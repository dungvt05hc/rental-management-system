import { apiService } from './api';
import type {
  RentalContract,
  CreateRentalContractRequest,
  UpdateRentalContractRequest,
  EndRentalContractRequest,
  RentalContractSearchRequest,
  PaginatedResult,
  ApiResponse
} from '../types';

export const rentalContractService = {
  // Get contracts with pagination and filtering
  async getContracts(params?: RentalContractSearchRequest): Promise<ApiResponse<PaginatedResult<RentalContract>>> {
    return apiService.get<PaginatedResult<RentalContract>>('/rental-contracts', params);
  },

  // Get contract by ID
  async getContract(id: number): Promise<ApiResponse<RentalContract>> {
    return apiService.get<RentalContract>(`/rental-contracts/${id}`);
  },

  // Get every contract held by one customer, newest first
  async getContractsByCustomer(customerId: number): Promise<ApiResponse<RentalContract[]>> {
    return apiService.get<RentalContract[]>(`/rental-contracts/customer/${customerId}`);
  },

  // Create a new contract
  async createContract(contract: CreateRentalContractRequest): Promise<ApiResponse<RentalContract>> {
    return apiService.post<RentalContract>('/rental-contracts', contract);
  },

  // Update an existing contract
  async updateContract(id: number, contract: UpdateRentalContractRequest): Promise<ApiResponse<RentalContract>> {
    return apiService.put<RentalContract>(`/rental-contracts/${id}`, contract);
  },

  // Activate a draft contract
  async activateContract(id: number): Promise<ApiResponse<RentalContract>> {
    return apiService.post<RentalContract>(`/rental-contracts/${id}/activate`, {});
  },

  // End a contract — kept for history, never deleted
  async endContract(id: number, payload: EndRentalContractRequest = {}): Promise<ApiResponse<RentalContract>> {
    return apiService.post<RentalContract>(`/rental-contracts/${id}/end`, payload);
  },

  // Cancel a contract that never took effect
  async cancelContract(id: number): Promise<ApiResponse<RentalContract>> {
    return apiService.post<RentalContract>(`/rental-contracts/${id}/cancel`, {});
  }
};
