import { apiService } from './api';
import type {
  OccupancyReport,
  RevenueReport,
  OutstandingPaymentsReport,
  FinancialSummaryReport,
  TenantStatisticsReport,
  RoomUtilizationReport,
  PaymentMethodDistributionReport,
  DashboardSummaryReport,
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
  async getOutstandingPaymentsReport(): Promise<ApiResponse<OutstandingPaymentsReport>> {
    return apiService.get<OutstandingPaymentsReport>('/reports/outstanding-payments');
  },

  // Get financial summary
  async getFinancialSummary(fromDate: string, toDate: string): Promise<ApiResponse<FinancialSummaryReport>> {
    return apiService.get<FinancialSummaryReport>('/reports/financial-summary', {
      fromDate,
      toDate
    });
  },

  // Get tenant statistics
  async getTenantStatistics(): Promise<ApiResponse<TenantStatisticsReport>> {
    return apiService.get<TenantStatisticsReport>('/reports/tenant-statistics');
  },

  // Get room utilization report
  async getRoomUtilizationReport(): Promise<ApiResponse<RoomUtilizationReport>> {
    return apiService.get<RoomUtilizationReport>('/reports/room-utilization');
  },

  // Get payment method distribution
  async getPaymentMethodDistribution(fromDate?: string, toDate?: string): Promise<ApiResponse<PaymentMethodDistributionReport>> {
    return apiService.get<PaymentMethodDistributionReport>('/reports/payment-method-distribution', {
      fromDate,
      toDate
    });
  },

  // Get dashboard summary
  async getDashboardSummary(): Promise<ApiResponse<DashboardSummaryReport>> {
    return apiService.get<DashboardSummaryReport>('/reports/dashboard-summary');
  },

  // Export report as CSV
  async exportReportCsv(reportType: string, fromDate?: string, toDate?: string): Promise<Blob> {
    const response = await apiService.get<Blob>(`/reports/export/${reportType}`, {
      fromDate,
      toDate
    });
    return response.data;
  }
};
