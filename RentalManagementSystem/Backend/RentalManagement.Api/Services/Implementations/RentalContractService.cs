using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of rental contract management services
/// </summary>
public class RentalContractService : IRentalContractService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<RentalContractService> _logger;

    public RentalContractService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<RentalContractService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new rental contract
    /// </summary>
    public async Task<ApiResponse<RentalContractDto>> CreateContractAsync(CreateRentalContractDto createDto)
    {
        var customer = await _context.Customers.FindAsync(createDto.CustomerId);
        if (customer == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Customer not found");
        }

        var room = await _context.Rooms.FindAsync(createDto.RoomId);
        if (room == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Room not found");
        }

        var startDate = NormalizeToUtc(createDto.StartDate);
        var endDate = createDto.EndDate.HasValue ? NormalizeToUtc(createDto.EndDate.Value) : (DateTime?)null;

        if (endDate.HasValue && endDate.Value < startDate)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Contract end date must not be before its start date");
        }

        if (createDto.Status == RentalContractStatus.Active)
        {
            var overlapping = await _context.RentalContracts
                .AnyAsync(c => c.RoomId == createDto.RoomId &&
                               c.Status == RentalContractStatus.Active &&
                               (!c.EndDate.HasValue || c.EndDate.Value >= startDate) &&
                               (!endDate.HasValue || c.StartDate <= endDate.Value));

            if (overlapping)
            {
                return ApiResponse<RentalContractDto>.ErrorResponse(
                    "This room already has an active contract covering that period");
            }
        }

        var contract = new RentalContract
        {
            CustomerId = createDto.CustomerId,
            RoomId = createDto.RoomId,
            StartDate = startDate,
            EndDate = endDate,
            MonthlyRent = createDto.MonthlyRent ?? room.MonthlyRent,
            SecurityDeposit = createDto.SecurityDeposit,
            Status = createDto.Status,
            Notes = createDto.Notes
        };

        _context.RentalContracts.Add(contract);

        if (contract.Status == RentalContractStatus.Active)
        {
            room.Status = RoomStatus.Rented;
            room.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created rental contract {ContractId} for customer {CustomerId} on room {RoomId}",
            contract.Id, contract.CustomerId, contract.RoomId);

        return ApiResponse<RentalContractDto>.SuccessResponse(
            await LoadDtoAsync(contract.Id), "Rental contract created successfully");
    }

    /// <summary>
    /// Gets a contract by its ID
    /// </summary>
    public async Task<ApiResponse<RentalContractDto>> GetContractByIdAsync(int id)
    {
        var contract = await QueryWithIncludes().FirstOrDefaultAsync(c => c.Id == id);
        if (contract == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Rental contract not found");
        }

        var dto = _mapper.Map<RentalContractDto>(contract);
        await FillInvoiceCountsAsync(new List<RentalContractDto> { dto });

        return ApiResponse<RentalContractDto>.SuccessResponse(dto);
    }

    /// <summary>
    /// Gets contracts with optional filtering
    /// </summary>
    public async Task<ApiResponse<PagedResponse<RentalContractDto>>> GetContractsAsync(RentalContractSearchDto searchDto)
    {
        var query = QueryWithIncludes();

        if (searchDto.CustomerId.HasValue)
        {
            query = query.Where(c => c.CustomerId == searchDto.CustomerId.Value);
        }

        if (searchDto.RoomId.HasValue)
        {
            query = query.Where(c => c.RoomId == searchDto.RoomId.Value);
        }

        if (searchDto.Status.HasValue)
        {
            query = query.Where(c => c.Status == searchDto.Status.Value);
        }

        var isDescending = searchDto.SortDirection?.ToLower() != "asc";
        query = searchDto.SortBy?.ToLower() switch
        {
            "enddate" => isDescending ? query.OrderByDescending(c => c.EndDate) : query.OrderBy(c => c.EndDate),
            "monthlyrent" => isDescending ? query.OrderByDescending(c => c.MonthlyRent) : query.OrderBy(c => c.MonthlyRent),
            "status" => isDescending ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
            _ => isDescending ? query.OrderByDescending(c => c.StartDate) : query.OrderBy(c => c.StartDate)
        };

        var (page, pageSize) = PaginationLimits.Normalize(searchDto.Page, searchDto.PageSize);

        var totalCount = await query.CountAsync();
        var contracts = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = _mapper.Map<List<RentalContractDto>>(contracts);
        await FillInvoiceCountsAsync(dtos);

        var pagedResponse = PagedResponse<RentalContractDto>.Create(
            dtos,
            page,
            pageSize,
            totalCount);

        return ApiResponse<PagedResponse<RentalContractDto>>.SuccessResponse(pagedResponse);
    }

    /// <summary>
    /// Gets every contract held by one customer, newest first
    /// </summary>
    public async Task<ApiResponse<IEnumerable<RentalContractDto>>> GetContractsByCustomerAsync(int customerId)
    {
        var customerExists = await _context.Customers.AnyAsync(t => t.Id == customerId);
        if (!customerExists)
        {
            return ApiResponse<IEnumerable<RentalContractDto>>.ErrorResponse("Customer not found");
        }

        var contracts = await QueryWithIncludes()
            .Where(c => c.CustomerId == customerId)
            .OrderByDescending(c => c.StartDate)
            .ToListAsync();

        var dtos = _mapper.Map<List<RentalContractDto>>(contracts);
        await FillInvoiceCountsAsync(dtos);

        return ApiResponse<IEnumerable<RentalContractDto>>.SuccessResponse(dtos);
    }

    /// <summary>
    /// Updates an existing contract
    /// </summary>
    public async Task<ApiResponse<RentalContractDto>> UpdateContractAsync(int id, UpdateRentalContractDto updateDto)
    {
        var contract = await _context.RentalContracts.FindAsync(id);
        if (contract == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Rental contract not found");
        }

        if (contract.Status is RentalContractStatus.Ended or RentalContractStatus.Cancelled)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse(
                "A contract that has ended or been cancelled can no longer be edited");
        }

        if (updateDto.StartDate.HasValue)
            contract.StartDate = NormalizeToUtc(updateDto.StartDate.Value);

        if (updateDto.EndDate.HasValue)
            contract.EndDate = NormalizeToUtc(updateDto.EndDate.Value);

        if (contract.EndDate.HasValue && contract.EndDate.Value < contract.StartDate)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse(
                "Contract end date must not be before its start date");
        }

        if (updateDto.MonthlyRent.HasValue)
            contract.MonthlyRent = updateDto.MonthlyRent.Value;

        if (updateDto.SecurityDeposit.HasValue)
            contract.SecurityDeposit = updateDto.SecurityDeposit.Value;

        if (updateDto.Notes != null)
            contract.Notes = updateDto.Notes;

        contract.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated rental contract {ContractId}", id);
        return ApiResponse<RentalContractDto>.SuccessResponse(
            await LoadDtoAsync(id), "Rental contract updated successfully");
    }

    /// <summary>
    /// Ends a contract, preserving it for history. Frees the room.
    /// </summary>
    public async Task<ApiResponse<RentalContractDto>> EndContractAsync(int id, EndRentalContractDto endDto)
    {
        var contract = await _context.RentalContracts.FindAsync(id);
        if (contract == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Rental contract not found");
        }

        if (contract.Status == RentalContractStatus.Ended)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("This contract has already ended");
        }

        if (contract.Status == RentalContractStatus.Cancelled)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("A cancelled contract cannot be ended");
        }

        var hasOutstandingInvoices = await _context.Invoices
            .AnyAsync(i => i.RentalContractId == id && i.Status != InvoiceStatus.Paid);

        if (hasOutstandingInvoices)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse(
                "Cannot end a contract that still has unpaid invoices");
        }

        contract.Status = RentalContractStatus.Ended;
        contract.EndDate = endDto.EndDate.HasValue ? NormalizeToUtc(endDto.EndDate.Value) : DateTime.UtcNow;
        contract.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(endDto.Notes))
            contract.Notes = endDto.Notes;

        await ReleaseRoomIfNoLongerOccupiedAsync(contract);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Ended rental contract {ContractId}", id);
        return ApiResponse<RentalContractDto>.SuccessResponse(
            await LoadDtoAsync(id), "Rental contract ended successfully");
    }

    /// <summary>
    /// Cancels a contract that never took effect. Frees the room.
    /// </summary>
    public async Task<ApiResponse<RentalContractDto>> CancelContractAsync(int id)
    {
        var contract = await _context.RentalContracts.FindAsync(id);
        if (contract == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Rental contract not found");
        }

        if (contract.Status == RentalContractStatus.Ended)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("A contract that has ended cannot be cancelled");
        }

        if (contract.Status == RentalContractStatus.Cancelled)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("This contract has already been cancelled");
        }

        var hasInvoices = await _context.Invoices.AnyAsync(i => i.RentalContractId == id);
        if (hasInvoices)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse(
                "Cannot cancel a contract that already has invoices — end it instead");
        }

        contract.Status = RentalContractStatus.Cancelled;
        contract.UpdatedAt = DateTime.UtcNow;

        await ReleaseRoomIfNoLongerOccupiedAsync(contract);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Cancelled rental contract {ContractId}", id);
        return ApiResponse<RentalContractDto>.SuccessResponse(
            await LoadDtoAsync(id), "Rental contract cancelled successfully");
    }

    /// <summary>
    /// Activates a draft contract, marking the room rented
    /// </summary>
    public async Task<ApiResponse<RentalContractDto>> ActivateContractAsync(int id)
    {
        var contract = await _context.RentalContracts.FindAsync(id);
        if (contract == null)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Rental contract not found");
        }

        if (contract.Status != RentalContractStatus.Draft)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse("Only a draft contract can be activated");
        }

        var overlapping = await _context.RentalContracts
            .AnyAsync(c => c.Id != id &&
                           c.RoomId == contract.RoomId &&
                           c.Status == RentalContractStatus.Active &&
                           (!c.EndDate.HasValue || c.EndDate.Value >= contract.StartDate) &&
                           (!contract.EndDate.HasValue || c.StartDate <= contract.EndDate.Value));

        if (overlapping)
        {
            return ApiResponse<RentalContractDto>.ErrorResponse(
                "This room already has an active contract covering that period");
        }

        contract.Status = RentalContractStatus.Active;
        contract.UpdatedAt = DateTime.UtcNow;

        var room = await _context.Rooms.FindAsync(contract.RoomId);
        if (room != null)
        {
            room.Status = RoomStatus.Rented;
            room.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Activated rental contract {ContractId}", id);
        return ApiResponse<RentalContractDto>.SuccessResponse(
            await LoadDtoAsync(id), "Rental contract activated successfully");
    }

    /// <summary>
    /// Marks the contract's room vacant unless another active contract still covers it
    /// </summary>
    private async Task ReleaseRoomIfNoLongerOccupiedAsync(RentalContract contract)
    {
        var stillOccupied = await _context.RentalContracts
            .AnyAsync(c => c.Id != contract.Id &&
                           c.RoomId == contract.RoomId &&
                           c.Status == RentalContractStatus.Active);

        if (stillOccupied)
        {
            return;
        }

        var room = await _context.Rooms.FindAsync(contract.RoomId);
        if (room != null && room.Status == RoomStatus.Rented)
        {
            room.Status = RoomStatus.Vacant;
            room.UpdatedAt = DateTime.UtcNow;
        }
    }

    private IQueryable<RentalContract> QueryWithIncludes() =>
        _context.RentalContracts
            .Include(c => c.Customer)
            .Include(c => c.Room)
            .AsQueryable();

    private async Task<RentalContractDto> LoadDtoAsync(int id)
    {
        var contract = await QueryWithIncludes().FirstAsync(c => c.Id == id);
        var dto = _mapper.Map<RentalContractDto>(contract);
        await FillInvoiceCountsAsync(new List<RentalContractDto> { dto });
        return dto;
    }

    /// <summary>
    /// Fills InvoiceCount for a batch of DTOs with a single grouped query
    /// </summary>
    private async Task FillInvoiceCountsAsync(List<RentalContractDto> dtos)
    {
        if (dtos.Count == 0)
        {
            return;
        }

        var ids = dtos.Select(d => d.Id).ToList();
        var counts = await _context.Invoices
            .Where(i => i.RentalContractId.HasValue && ids.Contains(i.RentalContractId.Value))
            .GroupBy(i => i.RentalContractId!.Value)
            .Select(g => new { ContractId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ContractId, x => x.Count);

        foreach (var dto in dtos)
        {
            dto.InvoiceCount = counts.TryGetValue(dto.Id, out var count) ? count : 0;
        }
    }

    private static DateTime NormalizeToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }
}
