import { apiService } from './api';
import type {
  OccupancyReport,
  RevenueReport,
  OutstandingPaymentsReport,
  FinancialSummaryReport,
  CustomerStatisticsReport,
  RoomUtilizationReport,
  PaymentMethodDistributionReport,
  DashboardSummaryReport,
  ApiResponse
} from '../types';

/**
 * Ghim mốc giờ UTC vào một chuỗi ngày trần.
 *
 * Backend nhận DateTime rồi đưa thẳng vào truy vấn Npgsql. Chuỗi "2026-09-01"
 * được model binder dựng thành DateTime có Kind=Unspecified, và Npgsql TỪ CHỐI
 * kiểu đó với cột `timestamp with time zone` — request trả về 400 kèm
 * ArgumentException, không phải một lỗi nghiệp vụ dễ đoán.
 *
 * Hậu quả đã đo được: trang Báo cáo luôn truyền ngày dạng "YYYY-MM-DD", nên
 * báo cáo doanh thu và tổng hợp theo tháng CHƯA BAO GIỜ tải được — cả hai đều
 * ăn 400 ở mọi lần mở.
 *
 * Thêm "T00:00:00Z" là đủ để binder dựng Kind=Utc. Chuỗi đã có phần giờ thì
 * giữ nguyên.
 */
function asUtcInstant(date?: string): string | undefined {
  if (!date) return undefined;
  return date.includes('T') ? date : `${date}T00:00:00Z`;
}

export const reportService = {
  // Get occupancy report
  async getOccupancyReport(fromDate?: string, toDate?: string): Promise<ApiResponse<OccupancyReport>> {
    return apiService.get<OccupancyReport>('/reports/occupancy-rate', {
      fromDate: asUtcInstant(fromDate),
      toDate: asUtcInstant(toDate)
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
      fromDate: asUtcInstant(fromDate),
      toDate: asUtcInstant(toDate)
    });
  },

  // Get customer statistics
  async getCustomerStatistics(): Promise<ApiResponse<CustomerStatisticsReport>> {
    return apiService.get<CustomerStatisticsReport>('/reports/customer-statistics');
  },

  // Get room utilization report
  async getRoomUtilizationReport(): Promise<ApiResponse<RoomUtilizationReport>> {
    return apiService.get<RoomUtilizationReport>('/reports/room-utilization');
  },

  // Get payment method distribution
  async getPaymentMethodDistribution(fromDate?: string, toDate?: string): Promise<ApiResponse<PaymentMethodDistributionReport>> {
    return apiService.get<PaymentMethodDistributionReport>('/reports/payment-method-distribution', {
      fromDate: asUtcInstant(fromDate),
      toDate: asUtcInstant(toDate)
    });
  },

  // Get dashboard summary
  async getDashboardSummary(): Promise<ApiResponse<DashboardSummaryReport>> {
    return apiService.get<DashboardSummaryReport>('/reports/dashboard-summary');
  },

  // Export report as CSV
  async exportReportCsv(reportType: string, fromDate?: string, toDate?: string): Promise<Blob> {
    return apiService.getFile(`/reports/export/${reportType}`, {
      fromDate: asUtcInstant(fromDate),
      toDate: asUtcInstant(toDate)
    });
  }
};
