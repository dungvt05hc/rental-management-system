import { apiService } from './api';
import type { 
  Payment, 
  CreatePaymentRequest, 
  UpdatePaymentRequest, 
  PaymentSearchRequest,
  PaginatedResult,
  ApiResponse 
} from '../types';

export const paymentService = {
  // Get all payments with pagination and filtering
  async getPayments(params?: PaymentSearchRequest): Promise<ApiResponse<PaginatedResult<Payment>>> {
    return apiService.get<PaginatedResult<Payment>>('/payments', params);
  },

  // Get payment by ID
  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return apiService.get<Payment>(`/payments/${id}`);
  },

  // Create new payment
  async createPayment(payment: CreatePaymentRequest): Promise<ApiResponse<Payment>> {
    return apiService.post<Payment>('/payments', payment);
  },

  // Update payment
  async updatePayment(id: string, payment: UpdatePaymentRequest): Promise<ApiResponse<Payment>> {
    return apiService.put<Payment>(`/payments/${id}`, payment);
  },

  // Delete payment
  async deletePayment(id: string): Promise<ApiResponse> {
    return apiService.delete(`/payments/${id}`);
  },

  // Get payments by invoice
  async getPaymentsByInvoice(invoiceId: string): Promise<ApiResponse<Payment[]>> {
    return apiService.get<Payment[]>(`/payments/invoice/${invoiceId}`);
  },

  // Get payments by payment method
  async getPaymentsByMethod(method: string): Promise<ApiResponse<Payment[]>> {
    return apiService.get<Payment[]>(`/payments/method/${method}`);
  },

  // Get payments within date range
  async getPaymentsByDateRange(startDate: string, endDate: string): Promise<ApiResponse<Payment[]>> {
    return apiService.get<Payment[]>('/payments/date-range', {
      startDate,
      endDate
    });
  },

  // Get payment statistics
  async getPaymentStatistics(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/payments/statistics');
  }
};
