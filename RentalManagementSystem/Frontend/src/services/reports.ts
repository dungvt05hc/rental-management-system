import { apiService } from './api';
import type { 
  OccupancyReport,
  RevenueReport,
  MonthlyReport,
  ApiResponse 
} from '../types';

export const reportService = {
  // Get occupancy report
  async getOccupancyReport(): Promise<ApiResponse<OccupancyReport>> {
    return apiService.get<OccupancyReport>('/reports/occupancy');
  },

  // Get revenue report
  async getRevenueReport(startDate?: string, endDate?: string): Promise<ApiResponse<RevenueReport>> {
    return apiService.get<RevenueReport>('/reports/revenue', {
      startDate,
      endDate
    });
  },

  // Get monthly report
  async getMonthlyReport(year: number, month: number): Promise<ApiResponse<MonthlyReport>> {
    return apiService.get<MonthlyReport>(`/reports/monthly/${year}/${month}`);
  },

  // Get yearly report
  async getYearlyReport(year: number): Promise<ApiResponse<MonthlyReport[]>> {
    return apiService.get<MonthlyReport[]>(`/reports/yearly/${year}`);
  },

  // Get tenant statistics
  async getTenantStatistics(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/tenants');
  },

  // Get room statistics
  async getRoomStatistics(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/rooms');
  },

  // Get payment statistics
  async getPaymentStatistics(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/payments', {
      startDate,
      endDate
    });
  },

  // Get financial summary
  async getFinancialSummary(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    return apiService.get<any>('/reports/financial-summary', {
      startDate,
      endDate
    });
  },

  // Export report as PDF
  async exportReportPdf(reportType: string, params?: any): Promise<Blob> {
    const response = await apiService.get(`/reports/export/pdf/${reportType}`, {
      ...params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Export report as Excel
  async exportReportExcel(reportType: string, params?: any): Promise<Blob> {
    const response = await apiService.get(`/reports/export/excel/${reportType}`, {
      ...params,
      responseType: 'blob'
    });
    return response.data;
  }
};
