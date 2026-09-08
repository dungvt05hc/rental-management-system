using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for reporting and analytics operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class ReportsController : ControllerBase
{
    private readonly IReportingService _reportingService;

    public ReportsController(IReportingService reportingService)
    {
        _reportingService = reportingService;
    }

    /// <summary>
    /// Gets occupancy rate report
    /// </summary>
    /// <param name="fromDate">Start date for the report</param>
    /// <param name="toDate">End date for the report</param>
    /// <returns>Occupancy rate statistics</returns>
    [HttpGet("occupancy-rate")]
    public async Task<ActionResult<ApiResponse<object>>> GetOccupancyRateReport(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _reportingService.GetOccupancyRateReportAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Gets monthly revenue report
    /// </summary>
    /// <param name="year">Year to generate report for</param>
    /// <returns>Monthly revenue statistics</returns>
    [HttpGet("monthly-revenue/{year}")]
    public async Task<ActionResult<ApiResponse<object>>> GetMonthlyRevenueReport(int year)
    {
        var result = await _reportingService.GetMonthlyRevenueReportAsync(year);
        return Ok(result);
    }

    /// <summary>
    /// Gets outstanding payments report
    /// </summary>
    /// <returns>Outstanding payments summary</returns>
    [HttpGet("outstanding-payments")]
    public async Task<ActionResult<ApiResponse<object>>> GetOutstandingPaymentsReport()
    {
        var result = await _reportingService.GetOutstandingPaymentsReportAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets financial summary for a specific period
    /// </summary>
    /// <param name="fromDate">Start date</param>
    /// <param name="toDate">End date</param>
    /// <returns>Financial summary</returns>
    [HttpGet("financial-summary")]
    public async Task<ActionResult<ApiResponse<object>>> GetFinancialSummary(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        var result = await _reportingService.GetFinancialSummaryAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Gets tenant statistics report
    /// </summary>
    /// <returns>Tenant statistics</returns>
    [HttpGet("tenant-statistics")]
    public async Task<ActionResult<ApiResponse<object>>> GetTenantStatistics()
    {
        var result = await _reportingService.GetTenantStatisticsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets room utilization report
    /// </summary>
    /// <returns>Room utilization statistics</returns>
    [HttpGet("room-utilization")]
    public async Task<ActionResult<ApiResponse<object>>> GetRoomUtilizationReport()
    {
        var result = await _reportingService.GetRoomUtilizationReportAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets payment method distribution report
    /// </summary>
    /// <param name="fromDate">Start date</param>
    /// <param name="toDate">End date</param>
    /// <returns>Payment method distribution</returns>
    [HttpGet("payment-method-distribution")]
    public async Task<ActionResult<ApiResponse<object>>> GetPaymentMethodDistribution(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _reportingService.GetPaymentMethodDistributionAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Gets dashboard summary with key metrics
    /// </summary>
    /// <returns>Dashboard summary data</returns>
    [HttpGet("dashboard-summary")]
    public async Task<ActionResult<ApiResponse<object>>> GetDashboardSummary()
    {
        var result = await _reportingService.GetDashboardSummaryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Exports data to CSV format
    /// </summary>
    /// <param name="reportType">Type of report to export</param>
    /// <param name="fromDate">Start date</param>
    /// <param name="toDate">End date</param>
    /// <returns>CSV file content</returns>
    [HttpGet("export/{reportType}")]
    public async Task<ActionResult> ExportToCsv(
        string reportType,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _reportingService.ExportToCsvAsync(reportType, fromDate, toDate);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        var fileName = $"{reportType}_report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(result.Data!, "text/csv", fileName);
    }
}
