import { apiService } from './api';
import type { 
  Invoice, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest, 
  InvoiceSearchRequest,
  PaginatedResult,
  ApiResponse 
} from '../types';

export const invoiceService = {
  // Get all invoices with pagination and filtering
  async getInvoices(params?: InvoiceSearchRequest): Promise<ApiResponse<PaginatedResult<Invoice>>> {
    return apiService.get<PaginatedResult<Invoice>>('/invoices', params);
  },

  // Get invoice by ID
  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    return apiService.get<Invoice>(`/invoices/${id}`);
  },

  // Create new invoice
  async createInvoice(invoice: CreateInvoiceRequest): Promise<ApiResponse<Invoice>> {
    return apiService.post<Invoice>('/invoices', invoice);
  },

  // Update invoice
  async updateInvoice(id: string, invoice: UpdateInvoiceRequest): Promise<ApiResponse<Invoice>> {
    return apiService.put<Invoice>(`/invoices/${id}`, invoice);
  },

  // Delete invoice
  async deleteInvoice(id: string): Promise<ApiResponse> {
    return apiService.delete(`/invoices/${id}`);
  },

  // Generate monthly invoices
  async generateMonthlyInvoices(year: number, month: number): Promise<ApiResponse<Invoice[]>> {
    return apiService.post<Invoice[]>('/invoices/generate-monthly', {
      year,
      month
    });
  },

  // Get invoices by tenant
  async getInvoicesByTenant(tenantId: string): Promise<ApiResponse<Invoice[]>> {
    return apiService.get<Invoice[]>(`/invoices/tenant/${tenantId}`);
  },

  // Get invoices by status
  async getInvoicesByStatus(status: string): Promise<ApiResponse<Invoice[]>> {
    return apiService.get<Invoice[]>(`/invoices/status/${status}`);
  },

  // Get overdue invoices
  async getOverdueInvoices(): Promise<ApiResponse<Invoice[]>> {
    return apiService.get<Invoice[]>('/invoices/overdue');
  },

  // Get pending invoices
  async getPendingInvoices(): Promise<ApiResponse<Invoice[]>> {
    return apiService.get<Invoice[]>('/invoices/pending');
  },

  // Mark invoice as paid
  async markAsPaid(id: string): Promise<ApiResponse<Invoice>> {
    return apiService.post<Invoice>(`/invoices/${id}/mark-paid`);
  },

  // Cancel invoice
  async cancelInvoice(id: string): Promise<ApiResponse<Invoice>> {
    return apiService.post<Invoice>(`/invoices/${id}/cancel`);
  }
};
