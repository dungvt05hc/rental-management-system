import { apiService } from './api';
import type { 
  OccupancyReport,
  RevenueReport,
  MonthlyReport,
  ApiResponse 
} from '../types';

export const reportService = {
  // Get occupancy report
  async getOccupancyReport(fromDate?: string, toDate?: string): Promise<ApiResponse<OccupancyReport>> {
    return apiService.get<OccupancyReport>('/reports/occupancy-rate', {
      fromDate,
      toDate
    });
  },

  // Get monthly revenue report
  async getMonthlyRevenueReport(year: number): Promise<ApiResponse<RevenueReport>> {
    return apiService.get<RevenueReport>(`/reports/monthly-revenue/${year}`);
  },

  // Get outstanding payments report
  async getOutstandingPaymentsReport(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/outstanding-payments');
  },

  // Get financial summary
  async getFinancialSummary(fromDate: string, toDate: string): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/financial-summary', {
      fromDate,
      toDate
    });
  },

  // Get tenant statistics
  async getTenantStatistics(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/tenant-statistics');
  },

  // Get room utilization report
  async getRoomUtilizationReport(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/room-utilization');
  },

  // Get payment method distribution
  async getPaymentMethodDistribution(fromDate?: string, toDate?: string): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/payment-method-distribution', {
      fromDate,
      toDate
    });
  },

  // Get dashboard summary
  async getDashboardSummary(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/dashboard-summary');
  },

  // Export report as CSV
  async exportReportCsv(reportType: string, fromDate?: string, toDate?: string): Promise<Blob> {
    const response = await apiService.get(`/reports/export/${reportType}`, {
      fromDate,
      toDate,
      responseType: 'blob'
    });
    return response.data;
  }
};
