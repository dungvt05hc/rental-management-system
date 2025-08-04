using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of payment management services
/// </summary>
public class PaymentService : IPaymentService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<PaymentService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new payment
    /// </summary>
    public async Task<ApiResponse<PaymentDto>> CreatePaymentAsync(CreatePaymentDto createPaymentDto, string? userId = null)
    {
        try
        {
            // Validate invoice exists
            var invoice = await _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.Room)
                .FirstOrDefaultAsync(i => i.Id == createPaymentDto.InvoiceId);

            if (invoice == null)
            {
                return ApiResponse<PaymentDto>.ErrorResponse("Invoice not found");
            }

            // Validate payment amount doesn't exceed remaining balance
            if (createPaymentDto.Amount > invoice.RemainingBalance)
            {
                return ApiResponse<PaymentDto>.ErrorResponse("Payment amount cannot exceed remaining balance");
            }

            var payment = new Payment
            {
                InvoiceId = createPaymentDto.InvoiceId,
                Amount = createPaymentDto.Amount,
                Method = createPaymentDto.Method,
                ReferenceNumber = createPaymentDto.ReferenceNumber,
                PaymentDate = createPaymentDto.PaymentDate,
                Notes = createPaymentDto.Notes,
                IsVerified = false,
                RecordedByUserId = userId
            };

            _context.Payments.Add(payment);

            // Update invoice payment tracking
            invoice.PaidAmount += createPaymentDto.Amount;
            invoice.RemainingBalance = invoice.TotalAmount - invoice.PaidAmount;

            // Update invoice status if fully paid
            if (invoice.RemainingBalance <= 0)
            {
                invoice.Status = InvoiceStatus.Paid;
                invoice.PaidDate = createPaymentDto.PaymentDate;
            }
            else if (invoice.PaidAmount > 0)
            {
                invoice.Status = InvoiceStatus.PartiallyPaid;
            }

            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var paymentDto = _mapper.Map<PaymentDto>(payment);
            
            _logger.LogInformation("Created payment {PaymentId} for invoice {InvoiceId} - Amount: {Amount}", 
                payment.Id, invoice.Id, payment.Amount);

            return ApiResponse<PaymentDto>.SuccessResponse(paymentDto, "Payment created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment for invoice {InvoiceId}", createPaymentDto.InvoiceId);
            return ApiResponse<PaymentDto>.ErrorResponse("An error occurred while creating the payment");
        }
    }

    /// <summary>
    /// Gets a payment by its ID
    /// </summary>
    public async Task<ApiResponse<PaymentDto>> GetPaymentByIdAsync(int id)
    {
        try
        {
            var payment = await _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Tenant)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Room)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
            {
                return ApiResponse<PaymentDto>.ErrorResponse("Payment not found");
            }

            var paymentDto = _mapper.Map<PaymentDto>(payment);
            return ApiResponse<PaymentDto>.SuccessResponse(paymentDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payment {PaymentId}", id);
            return ApiResponse<PaymentDto>.ErrorResponse("An error occurred while retrieving the payment");
        }
    }

    /// <summary>
    /// Gets all payments with optional filtering
    /// </summary>
    public async Task<ApiResponse<PagedResponse<PaymentDto>>> GetPaymentsAsync(int? invoiceId = null, int page = 1, int pageSize = 10)
    {
        try
        {
            var query = _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Tenant)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Room)
                .AsQueryable();

            // Apply invoice filter if specified
            if (invoiceId.HasValue)
            {
                query = query.Where(p => p.InvoiceId == invoiceId.Value);
            }

            // Order by payment date descending
            query = query.OrderByDescending(p => p.PaymentDate);

            var totalCount = await query.CountAsync();
            var payments = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var paymentDtos = _mapper.Map<List<PaymentDto>>(payments);

            var pagedResponse = PagedResponse<PaymentDto>.Create(
                paymentDtos,
                page,
                pageSize,
                totalCount
            );

            return ApiResponse<PagedResponse<PaymentDto>>.SuccessResponse(pagedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payments");
            return ApiResponse<PagedResponse<PaymentDto>>.ErrorResponse("An error occurred while retrieving payments");
        }
    }

    /// <summary>
    /// Gets payments by invoice ID
    /// </summary>
    public async Task<ApiResponse<IEnumerable<PaymentDto>>> GetPaymentsByInvoiceAsync(int invoiceId)
    {
        try
        {
            var payments = await _context.Payments
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Tenant)
                .Include(p => p.Invoice)
                    .ThenInclude(i => i.Room)
                .Where(p => p.InvoiceId == invoiceId)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            var paymentDtos = _mapper.Map<List<PaymentDto>>(payments);
            return ApiResponse<IEnumerable<PaymentDto>>.SuccessResponse(paymentDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payments for invoice {InvoiceId}", invoiceId);
            return ApiResponse<IEnumerable<PaymentDto>>.ErrorResponse("An error occurred while retrieving invoice payments");
        }
    }

    /// <summary>
    /// Updates an existing payment
    /// </summary>
    public async Task<ApiResponse<PaymentDto>> UpdatePaymentAsync(int id, CreatePaymentDto createPaymentDto)
    {
        try
        {
            var payment = await _context.Payments
                .Include(p => p.Invoice)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
            {
                return ApiResponse<PaymentDto>.ErrorResponse("Payment not found");
            }

            // Don't allow updates to verified payments
            if (payment.IsVerified)
            {
                return ApiResponse<PaymentDto>.ErrorResponse("Cannot update a verified payment");
            }

            var invoice = payment.Invoice;
            var oldAmount = payment.Amount;

            // Validate new payment amount
            var remainingAfterReversal = invoice.RemainingBalance + oldAmount;
            if (createPaymentDto.Amount > remainingAfterReversal)
            {
                return ApiResponse<PaymentDto>.ErrorResponse("Updated payment amount exceeds available balance");
            }

            // Update payment properties
            payment.Amount = createPaymentDto.Amount;
            payment.Method = createPaymentDto.Method;
            payment.ReferenceNumber = createPaymentDto.ReferenceNumber;
            payment.PaymentDate = createPaymentDto.PaymentDate;
            payment.Notes = createPaymentDto.Notes;
            payment.UpdatedAt = DateTime.UtcNow;

            // Update invoice payment tracking
            var amountDifference = createPaymentDto.Amount - oldAmount;
            invoice.PaidAmount += amountDifference;
            invoice.RemainingBalance = invoice.TotalAmount - invoice.PaidAmount;

            // Update invoice status
            if (invoice.RemainingBalance <= 0)
            {
                invoice.Status = InvoiceStatus.Paid;
                invoice.PaidDate = createPaymentDto.PaymentDate;
            }
            else if (invoice.PaidAmount > 0)
            {
                invoice.Status = InvoiceStatus.PartiallyPaid;
            }
            else
            {
                invoice.Status = InvoiceStatus.Issued;
                invoice.PaidDate = null;
            }

            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var paymentDto = _mapper.Map<PaymentDto>(payment);
            
            _logger.LogInformation("Updated payment {PaymentId} - Amount changed from {OldAmount} to {NewAmount}", 
                payment.Id, oldAmount, payment.Amount);

            return ApiResponse<PaymentDto>.SuccessResponse(paymentDto, "Payment updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating payment {PaymentId}", id);
            return ApiResponse<PaymentDto>.ErrorResponse("An error occurred while updating the payment");
        }
    }

    /// <summary>
    /// Deletes a payment
    /// </summary>
    public async Task<ApiResponse<bool>> DeletePaymentAsync(int id)
    {
        try
        {
            var payment = await _context.Payments
                .Include(p => p.Invoice)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
            {
                return ApiResponse<bool>.ErrorResponse("Payment not found");
            }

            // Don't allow deletion of verified payments
            if (payment.IsVerified)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete a verified payment");
            }

            var invoice = payment.Invoice;

            // Reverse the payment from invoice
            invoice.PaidAmount -= payment.Amount;
            invoice.RemainingBalance = invoice.TotalAmount - invoice.PaidAmount;

            // Update invoice status
            if (invoice.PaidAmount <= 0)
            {
                invoice.Status = InvoiceStatus.Issued;
                invoice.PaidDate = null;
            }
            else if (invoice.RemainingBalance > 0)
            {
                invoice.Status = InvoiceStatus.PartiallyPaid;
                invoice.PaidDate = null;
            }

            invoice.UpdatedAt = DateTime.UtcNow;

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted payment {PaymentId} - Reversed amount: {Amount}", 
                payment.Id, payment.Amount);

            return ApiResponse<bool>.SuccessResponse(true, "Payment deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting payment {PaymentId}", id);
            return ApiResponse<bool>.ErrorResponse("An error occurred while deleting the payment");
        }
    }

    /// <summary>
    /// Verifies a payment
    /// </summary>
    public async Task<ApiResponse<bool>> VerifyPaymentAsync(int id, bool isVerified = true)
    {
        try
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null)
            {
                return ApiResponse<bool>.ErrorResponse("Payment not found");
            }

            payment.IsVerified = isVerified;
            payment.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var status = isVerified ? "verified" : "unverified";
            _logger.LogInformation("Payment {PaymentId} marked as {Status}", id, status);

            return ApiResponse<bool>.SuccessResponse(true, $"Payment {status} successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying payment {PaymentId}", id);
            return ApiResponse<bool>.ErrorResponse("An error occurred while verifying the payment");
        }
    }

    /// <summary>
    /// Gets payment statistics
    /// </summary>
    public async Task<ApiResponse<object>> GetPaymentStatsAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var query = _context.Payments.AsQueryable();

            // Apply date filters
            if (fromDate.HasValue)
            {
                query = query.Where(p => p.PaymentDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(p => p.PaymentDate <= toDate.Value);
            }

            var currentMonth = DateTime.UtcNow.Date.AddDays(1 - DateTime.UtcNow.Day);
            var lastMonth = currentMonth.AddMonths(-1);

            var stats = new
            {
                TotalPayments = await query.CountAsync(),
                TotalAmount = await query.SumAsync(p => p.Amount),
                VerifiedPayments = await query.CountAsync(p => p.IsVerified),
                UnverifiedPayments = await query.CountAsync(p => !p.IsVerified),
                CurrentMonthPayments = await _context.Payments
                    .CountAsync(p => p.PaymentDate >= currentMonth),
                CurrentMonthAmount = await _context.Payments
                    .Where(p => p.PaymentDate >= currentMonth)
                    .SumAsync(p => p.Amount),
                LastMonthPayments = await _context.Payments
                    .CountAsync(p => p.PaymentDate >= lastMonth && p.PaymentDate < currentMonth),
                LastMonthAmount = await _context.Payments
                    .Where(p => p.PaymentDate >= lastMonth && p.PaymentDate < currentMonth)
                    .SumAsync(p => p.Amount),
                PaymentMethodBreakdown = await _context.Payments
                    .Where(p => fromDate == null || p.PaymentDate >= fromDate)
                    .Where(p => toDate == null || p.PaymentDate <= toDate)
                    .GroupBy(p => p.Method)
                    .Select(g => new { Method = g.Key.ToString(), Count = g.Count(), Amount = g.Sum(p => p.Amount) })
                    .ToListAsync()
            };

            return ApiResponse<object>.SuccessResponse(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payment statistics");
            return ApiResponse<object>.ErrorResponse("An error occurred while retrieving payment statistics");
        }
    }

    /// <summary>
    /// Gets monthly payment summary
    /// </summary>
    public async Task<ApiResponse<object>> GetMonthlyPaymentSummaryAsync(int year)
    {
        try
        {
            var startDate = new DateTime(year, 1, 1);
            var endDate = new DateTime(year + 1, 1, 1);

            var monthlyData = await _context.Payments
                .Where(p => p.PaymentDate >= startDate && p.PaymentDate < endDate)
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Count = g.Count(),
                    Amount = g.Sum(p => p.Amount),
                    VerifiedCount = g.Count(p => p.IsVerified),
                    UnverifiedCount = g.Count(p => !p.IsVerified)
                })
                .OrderBy(m => m.Month)
                .ToListAsync();

            var summary = new
            {
                Year = year,
                MonthlyBreakdown = monthlyData,
                YearlyTotals = new
                {
                    TotalPayments = monthlyData.Sum(m => m.Count),
                    TotalAmount = monthlyData.Sum(m => m.Amount),
                    TotalVerified = monthlyData.Sum(m => m.VerifiedCount),
                    TotalUnverified = monthlyData.Sum(m => m.UnverifiedCount)
                }
            };

            return ApiResponse<object>.SuccessResponse(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving monthly payment summary for year {Year}", year);
            return ApiResponse<object>.ErrorResponse("An error occurred while retrieving monthly payment summary");
        }
    }
}
