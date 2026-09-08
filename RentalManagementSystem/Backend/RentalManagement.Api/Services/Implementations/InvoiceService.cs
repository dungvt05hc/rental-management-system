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

        // Get monthly rent from the room
        var monthlyRent = tenant.Room.MonthlyRent;
        var tenantId = tenant.Id;

        // The three writes below must land together: a failure between them would
        // otherwise leave an invoice with no line items, or a total that does not
        // match the items that were written.
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            // A retried attempt must not re-send entities left tracked by the
            // attempt that failed, so start each attempt from a clean tracker.
            _context.ChangeTracker.Clear();

            await using var transaction = await _context.Database.BeginTransactionAsync();

            // Initialize total amount (will be recalculated from line items if they exist)
            var totalAmount = monthlyRent + createInvoiceDto.AdditionalCharges - createInvoiceDto.Discount;

            var invoice = new Invoice
            {
                TenantId = createInvoiceDto.TenantId,
                RoomId = createInvoiceDto.RoomId,
                InvoiceNumber = await GenerateInvoiceNumberAsync(),
                MonthlyRent = monthlyRent,
                AdditionalCharges = createInvoiceDto.AdditionalCharges,
                Discount = createInvoiceDto.Discount,
                TotalAmount = totalAmount, // Will be recalculated if line items exist
                RemainingBalance = totalAmount,
                BillingPeriod = NormalizeToUtc(createInvoiceDto.BillingPeriod),
                IssueDate = DateTime.UtcNow,
                DueDate = NormalizeToUtc(createInvoiceDto.DueDate),
                Status = InvoiceStatus.Issued,
                AdditionalChargesDescription = createInvoiceDto.AdditionalChargesDescription,
                Notes = createInvoiceDto.Notes
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            // Add invoice items if provided and recalculate total from line items
            if (createInvoiceDto.InvoiceItems != null && createInvoiceDto.InvoiceItems.Any())
            {
                decimal lineItemsTotal = 0m;

                foreach (var itemDto in createInvoiceDto.InvoiceItems)
                {
                    var invoiceItem = _mapper.Map<InvoiceItem>(itemDto);
                    invoiceItem.InvoiceId = invoice.Id;

                    // Calculate totals for the invoice item
                    invoiceItem.CalculateTotals();

                    _context.InvoiceItems.Add(invoiceItem);

                    // Sum up the line item totals
                    lineItemsTotal += invoiceItem.LineTotalWithTax;
                }

                await _context.SaveChangesAsync();

                // Recalculate the invoice total from the line items, which replace the
                // room rent as the basis. The invoice-level charges and discount still
                // apply on top — same expression as UpdateInvoiceAsync, and the same one
                // the invoice form previews to the user before they submit.
                invoice.TotalAmount = lineItemsTotal + createInvoiceDto.AdditionalCharges - createInvoiceDto.Discount;
                invoice.RemainingBalance = invoice.TotalAmount;
                await _context.SaveChangesAsync();

                // Reload invoice with items to include in response
                await _context.Entry(invoice).Collection(i => i.InvoiceItems).LoadAsync();
            }

            await transaction.CommitAsync();

            var invoiceDto = _mapper.Map<InvoiceDto>(invoice);

            _logger.LogInformation("Created invoice {InvoiceNumber} for tenant {TenantId} with total amount {TotalAmount}",
                invoice.InvoiceNumber, tenantId, invoice.TotalAmount);

            return ApiResponse<InvoiceDto>.SuccessResponse(invoiceDto, "Invoice created successfully");
        });
    }

    /// <summary>
    /// Gets an invoice by its ID
    /// </summary>
    public async Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(int id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Tenant)
            .Include(i => i.Room)
            .Include(i => i.Payments)
            .Include(i => i.InvoiceItems)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null)
        {
            return ApiResponse<InvoiceDto>.ErrorResponse("Invoice not found");
        }

        var invoiceDto = _mapper.Map<InvoiceDto>(invoice);
        return ApiResponse<InvoiceDto>.SuccessResponse(invoiceDto);
    }

    /// <summary>
    /// Gets all invoices with optional search and filtering
    /// </summary>
    public async Task<ApiResponse<PagedResponse<InvoiceDto>>> GetInvoicesAsync(InvoiceSearchDto searchDto)
    {
        var query = _context.Invoices
            .Include(i => i.Tenant)
            .Include(i => i.Room)
            .Include(i => i.Payments)
            .Include(i => i.InvoiceItems)
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

        var (page, pageSize) = PaginationLimits.Normalize(searchDto.Page, searchDto.PageSize);

        var totalCount = await query.CountAsync();
        var invoices = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);

        var pagedResponse = PagedResponse<InvoiceDto>.Create(
            invoiceDtos,
            page,
            pageSize,
            totalCount
        );

        return ApiResponse<PagedResponse<InvoiceDto>>.SuccessResponse(pagedResponse);
    }

    /// <summary>
    /// Updates an existing invoice
    /// </summary>
    public async Task<ApiResponse<InvoiceDto>> UpdateInvoiceAsync(int id, UpdateInvoiceDto updateInvoiceDto)
    {
        var invoice = await _context.Invoices
            .Include(i => i.InvoiceItems)
            .FirstOrDefaultAsync(i => i.Id == id);

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
            invoice.DueDate = NormalizeToUtc(updateInvoiceDto.DueDate.Value);

        if (updateInvoiceDto.Status.HasValue)
            invoice.Status = updateInvoiceDto.Status.Value;

        // Allow updating these fields even if they are empty strings (to clear them)
        if (updateInvoiceDto.AdditionalChargesDescription != null)
            invoice.AdditionalChargesDescription = updateInvoiceDto.AdditionalChargesDescription;

        if (updateInvoiceDto.Notes != null)
            invoice.Notes = updateInvoiceDto.Notes;

        // Handle invoice items update if provided
        if (updateInvoiceDto.InvoiceItems != null)
        {
            // Remove all existing invoice items
            if (invoice.InvoiceItems != null && invoice.InvoiceItems.Any())
            {
                _context.InvoiceItems.RemoveRange(invoice.InvoiceItems);
            }

            // Add new invoice items
            decimal lineItemsTotal = 0m;
            foreach (var itemDto in updateInvoiceDto.InvoiceItems)
            {
                var invoiceItem = _mapper.Map<InvoiceItem>(itemDto);
                invoiceItem.InvoiceId = invoice.Id;

                // Calculate totals for the invoice item
                invoiceItem.CalculateTotals();

                _context.InvoiceItems.Add(invoiceItem);

                // Sum up the line item totals
                lineItemsTotal += invoiceItem.LineTotalWithTax;
            }

            // Recalculate invoice total from line items
            invoice.TotalAmount = lineItemsTotal + invoice.AdditionalCharges - invoice.Discount;
        }
        else
        {
            // Recalculate total amount from existing line items if they exist
            if (invoice.InvoiceItems != null && invoice.InvoiceItems.Any())
            {
                decimal lineItemsTotal = invoice.InvoiceItems.Sum(item => item.LineTotalWithTax);
                invoice.TotalAmount = lineItemsTotal + invoice.AdditionalCharges - invoice.Discount;
            }
            else
            {
                invoice.TotalAmount = invoice.MonthlyRent + invoice.AdditionalCharges - invoice.Discount;
            }
        }

        invoice.RemainingBalance = invoice.TotalAmount - invoice.PaidAmount;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Reload the invoice with all related data for the response
        await _context.Entry(invoice).Reference(i => i.Tenant).LoadAsync();
        await _context.Entry(invoice).Reference(i => i.Room).LoadAsync();
        await _context.Entry(invoice).Collection(i => i.Payments).LoadAsync();
        await _context.Entry(invoice).Collection(i => i.InvoiceItems).LoadAsync();

        var invoiceDto = _mapper.Map<InvoiceDto>(invoice);

        _logger.LogInformation("Updated invoice {InvoiceId} with total amount {TotalAmount}", id, invoice.TotalAmount);
        return ApiResponse<InvoiceDto>.SuccessResponse(invoiceDto, "Invoice updated successfully");
    }

    /// <summary>
    /// Deletes an invoice
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteInvoiceAsync(int id)
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

    /// <summary>
    /// Generates monthly invoices for all active tenants
    /// </summary>
    public async Task<ApiResponse<int>> GenerateMonthlyInvoicesAsync(DateTime billingPeriod)
    {
        var activeTenantsWithRooms = await _context.Tenants
            .Include(t => t.Room)
            .Where(t => t.IsActive && t.RoomId.HasValue)
            .ToListAsync();

        var billingMonth = NormalizeToUtc(new DateTime(billingPeriod.Year, billingPeriod.Month, 1));

        // A partially generated billing run is worse than none at all, so the whole
        // batch commits or nothing does.
        var strategy = _context.Database.CreateExecutionStrategy();

        var generatedCount = await strategy.ExecuteAsync(async () =>
        {
            _context.ChangeTracker.Clear();

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var count = 0;

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
                        // Drawn per invoice: every row in the batch gets its own number.
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
                    count++;
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return count;
        });

        _logger.LogInformation("Generated {Count} invoices for billing period {BillingPeriod}",
            generatedCount, billingMonth.ToString("MMMM yyyy"));

        return ApiResponse<int>.SuccessResponse(generatedCount, $"Generated {generatedCount} invoices successfully");
    }

    /// <summary>
    /// Gets invoices by tenant ID
    /// </summary>
    public async Task<ApiResponse<IEnumerable<InvoiceDto>>> GetInvoicesByTenantAsync(int tenantId)
    {
        var invoices = await _context.Invoices
            .Include(i => i.Tenant)
            .Include(i => i.Room)
            .Include(i => i.Payments)
            .Include(i => i.InvoiceItems)
            .Where(i => i.TenantId == tenantId)
            .OrderByDescending(i => i.IssueDate)
            .ToListAsync();

        var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);
        return ApiResponse<IEnumerable<InvoiceDto>>.SuccessResponse(invoiceDtos);
    }

    /// <summary>
    /// Gets overdue invoices
    /// </summary>
    public async Task<ApiResponse<IEnumerable<InvoiceDto>>> GetOverdueInvoicesAsync()
    {
        var overdueInvoices = await _context.Invoices
            .Include(i => i.Tenant)
            .Include(i => i.Room)
            .Include(i => i.Payments)
            .Include(i => i.InvoiceItems)
            .Where(i => i.Status != InvoiceStatus.Paid && i.DueDate < DateTime.UtcNow)
            .OrderBy(i => i.DueDate)
            .ToListAsync();

        var invoiceDtos = _mapper.Map<List<InvoiceDto>>(overdueInvoices);
        return ApiResponse<IEnumerable<InvoiceDto>>.SuccessResponse(invoiceDtos);
    }

    /// <summary>
    /// Marks an invoice as paid
    /// </summary>
    public async Task<ApiResponse<bool>> MarkInvoiceAsPaidAsync(int id, DateTime? paidDate = null)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice == null)
        {
            return ApiResponse<bool>.ErrorResponse("Invoice not found");
        }

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAmount = invoice.TotalAmount;
        invoice.RemainingBalance = 0;
        invoice.PaidDate = paidDate.HasValue ? NormalizeToUtc(paidDate.Value) : DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Marked invoice {InvoiceId} as paid", id);
        return ApiResponse<bool>.SuccessResponse(true, "Invoice marked as paid successfully");
    }

    /// <summary>
    /// Gets invoice statistics
    /// </summary>
    public async Task<ApiResponse<object>> GetInvoiceStatsAsync()
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

    /// <summary>
    /// Sends email reminders for due invoices
    /// </summary>
    public async Task<ApiResponse<int>> SendInvoiceRemindersAsync()
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

    /// <summary>
    /// Normalizes DateTime values to UTC for persistence.
    /// </summary>
    private static DateTime NormalizeToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    /// <summary>
    /// Generates a unique invoice number in the form INV-yyyyMM-NNNN.
    /// The sequence restarts at 0001 each month and is drawn from a counter row
    /// that is incremented atomically, so concurrent callers never share a number
    /// and deleting an invoice never puts its number back into circulation.
    /// </summary>
    private async Task<string> GenerateInvoiceNumberAsync()
    {
        var period = DateTime.UtcNow.ToString("yyyyMM");

        // Single round-trip upsert: the ON CONFLICT branch takes a row lock, so
        // parallel callers queue up on it and each observes a distinct LastValue.
        // Materialised with ToListAsync rather than SingleAsync: an INSERT ... RETURNING
        // is not composable, so EF must not wrap it in a subquery to apply a limit.
        var rows = await _context.Database
            .SqlQuery<int>($"""
                INSERT INTO "InvoiceNumberCounters" ("Period", "LastValue")
                VALUES ({period}, 1)
                ON CONFLICT ("Period") DO UPDATE
                    SET "LastValue" = "InvoiceNumberCounters"."LastValue" + 1
                RETURNING "LastValue" AS "Value"
                """)
            .ToListAsync();

        return $"INV-{period}-{rows.Single():D4}";
    }
}
