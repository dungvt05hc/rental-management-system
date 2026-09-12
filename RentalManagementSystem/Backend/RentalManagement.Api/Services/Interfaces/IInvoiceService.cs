using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for invoice management operations
/// </summary>
public interface IInvoiceService
{
    /// <summary>
    /// Creates a new invoice
    /// </summary>
    /// <param name="createInvoiceDto">Invoice creation details</param>
    /// <returns>Created invoice information</returns>
    Task<ApiResponse<InvoiceDto>> CreateInvoiceAsync(CreateInvoiceDto createInvoiceDto);

    /// <summary>
    /// Gets an invoice by its ID
    /// </summary>
    /// <param name="id">Invoice ID</param>
    /// <returns>Invoice information</returns>
    Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(int id);

    /// <summary>
    /// Gets all invoices with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of invoices</returns>
    Task<ApiResponse<PagedResponse<InvoiceDto>>> GetInvoicesAsync(InvoiceSearchDto searchDto);

    /// <summary>
    /// Updates an existing invoice
    /// </summary>
    /// <param name="id">Invoice ID to update</param>
    /// <param name="updateInvoiceDto">Updated invoice information</param>
    /// <returns>Updated invoice information</returns>
    Task<ApiResponse<InvoiceDto>> UpdateInvoiceAsync(int id, UpdateInvoiceDto updateInvoiceDto);

    /// <summary>
    /// Deletes an invoice
    /// </summary>
    /// <param name="id">Invoice ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteInvoiceAsync(int id);

    /// <summary>
    /// Generates monthly invoices for all active customers
    /// </summary>
    /// <param name="billingPeriod">Month and year to generate invoices for</param>
    /// <returns>Number of invoices generated</returns>
    Task<ApiResponse<int>> GenerateMonthlyInvoicesAsync(DateTime billingPeriod);

    /// <summary>
    /// Gets invoices by customer ID
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <returns>List of invoices for the customer</returns>
    Task<ApiResponse<IEnumerable<InvoiceDto>>> GetInvoicesByCustomerAsync(int customerId);

    /// <summary>
    /// Gets overdue invoices
    /// </summary>
    /// <returns>List of overdue invoices</returns>
    Task<ApiResponse<IEnumerable<InvoiceDto>>> GetOverdueInvoicesAsync();

    /// <summary>
    /// Marks an invoice as paid
    /// </summary>
    /// <param name="id">Invoice ID</param>
    /// <param name="paidDate">Date when payment was completed</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> MarkInvoiceAsPaidAsync(int id, DateTime? paidDate = null);

    /// <summary>
    /// Gets invoice statistics
    /// </summary>
    /// <returns>Invoice statistics including revenue and payment status</returns>
    Task<ApiResponse<object>> GetInvoiceStatsAsync();

    /// <summary>
    /// Sends email reminders for due invoices
    /// </summary>
    /// <returns>Number of reminders sent</returns>
    Task<ApiResponse<int>> SendInvoiceRemindersAsync();
}
