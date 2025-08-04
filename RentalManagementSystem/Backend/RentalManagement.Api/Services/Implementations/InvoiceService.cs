using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of invoice management services
/// </summary>
public class InvoiceService : IInvoiceService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<InvoiceService> _logger;

    public InvoiceService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<InvoiceService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new invoice
    /// </summary>
    public async Task<ApiResponse<InvoiceDto>> CreateInvoiceAsync(CreateInvoiceDto createInvoiceDto)
    {
        try
        {
            // Validate tenant exists
            var tenant = await _context.Tenants
                .Include(t => t.Room)
                .FirstOrDefaultAsync(t => t.Id == createInvoiceDto.TenantId);

            if (tenant == null)
            {
                return ApiResponse<InvoiceDto>.ErrorResponse("Tenant not found");
            }

            if (tenant.Room == null)
            {
                return ApiResponse<InvoiceDto>.ErrorResponse("Tenant must be assigned to a room");
            }

            // Calculate total amount based on room's monthly rent
            var monthlyRent = tenant.Room.MonthlyRent;
            var totalAmount = monthlyRent + createInvoiceDto.AdditionalCharges - createInvoiceDto.Discount;

            var invoice = new Invoice
            {
                TenantId = createInvoiceDto.TenantId,
                RoomId = createInvoiceDto.RoomId,
                InvoiceNumber = await GenerateInvoiceNumberAsync(),
                MonthlyRent = monthlyRent,
                AdditionalCharges = createInvoiceDto.AdditionalCharges,
                Discount = createInvoiceDto.Discount,
                TotalAmount = totalAmount,
                RemainingBalance = totalAmount,
                BillingPeriod = createInvoiceDto.BillingPeriod,
                IssueDate = DateTime.UtcNow,
                DueDate = createInvoiceDto.DueDate,
                Status = InvoiceStatus.Issued,
                AdditionalChargesDescription = createInvoiceDto.AdditionalChargesDescription,
                Notes = createInvoiceDto.Notes
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            var invoiceDto = _mapper.Map<InvoiceDto>(invoice);
            
            _logger.LogInformation("Created invoice {InvoiceNumber} for tenant {TenantId}", 
                invoice.InvoiceNumber, tenant.Id);

            return ApiResponse<InvoiceDto>.SuccessResponse(invoiceDto, "Invoice created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice for tenant {TenantId}", createInvoiceDto.TenantId);
            return ApiResponse<InvoiceDto>.ErrorResponse("An error occurred while creating the invoice");
        }
    }

    /// <summary>
    /// Gets an invoice by its ID
    /// </summary>
    public async Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(int id)
    {
        try
        {
            var invoice = await _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.Room)
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null)
            {
                return ApiResponse<InvoiceDto>.ErrorResponse("Invoice not found");
            }

            var invoiceDto = _mapper.Map<InvoiceDto>(invoice);
            return ApiResponse<InvoiceDto>.SuccessResponse(invoiceDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoice {InvoiceId}", id);
            return ApiResponse<InvoiceDto>.ErrorResponse("An error occurred while retrieving the invoice");
        }
    }

    /// <summary>
    /// Gets all invoices with optional search and filtering
    /// </summary>
    public async Task<ApiResponse<PagedResponse<InvoiceDto>>> GetInvoicesAsync(InvoiceSearchDto searchDto)
    {
        try
        {
            var query = _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.Room)
                .Include(i => i.Payments)
                .AsQueryable();

            // Apply filters
            if (searchDto.TenantId.HasValue)
            {
                query = query.Where(i => i.TenantId == searchDto.TenantId.Value);
            }

            if (searchDto.Status.HasValue)
            {
                query = query.Where(i => i.Status == searchDto.Status.Value);
            }

            if (searchDto.RoomId.HasValue)
            {
                query = query.Where(i => i.RoomId == searchDto.RoomId.Value);
            }

            if (searchDto.BillingPeriod.HasValue)
            {
                var billingMonth = new DateTime(searchDto.BillingPeriod.Value.Year, searchDto.BillingPeriod.Value.Month, 1);
                query = query.Where(i => i.BillingPeriod.Year == billingMonth.Year && i.BillingPeriod.Month == billingMonth.Month);
            }

            if (searchDto.DueDateFrom.HasValue)
            {
                query = query.Where(i => i.DueDate >= searchDto.DueDateFrom.Value);
            }

            if (searchDto.DueDateTo.HasValue)
            {
                query = query.Where(i => i.DueDate <= searchDto.DueDateTo.Value);
            }

            if (!string.IsNullOrEmpty(searchDto.SearchTerm))
            {
                query = query.Where(i => i.InvoiceNumber.Contains(searchDto.SearchTerm) ||
                                       i.Tenant.FullName.Contains(searchDto.SearchTerm) ||
                                       i.Room.RoomNumber.Contains(searchDto.SearchTerm));
            }

            if (searchDto.IsOverdue.HasValue && searchDto.IsOverdue.Value)
            {
                query = query.Where(i => i.Status != InvoiceStatus.Paid && i.DueDate < DateTime.UtcNow);
            }

            // Apply sorting
            var isDescending = searchDto.SortDirection?.ToLower() == "desc";
            query = searchDto.SortBy?.ToLower() switch
            {
                "invoicenumber" => isDescending ? query.OrderByDescending(i => i.InvoiceNumber) : query.OrderBy(i => i.InvoiceNumber),
                "totalamount" => isDescending ? query.OrderByDescending(i => i.TotalAmount) : query.OrderBy(i => i.TotalAmount),
                "duedate" => isDescending ? query.OrderByDescending(i => i.DueDate) : query.OrderBy(i => i.DueDate),
                "status" => isDescending ? query.OrderByDescending(i => i.Status) : query.OrderBy(i => i.Status),
                "issuedate" => isDescending ? query.OrderByDescending(i => i.IssueDate) : query.OrderBy(i => i.IssueDate),
                _ => query.OrderByDescending(i => i.IssueDate)
            };

            var totalCount = await query.CountAsync();
            var invoices = await query
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);

            var pagedResponse = PagedResponse<InvoiceDto>.Create(
                invoiceDtos,
                searchDto.Page,
                searchDto.PageSize,
                totalCount
            );

            return ApiResponse<PagedResponse<InvoiceDto>>.SuccessResponse(pagedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoices");
            return ApiResponse<PagedResponse<InvoiceDto>>.ErrorResponse("An error occurred while retrieving invoices");
        }
    }

    /// <summary>
    /// Updates an existing invoice
    /// </summary>
    public async Task<ApiResponse<InvoiceDto>> UpdateInvoiceAsync(int id, UpdateInvoiceDto updateInvoiceDto)
    {
        try
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null)
            {
                return ApiResponse<InvoiceDto>.ErrorResponse("Invoice not found");
            }

            // Don't allow updates to paid invoices
            if (invoice.Status == InvoiceStatus.Paid)
            {
                return ApiResponse<InvoiceDto>.ErrorResponse("Cannot update a paid invoice");
            }

            // Update properties if provided
            if (updateInvoiceDto.AdditionalCharges.HasValue)
                invoice.AdditionalCharges = updateInvoiceDto.AdditionalCharges.Value;

            if (updateInvoiceDto.Discount.HasValue)
                invoice.Discount = updateInvoiceDto.Discount.Value;

            if (updateInvoiceDto.DueDate.HasValue)
                invoice.DueDate = updateInvoiceDto.DueDate.Value;

            if (updateInvoiceDto.Status.HasValue)
                invoice.Status = updateInvoiceDto.Status.Value;

            if (!string.IsNullOrEmpty(updateInvoiceDto.AdditionalChargesDescription))
                invoice.AdditionalChargesDescription = updateInvoiceDto.AdditionalChargesDescription;

            if (!string.IsNullOrEmpty(updateInvoiceDto.Notes))
                invoice.Notes = updateInvoiceDto.Notes;

            // Recalculate total amount
            invoice.TotalAmount = invoice.MonthlyRent + invoice.AdditionalCharges - invoice.Discount;
            invoice.RemainingBalance = invoice.TotalAmount - invoice.PaidAmount;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var invoiceDto = _mapper.Map<InvoiceDto>(invoice);
            
            _logger.LogInformation("Updated invoice {InvoiceId}", id);
            return ApiResponse<InvoiceDto>.SuccessResponse(invoiceDto, "Invoice updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating invoice {InvoiceId}", id);
            return ApiResponse<InvoiceDto>.ErrorResponse("An error occurred while updating the invoice");
        }
    }

    /// <summary>
    /// Deletes an invoice
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteInvoiceAsync(int id)
    {
        try
        {
            var invoice = await _context.Invoices
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null)
            {
                return ApiResponse<bool>.ErrorResponse("Invoice not found");
            }

            // Don't allow deletion if there are payments
            if (invoice.Payments.Any())
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete invoice with existing payments");
            }

            _context.Invoices.Remove(invoice);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted invoice {InvoiceId}", id);
            return ApiResponse<bool>.SuccessResponse(true, "Invoice deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting invoice {InvoiceId}", id);
            return ApiResponse<bool>.ErrorResponse("An error occurred while deleting the invoice");
        }
    }

    /// <summary>
    /// Generates monthly invoices for all active tenants
    /// </summary>
    public async Task<ApiResponse<int>> GenerateMonthlyInvoicesAsync(DateTime billingPeriod)
    {
        try
        {
            var activeTenantsWithRooms = await _context.Tenants
                .Include(t => t.Room)
                .Where(t => t.IsActive && t.RoomId.HasValue)
                .ToListAsync();

            var generatedCount = 0;
            var billingMonth = new DateTime(billingPeriod.Year, billingPeriod.Month, 1);

            foreach (var tenant in activeTenantsWithRooms)
            {
                // Check if invoice already exists for this billing period
                var existingInvoice = await _context.Invoices
                    .AnyAsync(i => i.TenantId == tenant.Id && 
                                  i.BillingPeriod.Year == billingMonth.Year && 
                                  i.BillingPeriod.Month == billingMonth.Month);

                if (!existingInvoice && tenant.Room != null)
                {
                    var invoice = new Invoice
                    {
                        TenantId = tenant.Id,
                        RoomId = tenant.RoomId!.Value,
                        InvoiceNumber = await GenerateInvoiceNumberAsync(),
                        MonthlyRent = tenant.Room.MonthlyRent,
                        AdditionalCharges = 0,
                        Discount = 0,
                        TotalAmount = tenant.Room.MonthlyRent,
                        RemainingBalance = tenant.Room.MonthlyRent,
                        BillingPeriod = billingMonth,
                        IssueDate = DateTime.UtcNow,
                        DueDate = DateTime.UtcNow.AddDays(15),
                        Status = InvoiceStatus.Issued,
                        Notes = $"Monthly rent for {billingMonth:MMMM yyyy}"
                    };

                    _context.Invoices.Add(invoice);
                    generatedCount++;
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Generated {Count} invoices for billing period {BillingPeriod}", 
                generatedCount, billingMonth.ToString("MMMM yyyy"));

            return ApiResponse<int>.SuccessResponse(generatedCount, $"Generated {generatedCount} invoices successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating monthly invoices for {BillingPeriod}", billingPeriod);
            return ApiResponse<int>.ErrorResponse("An error occurred while generating monthly invoices");
        }
    }

    /// <summary>
    /// Gets invoices by tenant ID
    /// </summary>
    public async Task<ApiResponse<IEnumerable<InvoiceDto>>> GetInvoicesByTenantAsync(int tenantId)
    {
        try
        {
            var invoices = await _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.Room)
                .Include(i => i.Payments)
                .Where(i => i.TenantId == tenantId)
                .OrderByDescending(i => i.IssueDate)
                .ToListAsync();

            var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);
            return ApiResponse<IEnumerable<InvoiceDto>>.SuccessResponse(invoiceDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoices for tenant {TenantId}", tenantId);
            return ApiResponse<IEnumerable<InvoiceDto>>.ErrorResponse("An error occurred while retrieving tenant invoices");
        }
    }

    /// <summary>
    /// Gets overdue invoices
    /// </summary>
    public async Task<ApiResponse<IEnumerable<InvoiceDto>>> GetOverdueInvoicesAsync()
    {
        try
        {
            var overdueInvoices = await _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.Room)
                .Include(i => i.Payments)
                .Where(i => i.Status != InvoiceStatus.Paid && i.DueDate < DateTime.UtcNow)
                .OrderBy(i => i.DueDate)
                .ToListAsync();

            var invoiceDtos = _mapper.Map<List<InvoiceDto>>(overdueInvoices);
            return ApiResponse<IEnumerable<InvoiceDto>>.SuccessResponse(invoiceDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving overdue invoices");
            return ApiResponse<IEnumerable<InvoiceDto>>.ErrorResponse("An error occurred while retrieving overdue invoices");
        }
    }

    /// <summary>
    /// Marks an invoice as paid
    /// </summary>
    public async Task<ApiResponse<bool>> MarkInvoiceAsPaidAsync(int id, DateTime? paidDate = null)
    {
        try
        {
            var invoice = await _context.Invoices.FindAsync(id);
            if (invoice == null)
            {
                return ApiResponse<bool>.ErrorResponse("Invoice not found");
            }

            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidAmount = invoice.TotalAmount;
            invoice.RemainingBalance = 0;
            invoice.PaidDate = paidDate ?? DateTime.UtcNow;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Marked invoice {InvoiceId} as paid", id);
            return ApiResponse<bool>.SuccessResponse(true, "Invoice marked as paid successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking invoice {InvoiceId} as paid", id);
            return ApiResponse<bool>.ErrorResponse("An error occurred while updating the invoice");
        }
    }

    /// <summary>
    /// Gets invoice statistics
    /// </summary>
    public async Task<ApiResponse<object>> GetInvoiceStatsAsync()
    {
        try
        {
            var currentMonth = DateTime.UtcNow.Date.AddDays(1 - DateTime.UtcNow.Day);
            var lastMonth = currentMonth.AddMonths(-1);

            var stats = new
            {
                TotalInvoices = await _context.Invoices.CountAsync(),
                PaidInvoices = await _context.Invoices.CountAsync(i => i.Status == InvoiceStatus.Paid),
                OverdueInvoices = await _context.Invoices.CountAsync(i => i.Status != InvoiceStatus.Paid && i.DueDate < DateTime.UtcNow),
                TotalRevenue = await _context.Invoices.Where(i => i.Status == InvoiceStatus.Paid).SumAsync(i => i.TotalAmount),
                CurrentMonthRevenue = await _context.Invoices
                    .Where(i => i.Status == InvoiceStatus.Paid && i.PaidDate >= currentMonth)
                    .SumAsync(i => i.TotalAmount),
                LastMonthRevenue = await _context.Invoices
                    .Where(i => i.Status == InvoiceStatus.Paid && i.PaidDate >= lastMonth && i.PaidDate < currentMonth)
                    .SumAsync(i => i.TotalAmount),
                OutstandingAmount = await _context.Invoices
                    .Where(i => i.Status != InvoiceStatus.Paid)
                    .SumAsync(i => i.RemainingBalance)
            };

            return ApiResponse<object>.SuccessResponse(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invoice statistics");
            return ApiResponse<object>.ErrorResponse("An error occurred while retrieving invoice statistics");
        }
    }

    /// <summary>
    /// Sends email reminders for due invoices
    /// </summary>
    public async Task<ApiResponse<int>> SendInvoiceRemindersAsync()
    {
        try
        {
            // Get invoices due in the next 3 days or overdue
            var reminderDate = DateTime.UtcNow.AddDays(3);
            var invoicesNeedingReminders = await _context.Invoices
                .Include(i => i.Tenant)
                .Where(i => i.Status != InvoiceStatus.Paid && i.DueDate <= reminderDate)
                .ToListAsync();

            var remindersSent = 0;

            foreach (var invoice in invoicesNeedingReminders)
            {
                // TODO: Implement email sending logic here
                // For now, just log the reminder
                _logger.LogInformation("Reminder needed for invoice {InvoiceNumber} for tenant {TenantEmail}", 
                    invoice.InvoiceNumber, invoice.Tenant.Email);
                
                remindersSent++;
            }

            _logger.LogInformation("Processed {Count} invoice reminders", remindersSent);
            return ApiResponse<int>.SuccessResponse(remindersSent, $"Processed {remindersSent} invoice reminders");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending invoice reminders");
            return ApiResponse<int>.ErrorResponse("An error occurred while sending invoice reminders");
        }
    }

    /// <summary>
    /// Generates a unique invoice number
    /// </summary>
    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var month = DateTime.UtcNow.Month;
        
        var count = await _context.Invoices
            .CountAsync(i => i.IssueDate.Year == year && i.IssueDate.Month == month);
        
        return $"INV-{year}{month:D2}-{(count + 1):D4}";
    }
}
