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
  },

  // Export invoice as PDF
  async exportInvoicePdf(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5152/api';
      
      const url = `${API_BASE_URL}/invoices/${id}/export-pdf`;
      console.log('Exporting PDF from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      console.log('PDF export response status:', response.status);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Failed to export PDF (Status: ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // Ignore
          }
        }
        throw new Error(errorMessage);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Invoice_${id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob and download
      const blob = await response.blob();
      console.log('PDF blob size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      console.log('PDF downloaded successfully:', filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  }
};
