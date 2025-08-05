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
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IReportingService reportingService, ILogger<ReportsController> logger)
    {
        _reportingService = reportingService;
        _logger = logger;
    }

    /// <summary>
    /// Gets current occupancy report
    /// </summary>
    /// <returns>Occupancy statistics</returns>
    [HttpGet("occupancy")]
    public async Task<ActionResult<ApiResponse<object>>> GetOccupancyReport()
    {
        try
        {
            var result = await _reportingService.GetOccupancyReportAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving occupancy report");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving occupancy report"));
        }
    }

    /// <summary>
    /// Gets revenue report
    /// </summary>
    /// <param name="startDate">Optional start date filter</param>
    /// <param name="endDate">Optional end date filter</param>
    /// <returns>Revenue statistics</returns>
    [HttpGet("revenue")]
    public async Task<ActionResult<ApiResponse<object>>> GetRevenueReport(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var result = await _reportingService.GetRevenueReportAsync(startDate, endDate);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving revenue report");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving revenue report"));
        }
    }

    /// <summary>
    /// Gets monthly revenue report
    /// </summary>
    /// <param name="year">Year to generate report for</param>
    /// <returns>Monthly revenue statistics</returns>
    [HttpGet("monthly-revenue/{year}")]
    public async Task<ActionResult<ApiResponse<object>>> GetMonthlyRevenueReport(int year)
    {
        try
        {
            var result = await _reportingService.GetMonthlyRevenueReportAsync(year);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving monthly revenue report for year {Year}", year);
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving monthly revenue report"));
        }
    }

    /// <summary>
    /// Gets outstanding payments report
    /// </summary>
    /// <returns>Outstanding payments summary</returns>
    [HttpGet("outstanding-payments")]
    public async Task<ActionResult<ApiResponse<object>>> GetOutstandingPaymentsReport()
    {
        try
        {
            var result = await _reportingService.GetOutstandingPaymentsReportAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving outstanding payments report");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving outstanding payments report"));
        }
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
        try
        {
            var result = await _reportingService.GetFinancialSummaryAsync(fromDate, toDate);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving financial summary from {FromDate} to {ToDate}", fromDate, toDate);
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving financial summary"));
        }
    }

    /// <summary>
    /// Gets tenant statistics report
    /// </summary>
    /// <returns>Tenant statistics</returns>
    [HttpGet("tenant-statistics")]
    public async Task<ActionResult<ApiResponse<object>>> GetTenantStatistics()
    {
        try
        {
            var result = await _reportingService.GetTenantStatisticsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant statistics");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving tenant statistics"));
        }
    }

    /// <summary>
    /// Gets room utilization report
    /// </summary>
    /// <returns>Room utilization statistics</returns>
    [HttpGet("room-utilization")]
    public async Task<ActionResult<ApiResponse<object>>> GetRoomUtilizationReport()
    {
        try
        {
            var result = await _reportingService.GetRoomUtilizationReportAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving room utilization report");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving room utilization report"));
        }
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
        try
        {
            var result = await _reportingService.GetPaymentMethodDistributionAsync(fromDate, toDate);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payment method distribution report");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving payment method distribution report"));
        }
    }

    /// <summary>
    /// Gets dashboard summary with key metrics
    /// </summary>
    /// <returns>Dashboard summary data</returns>
    [HttpGet("dashboard-summary")]
    public async Task<ActionResult<ApiResponse<object>>> GetDashboardSummary()
    {
        try
        {
            var result = await _reportingService.GetDashboardSummaryAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard summary");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving dashboard summary"));
        }
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
        try
        {
            var result = await _reportingService.ExportToCsvAsync(reportType, fromDate, toDate);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            var fileName = $"{reportType}_report_{DateTime.Now:yyyyMMdd_HHmmss}.csv";
            return File(result.Data!, "text/csv", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting {ReportType} report to CSV", reportType);
            return StatusCode(500, ApiResponse<byte[]>.ErrorResponse("An error occurred while exporting report to CSV"));
        }
    }
}
