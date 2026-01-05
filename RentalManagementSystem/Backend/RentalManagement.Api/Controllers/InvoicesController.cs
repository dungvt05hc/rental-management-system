using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for invoice management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly ILogger<InvoicesController> _logger;
    private readonly IPdfService _pdfService;

    public InvoicesController(
        IInvoiceService invoiceService, 
        ILogger<InvoicesController> logger,
        IPdfService pdfService)
    {
        _invoiceService = invoiceService;
        _logger = logger;
        _pdfService = pdfService;
    }

    /// <summary>
    /// Gets all invoices with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of invoices</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<InvoiceDto>>>> GetInvoices([FromQuery] InvoiceSearchDto searchDto)
    {
        try
        {
            var result = await _invoiceService.GetInvoicesAsync(searchDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoices");
            return StatusCode(500, ApiResponse<PagedResponse<InvoiceDto>>.ErrorResponse("An error occurred while retrieving invoices"));
        }
    }

    /// <summary>
    /// Gets an invoice by its ID
    /// </summary>
    /// <param name="id">Invoice ID</param>
    /// <returns>Invoice information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetInvoice(int id)
    {
        try
        {
            var result = await _invoiceService.GetInvoiceByIdAsync(id);
            
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoice {Id}", id);
            return StatusCode(500, ApiResponse<InvoiceDto>.ErrorResponse("An error occurred while retrieving the invoice"));
        }
    }

    /// <summary>
    /// Creates a new invoice
    /// </summary>
    /// <param name="createInvoiceDto">Invoice creation details</param>
    /// <returns>Created invoice information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> CreateInvoice([FromBody] CreateInvoiceDto createInvoiceDto)
    {
        try
        {
            var result = await _invoiceService.CreateInvoiceAsync(createInvoiceDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetInvoice), new { id = result.Data!.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice");
            return StatusCode(500, ApiResponse<InvoiceDto>.ErrorResponse("An error occurred while creating the invoice"));
        }
    }

    /// <summary>
    /// Updates an existing invoice
    /// </summary>
    /// <param name="id">Invoice ID to update</param>
    /// <param name="updateInvoiceDto">Updated invoice information</param>
    /// <returns>Updated invoice information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> UpdateInvoice(int id, [FromBody] UpdateInvoiceDto updateInvoiceDto)
    {
        try
        {
            var result = await _invoiceService.UpdateInvoiceAsync(id, updateInvoiceDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating invoice {Id}", id);
            return StatusCode(500, ApiResponse<InvoiceDto>.ErrorResponse("An error occurred while updating the invoice"));
        }
    }

    /// <summary>
    /// Deletes an invoice
    /// </summary>
    /// <param name="id">Invoice ID to delete</param>
    /// <returns>Deletion result</returns>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteInvoice(int id)
    {
        try
        {
            var result = await _invoiceService.DeleteInvoiceAsync(id);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting invoice {Id}", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while deleting the invoice"));
        }
    }

    /// <summary>
    /// Generates monthly invoices for all active tenants
    /// </summary>
    /// <param name="billingPeriod">Billing period (year and month)</param>
    /// <returns>Number of invoices generated</returns>
    [HttpPost("generate-monthly")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<int>>> GenerateMonthlyInvoices([FromQuery] DateTime billingPeriod)
    {
        try
        {
            var result = await _invoiceService.GenerateMonthlyInvoicesAsync(billingPeriod);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating monthly invoices for {BillingPeriod}", billingPeriod);
            return StatusCode(500, ApiResponse<int>.ErrorResponse("An error occurred while generating monthly invoices"));
        }
    }

    /// <summary>
    /// Gets invoices by tenant ID
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <returns>List of invoices for the tenant</returns>
    [HttpGet("tenant/{tenantId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<InvoiceDto>>>> GetInvoicesByTenant(int tenantId)
    {
        try
        {
            var result = await _invoiceService.GetInvoicesByTenantAsync(tenantId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoices by tenant {TenantId}", tenantId);
            return StatusCode(500, ApiResponse<IEnumerable<InvoiceDto>>.ErrorResponse("An error occurred while retrieving invoices by tenant"));
        }
    }

    /// <summary>
    /// Gets overdue invoices
    /// </summary>
    /// <returns>List of overdue invoices</returns>
    [HttpGet("overdue")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<IEnumerable<InvoiceDto>>>> GetOverdueInvoices()
    {
        try
        {
            var result = await _invoiceService.GetOverdueInvoicesAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving overdue invoices");
            return StatusCode(500, ApiResponse<IEnumerable<InvoiceDto>>.ErrorResponse("An error occurred while retrieving overdue invoices"));
        }
    }

    /// <summary>
    /// Marks an invoice as paid
    /// </summary>
    /// <param name="id">Invoice ID</param>
    /// <param name="paidDate">Date when payment was completed (optional)</param>
    /// <returns>Result of marking invoice as paid</returns>
    [HttpPost("{id}/mark-paid")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<bool>>> MarkInvoiceAsPaid(int id, [FromQuery] DateTime? paidDate = null)
    {
        try
        {
            var result = await _invoiceService.MarkInvoiceAsPaidAsync(id, paidDate);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking invoice {Id} as paid", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while marking invoice as paid"));
        }
    }

    /// <summary>
    /// Sends invoice reminders for due invoices
    /// </summary>
    /// <returns>Number of reminders sent</returns>
    [HttpPost("send-reminders")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<int>>> SendInvoiceReminders()
    {
        try
        {
            var result = await _invoiceService.SendInvoiceRemindersAsync();
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending invoice reminders");
            return StatusCode(500, ApiResponse<int>.ErrorResponse("An error occurred while sending invoice reminders"));
        }
    }

    /// <summary>
    /// Gets invoice statistics
    /// </summary>
    /// <returns>Invoice statistics including revenue and payment status</returns>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetInvoiceStats()
    {
        try
        {
            var result = await _invoiceService.GetInvoiceStatsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoice statistics");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving invoice statistics"));
        }
    }

    /// <summary>
    /// Exports an invoice as PDF
    /// </summary>
    /// <param name="id">Invoice ID to export</param>
    /// <returns>PDF file of the invoice</returns>
    [HttpGet("{id}/export-pdf")]
    public async Task<IActionResult> ExportInvoicePdf(int id)
    {
        try
        {
            var pdfBytes = await _pdfService.GenerateInvoicePdfAsync(id);
            
            // Get invoice number for filename
            var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
            var filename = $"Invoice_{invoice.Data?.InvoiceNumber ?? id.ToString()}_{DateTime.UtcNow:yyyyMMdd}.pdf";
            
            return File(pdfBytes, "application/pdf", filename);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting invoice {Id} to PDF", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while exporting the invoice to PDF"));
        }
    }
}
