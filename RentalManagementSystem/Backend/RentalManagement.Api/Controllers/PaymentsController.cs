using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for payment management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    /// <summary>
    /// Gets all payments with optional filtering
    /// </summary>
    /// <param name="invoiceId">Optional invoice ID filter</param>
    /// <param name="page">Page number</param>
    /// <param name="pageSize">Page size</param>
    /// <returns>Paginated list of payments</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<PaymentDto>>>> GetPayments(
        [FromQuery] int? invoiceId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _paymentService.GetPaymentsAsync(invoiceId, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Gets a payment by its ID
    /// </summary>
    /// <param name="id">Payment ID</param>
    /// <returns>Payment information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> GetPayment(int id)
    {
        var result = await _paymentService.GetPaymentByIdAsync(id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates a new payment
    /// </summary>
    /// <param name="createPaymentDto">Payment creation details</param>
    /// <returns>Created payment information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> CreatePayment([FromBody] CreatePaymentDto createPaymentDto)
    {
        var userId = User.FindFirst("id")?.Value;
        var result = await _paymentService.CreatePaymentAsync(createPaymentDto, userId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetPayment), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Updates an existing payment
    /// </summary>
    /// <param name="id">Payment ID to update</param>
    /// <param name="createPaymentDto">Updated payment information</param>
    /// <returns>Updated payment information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> UpdatePayment(int id, [FromBody] CreatePaymentDto createPaymentDto)
    {
        var result = await _paymentService.UpdatePaymentAsync(id, createPaymentDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Deletes a payment
    /// </summary>
    /// <param name="id">Payment ID to delete</param>
    /// <returns>Deletion result</returns>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeletePayment(int id)
    {
        var result = await _paymentService.DeletePaymentAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets payments by invoice ID
    /// </summary>
    /// <param name="invoiceId">Invoice ID</param>
    /// <returns>List of payments for the invoice</returns>
    [HttpGet("invoice/{invoiceId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<PaymentDto>>>> GetPaymentsByInvoice(int invoiceId)
    {
        var result = await _paymentService.GetPaymentsByInvoiceAsync(invoiceId);
        return Ok(result);
    }

    /// <summary>
    /// Verifies a payment
    /// </summary>
    /// <param name="id">Payment ID</param>
    /// <param name="isVerified">Verification status</param>
    /// <returns>Verification result</returns>
    [HttpPost("{id}/verify")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<bool>>> VerifyPayment(int id, [FromQuery] bool isVerified = true)
    {
        var result = await _paymentService.VerifyPaymentAsync(id, isVerified);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets payment statistics
    /// </summary>
    /// <param name="fromDate">Start date for statistics</param>
    /// <param name="toDate">End date for statistics</param>
    /// <returns>Payment statistics</returns>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetPaymentStats(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var result = await _paymentService.GetPaymentStatsAsync(fromDate, toDate);
        return Ok(result);
    }

    /// <summary>
    /// Gets monthly payment summary
    /// </summary>
    /// <param name="year">Year to get summary for</param>
    /// <returns>Monthly payment summary for the year</returns>
    [HttpGet("monthly-summary/{year}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetMonthlyPaymentSummary(int year)
    {
        var result = await _paymentService.GetMonthlyPaymentSummaryAsync(year);
        return Ok(result);
    }
}
