using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for generating reports and analytics
/// </summary>
public interface IReportingService
{
    /// <summary>
    /// Gets current occupancy report summary
    /// </summary>
    /// <returns>Occupancy statistics</returns>
    Task<ApiResponse<object>> GetOccupancyReportAsync();

    /// <summary>
    /// Gets revenue report summary
    /// </summary>
    /// <param name="startDate">Optional start date filter</param>
    /// <param name="endDate">Optional end date filter</param>
    /// <returns>Revenue statistics</returns>
    Task<ApiResponse<object>> GetRevenueReportAsync(DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// Gets monthly revenue report
    /// </summary>
    /// <param name="year">Year to generate report for</param>
    /// <returns>Monthly revenue statistics</returns>
    Task<ApiResponse<object>> GetMonthlyRevenueReportAsync(int year);

    /// <summary>
    /// Gets outstanding payments report
    /// </summary>
    /// <returns>Outstanding payments summary</returns>
    Task<ApiResponse<object>> GetOutstandingPaymentsReportAsync();

    /// <summary>
    /// Gets financial summary for a specific period
    /// </summary>
    /// <param name="fromDate">Start date</param>
    /// <param name="toDate">End date</param>
    /// <returns>Financial summary</returns>
    Task<ApiResponse<object>> GetFinancialSummaryAsync(DateTime fromDate, DateTime toDate);

    /// <summary>
    /// Gets tenant statistics report
    /// </summary>
    /// <returns>Tenant statistics</returns>
    Task<ApiResponse<object>> GetTenantStatisticsAsync();

    /// <summary>
    /// Gets room utilization report
    /// </summary>
    /// <returns>Room utilization statistics</returns>
    Task<ApiResponse<object>> GetRoomUtilizationReportAsync();

    /// <summary>
    /// Gets payment method distribution report
    /// </summary>
    /// <param name="fromDate">Start date</param>
    /// <param name="toDate">End date</param>
    /// <returns>Payment method distribution</returns>
    Task<ApiResponse<object>> GetPaymentMethodDistributionAsync(DateTime? fromDate = null, DateTime? toDate = null);

    /// <summary>
    /// Gets dashboard summary with key metrics
    /// </summary>
    /// <returns>Dashboard summary data</returns>
    Task<ApiResponse<object>> GetDashboardSummaryAsync();

    /// <summary>
    /// Exports data to CSV format
    /// </summary>
    /// <param name="reportType">Type of report to export</param>
    /// <param name="fromDate">Start date</param>
    /// <param name="toDate">End date</param>
    /// <returns>CSV file content</returns>
    Task<ApiResponse<byte[]>> ExportToCsvAsync(string reportType, DateTime? fromDate = null, DateTime? toDate = null);
}
