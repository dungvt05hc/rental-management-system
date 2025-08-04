using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for payment management operations
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Creates a new payment
    /// </summary>
    /// <param name="createPaymentDto">Payment creation details</param>
    /// <param name="userId">ID of the user recording the payment</param>
    /// <returns>Created payment information</returns>
    Task<ApiResponse<PaymentDto>> CreatePaymentAsync(CreatePaymentDto createPaymentDto, string? userId = null);

    /// <summary>
    /// Gets a payment by its ID
    /// </summary>
    /// <param name="id">Payment ID</param>
    /// <returns>Payment information</returns>
    Task<ApiResponse<PaymentDto>> GetPaymentByIdAsync(int id);

    /// <summary>
    /// Gets all payments with optional filtering
    /// </summary>
    /// <param name="invoiceId">Optional invoice ID filter</param>
    /// <param name="page">Page number</param>
    /// <param name="pageSize">Page size</param>
    /// <returns>Paginated list of payments</returns>
    Task<ApiResponse<PagedResponse<PaymentDto>>> GetPaymentsAsync(int? invoiceId = null, int page = 1, int pageSize = 10);

    /// <summary>
    /// Gets payments by invoice ID
    /// </summary>
    /// <param name="invoiceId">Invoice ID</param>
    /// <returns>List of payments for the invoice</returns>
    Task<ApiResponse<IEnumerable<PaymentDto>>> GetPaymentsByInvoiceAsync(int invoiceId);

    /// <summary>
    /// Updates an existing payment
    /// </summary>
    /// <param name="id">Payment ID to update</param>
    /// <param name="createPaymentDto">Updated payment information</param>
    /// <returns>Updated payment information</returns>
    Task<ApiResponse<PaymentDto>> UpdatePaymentAsync(int id, CreatePaymentDto createPaymentDto);

    /// <summary>
    /// Deletes a payment
    /// </summary>
    /// <param name="id">Payment ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeletePaymentAsync(int id);

    /// <summary>
    /// Verifies a payment
    /// </summary>
    /// <param name="id">Payment ID</param>
    /// <param name="isVerified">Verification status</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> VerifyPaymentAsync(int id, bool isVerified = true);

    /// <summary>
    /// Gets payment statistics
    /// </summary>
    /// <param name="fromDate">Start date for statistics</param>
    /// <param name="toDate">End date for statistics</param>
    /// <returns>Payment statistics</returns>
    Task<ApiResponse<object>> GetPaymentStatsAsync(DateTime? fromDate = null, DateTime? toDate = null);

    /// <summary>
    /// Gets monthly payment summary
    /// </summary>
    /// <param name="year">Year to get summary for</param>
    /// <returns>Monthly payment summary for the year</returns>
    Task<ApiResponse<object>> GetMonthlyPaymentSummaryAsync(int year);
}
