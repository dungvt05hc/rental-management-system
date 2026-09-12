using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of customer management services.
/// Everything about what a customer rents is reached through their rental contracts.
/// </summary>
public class CustomerService : ICustomerService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<CustomerService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new customer
    /// </summary>
    public async Task<ApiResponse<CustomerDto>> CreateCustomerAsync(CreateCustomerDto createCustomerDto)
    {
        // Check if email already exists
        var existingCustomer = await _context.Customers
            .FirstOrDefaultAsync(t => t.Email.ToLower() == createCustomerDto.Email.ToLower());

        if (existingCustomer != null)
        {
            return ApiResponse<CustomerDto>.ErrorResponse("A customer with this email already exists");
        }

        var customer = new Customer
        {
            FirstName = createCustomerDto.FirstName,
            LastName = createCustomerDto.LastName,
            Email = createCustomerDto.Email,
            PhoneNumber = createCustomerDto.PhoneNumber,
            DateOfBirth = createCustomerDto.DateOfBirth,
            IdentificationNumber = createCustomerDto.IdentificationNumber,
            EmergencyContactName = createCustomerDto.EmergencyContactName,
            EmergencyContactPhone = createCustomerDto.EmergencyContactPhone,
            IsActive = true,
            Notes = createCustomerDto.Notes
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        var customerDto = _mapper.Map<CustomerDto>(customer);

        _logger.LogInformation("Created customer {CustomerId} - {FullName}", customer.Id, customer.FullName);
        return ApiResponse<CustomerDto>.SuccessResponse(customerDto, "Customer created successfully");
    }

    /// <summary>
    /// Gets a customer by their ID
    /// </summary>
    public async Task<ApiResponse<CustomerDto>> GetCustomerByIdAsync(int id)
    {
        var customer = await QueryWithContracts()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (customer == null)
        {
            return ApiResponse<CustomerDto>.ErrorResponse("Customer not found");
        }

        var customerDto = _mapper.Map<CustomerDto>(customer);
        return ApiResponse<CustomerDto>.SuccessResponse(customerDto);
    }

    /// <summary>
    /// Gets all customers with optional search and filtering
    /// </summary>
    public async Task<ApiResponse<PagedResponse<CustomerDto>>> GetCustomersAsync(CustomerSearchDto searchDto)
    {
        var query = QueryWithContracts();

        // Apply filters
        if (!string.IsNullOrEmpty(searchDto.SearchTerm))
        {
            // So trên cột SearchText đã bỏ dấu, nên gõ "nguyen van an" vẫn ra
            // "Nguyễn Văn An". Từ khoá được chuẩn hoá cùng một cách.
            var searchTerm = SearchText.Normalize(searchDto.SearchTerm);
            query = query.Where(t =>
                t.SearchText.Contains(searchTerm) ||
                t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active &&
                                           c.Room.SearchText.Contains(searchTerm)));
        }

        if (searchDto.IsActive.HasValue)
        {
            query = query.Where(t => t.IsActive == searchDto.IsActive.Value);
        }

        if (searchDto.RoomId.HasValue)
        {
            query = query.Where(t => t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active &&
                                                                c.RoomId == searchDto.RoomId.Value));
        }

        if (searchDto.HasRoom.HasValue)
        {
            query = searchDto.HasRoom.Value
                ? query.Where(t => t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active))
                : query.Where(t => !t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active));
        }

        if (searchDto.HasActiveContract.HasValue)
        {
            query = searchDto.HasActiveContract.Value
                ? query.Where(t => t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active))
                : query.Where(t => !t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active));
        }

        // Apply sorting. Rent and contract dates now sort through the active contract.
        var isDescending = searchDto.SortDirection?.ToLower() == "desc";
        query = searchDto.SortBy?.ToLower() switch
        {
            "firstname" => isDescending ? query.OrderByDescending(t => t.FirstName) : query.OrderBy(t => t.FirstName),
            "lastname" => isDescending ? query.OrderByDescending(t => t.LastName) : query.OrderBy(t => t.LastName),
            "email" => isDescending ? query.OrderByDescending(t => t.Email) : query.OrderBy(t => t.Email),
            "monthlyrent" => isDescending
                ? query.OrderByDescending(t => t.RentalContracts
                    .Where(c => c.Status == RentalContractStatus.Active)
                    .Select(c => (decimal?)c.MonthlyRent).FirstOrDefault())
                : query.OrderBy(t => t.RentalContracts
                    .Where(c => c.Status == RentalContractStatus.Active)
                    .Select(c => (decimal?)c.MonthlyRent).FirstOrDefault()),
            "contractstartdate" => isDescending
                ? query.OrderByDescending(t => t.RentalContracts
                    .Where(c => c.Status == RentalContractStatus.Active)
                    .Select(c => (DateTime?)c.StartDate).FirstOrDefault())
                : query.OrderBy(t => t.RentalContracts
                    .Where(c => c.Status == RentalContractStatus.Active)
                    .Select(c => (DateTime?)c.StartDate).FirstOrDefault()),
            "contractenddate" => isDescending
                ? query.OrderByDescending(t => t.RentalContracts
                    .Where(c => c.Status == RentalContractStatus.Active)
                    .Select(c => c.EndDate).FirstOrDefault())
                : query.OrderBy(t => t.RentalContracts
                    .Where(c => c.Status == RentalContractStatus.Active)
                    .Select(c => c.EndDate).FirstOrDefault()),
            _ => query.OrderBy(t => t.FirstName).ThenBy(t => t.LastName)
        };

        var (page, pageSize) = PaginationLimits.Normalize(searchDto.Page, searchDto.PageSize);

        var totalCount = await query.CountAsync();
        var customers = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var customerDtos = _mapper.Map<List<CustomerDto>>(customers);

        var pagedResponse = PagedResponse<CustomerDto>.Create(
            customerDtos,
            page,
            pageSize,
            totalCount
        );

        return ApiResponse<PagedResponse<CustomerDto>>.SuccessResponse(pagedResponse);
    }

    /// <summary>
    /// Updates an existing customer
    /// </summary>
    public async Task<ApiResponse<CustomerDto>> UpdateCustomerAsync(int id, UpdateCustomerDto updateCustomerDto)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null)
        {
            return ApiResponse<CustomerDto>.ErrorResponse("Customer not found");
        }

        // Check if email already exists for another customer
        if (!string.IsNullOrEmpty(updateCustomerDto.Email) &&
            updateCustomerDto.Email.ToLower() != customer.Email.ToLower())
        {
            var existingCustomer = await _context.Customers
                .FirstOrDefaultAsync(t => t.Email.ToLower() == updateCustomerDto.Email.ToLower() && t.Id != id);

            if (existingCustomer != null)
            {
                return ApiResponse<CustomerDto>.ErrorResponse("A customer with this email already exists");
            }
        }

        // Update properties if provided
        if (!string.IsNullOrEmpty(updateCustomerDto.FirstName))
            customer.FirstName = updateCustomerDto.FirstName;

        if (!string.IsNullOrEmpty(updateCustomerDto.LastName))
            customer.LastName = updateCustomerDto.LastName;

        if (!string.IsNullOrEmpty(updateCustomerDto.Email))
            customer.Email = updateCustomerDto.Email;

        if (!string.IsNullOrEmpty(updateCustomerDto.PhoneNumber))
            customer.PhoneNumber = updateCustomerDto.PhoneNumber;

        if (updateCustomerDto.DateOfBirth.HasValue)
            customer.DateOfBirth = updateCustomerDto.DateOfBirth;

        if (!string.IsNullOrEmpty(updateCustomerDto.IdentificationNumber))
            customer.IdentificationNumber = updateCustomerDto.IdentificationNumber;

        if (!string.IsNullOrEmpty(updateCustomerDto.EmergencyContactName))
            customer.EmergencyContactName = updateCustomerDto.EmergencyContactName;

        if (!string.IsNullOrEmpty(updateCustomerDto.EmergencyContactPhone))
            customer.EmergencyContactPhone = updateCustomerDto.EmergencyContactPhone;

        if (updateCustomerDto.IsActive.HasValue)
            customer.IsActive = updateCustomerDto.IsActive.Value;

        if (updateCustomerDto.Notes != null)
            customer.Notes = updateCustomerDto.Notes;

        customer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated customer {CustomerId}", id);
        return ApiResponse<CustomerDto>.SuccessResponse(
            await LoadDtoAsync(id), "Customer updated successfully");
    }

    /// <summary>
    /// Deletes a customer
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteCustomerAsync(int id)
    {
        var customer = await _context.Customers
            .Include(t => t.Invoices)
            .Include(t => t.RentalContracts)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (customer == null)
        {
            return ApiResponse<bool>.ErrorResponse("Customer not found");
        }

        // Check if customer has outstanding invoices
        var hasOutstandingInvoices = customer.Invoices.Any(i => i.Status != InvoiceStatus.Paid);
        if (hasOutstandingInvoices)
        {
            return ApiResponse<bool>.ErrorResponse("Cannot delete customer with outstanding invoices");
        }

        // A customer still under contract must have that contract ended first,
        // otherwise the rental history would be deleted along with them.
        if (customer.RentalContracts.Any(c => c.Status == RentalContractStatus.Active))
        {
            return ApiResponse<bool>.ErrorResponse(
                "Cannot delete a customer who still holds an active contract — end the contract first");
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted customer {CustomerId} - {FullName}", id, $"{customer.FirstName} {customer.LastName}");
        return ApiResponse<bool>.SuccessResponse(true, "Customer deleted successfully");
    }

    /// <summary>
    /// Assigns a customer to a room by opening an active rental contract
    /// </summary>
    public async Task<ApiResponse<bool>> AssignCustomerToRoomAsync(int customerId, AssignCustomerToRoomDto assignmentDto)
    {
        var customer = await _context.Customers
            .Include(t => t.RentalContracts)
            .FirstOrDefaultAsync(t => t.Id == customerId);

        if (customer == null)
        {
            return ApiResponse<bool>.ErrorResponse("Customer not found");
        }

        var room = await _context.Rooms.FindAsync(assignmentDto.RoomId);
        if (room == null)
        {
            return ApiResponse<bool>.ErrorResponse("Room not found");
        }

        var currentContract = customer.RentalContracts
            .FirstOrDefault(c => c.Status == RentalContractStatus.Active);

        if (currentContract != null && currentContract.RoomId == assignmentDto.RoomId)
        {
            return ApiResponse<bool>.ErrorResponse("Customer is already assigned to this room");
        }

        // Check if the new room is available
        if (room.Status != RoomStatus.Vacant)
        {
            return ApiResponse<bool>.ErrorResponse("Room is not available");
        }

        var startDate = NormalizeToUtc(assignmentDto.ContractStartDate);
        var endDate = NormalizeToUtc(assignmentDto.ContractEndDate);

        if (endDate < startDate)
        {
            return ApiResponse<bool>.ErrorResponse("Contract end date must not be before its start date");
        }

        // Moving rooms ends the previous contract rather than rewriting it, so history survives.
        if (currentContract != null)
        {
            currentContract.Status = RentalContractStatus.Ended;
            currentContract.EndDate = DateTime.UtcNow;
            currentContract.UpdatedAt = DateTime.UtcNow;

            var oldRoom = await _context.Rooms.FindAsync(currentContract.RoomId);
            if (oldRoom != null && oldRoom.Status == RoomStatus.Rented)
            {
                oldRoom.Status = RoomStatus.Vacant;
                oldRoom.UpdatedAt = DateTime.UtcNow;
                _logger.LogInformation(
                    "Made room {OldRoomId} vacant (customer {CustomerId} reassigned)", oldRoom.Id, customerId);
            }
        }

        _context.RentalContracts.Add(new RentalContract
        {
            CustomerId = customerId,
            RoomId = assignmentDto.RoomId,
            StartDate = startDate,
            EndDate = endDate,
            MonthlyRent = assignmentDto.MonthlyRent ?? room.MonthlyRent,
            SecurityDeposit = assignmentDto.SecurityDeposit,
            Status = RentalContractStatus.Active
        });

        // Update new room status
        room.Status = RoomStatus.Rented;
        room.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Assigned customer {CustomerId} to room {RoomId}", customerId, assignmentDto.RoomId);
        return ApiResponse<bool>.SuccessResponse(true, "Customer assigned to room successfully");
    }

    /// <summary>
    /// Unassigns a customer from their current room by ending the active contract
    /// </summary>
    public async Task<ApiResponse<bool>> UnassignCustomerFromRoomAsync(int customerId)
    {
        var customer = await _context.Customers
            .Include(t => t.RentalContracts)
            .FirstOrDefaultAsync(t => t.Id == customerId);

        if (customer == null)
        {
            return ApiResponse<bool>.ErrorResponse("Customer not found");
        }

        var contract = customer.RentalContracts
            .FirstOrDefault(c => c.Status == RentalContractStatus.Active);

        if (contract == null)
        {
            return ApiResponse<bool>.ErrorResponse("Customer is not assigned to any room");
        }

        // Check for outstanding invoices
        var hasOutstandingInvoices = await _context.Invoices
            .AnyAsync(i => i.CustomerId == customerId && i.Status != InvoiceStatus.Paid);

        if (hasOutstandingInvoices)
        {
            return ApiResponse<bool>.ErrorResponse("Cannot unassign customer with outstanding invoices");
        }

        var roomId = contract.RoomId;

        contract.Status = RentalContractStatus.Ended;
        contract.EndDate = DateTime.UtcNow;
        contract.UpdatedAt = DateTime.UtcNow;

        var stillOccupied = await _context.RentalContracts
            .AnyAsync(c => c.Id != contract.Id &&
                           c.RoomId == roomId &&
                           c.Status == RentalContractStatus.Active);

        if (!stillOccupied)
        {
            var room = await _context.Rooms.FindAsync(roomId);
            if (room != null && room.Status == RoomStatus.Rented)
            {
                room.Status = RoomStatus.Vacant;
                room.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Unassigned customer {CustomerId} from room {RoomId}", customerId, roomId);
        return ApiResponse<bool>.SuccessResponse(true, "Customer unassigned from room successfully");
    }

    /// <summary>
    /// Gets active customers
    /// </summary>
    public async Task<ApiResponse<IEnumerable<CustomerDto>>> GetActiveCustomersAsync()
    {
        var activeCustomers = await QueryWithContracts()
            .Where(t => t.IsActive)
            .OrderBy(t => t.FirstName).ThenBy(t => t.LastName)
            .ToListAsync();

        var customerDtos = _mapper.Map<List<CustomerDto>>(activeCustomers);
        return ApiResponse<IEnumerable<CustomerDto>>.SuccessResponse(customerDtos);
    }

    /// <summary>
    /// Gets customers without an active contract
    /// </summary>
    public async Task<ApiResponse<IEnumerable<CustomerDto>>> GetUnassignedCustomersAsync()
    {
        var unassignedCustomers = await QueryWithContracts()
            .Where(t => t.IsActive && !t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active))
            .OrderBy(t => t.FirstName).ThenBy(t => t.LastName)
            .ToListAsync();

        var customerDtos = _mapper.Map<List<CustomerDto>>(unassignedCustomers);
        return ApiResponse<IEnumerable<CustomerDto>>.SuccessResponse(customerDtos);
    }

    /// <summary>
    /// Gets customers holding an active contract on the given room
    /// </summary>
    public async Task<ApiResponse<IEnumerable<CustomerDto>>> GetCustomersByRoomAsync(int roomId)
    {
        var customers = await QueryWithContracts()
            .Where(t => t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active && c.RoomId == roomId))
            .OrderBy(t => t.FirstName).ThenBy(t => t.LastName)
            .ToListAsync();

        var customerDtos = _mapper.Map<List<CustomerDto>>(customers);
        return ApiResponse<IEnumerable<CustomerDto>>.SuccessResponse(customerDtos);
    }

    /// <summary>
    /// Gets customer statistics
    /// </summary>
    public async Task<ApiResponse<object>> GetCustomerStatsAsync()
    {
        var now = DateTime.UtcNow;
        var next30Days = now.AddDays(30);
        var next90Days = now.AddDays(90);

        var activeContracts = _context.RentalContracts
            .Where(c => c.Status == RentalContractStatus.Active);

        var stats = new
        {
            TotalCustomers = await _context.Customers.CountAsync(),
            ActiveCustomers = await _context.Customers.CountAsync(t => t.IsActive),
            InactiveCustomers = await _context.Customers.CountAsync(t => !t.IsActive),
            AssignedCustomers = await _context.Customers
                .CountAsync(t => t.IsActive && t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active)),
            UnassignedCustomers = await _context.Customers
                .CountAsync(t => t.IsActive && !t.RentalContracts.Any(c => c.Status == RentalContractStatus.Active)),
            LeasesExpiringIn30Days = await activeContracts
                .CountAsync(c => c.EndDate.HasValue && c.EndDate.Value <= next30Days && c.EndDate.Value >= now),
            LeasesExpiringIn90Days = await activeContracts
                .CountAsync(c => c.EndDate.HasValue && c.EndDate.Value <= next90Days && c.EndDate.Value >= now),
            TotalMonthlyRent = await activeContracts.SumAsync(c => c.MonthlyRent),
            AverageMonthlyRent = await activeContracts.AverageAsync(c => (double?)c.MonthlyRent) ?? 0,
            TotalSecurityDeposits = await activeContracts.SumAsync(c => c.SecurityDeposit)
        };

        return ApiResponse<object>.SuccessResponse(stats);
    }

    /// <summary>
    /// Customers with their contracts and each contract's room loaded,
    /// which CustomerDto needs to derive its rental fields.
    /// </summary>
    private IQueryable<Customer> QueryWithContracts() =>
        _context.Customers
            .Include(t => t.RentalContracts)
                .ThenInclude(c => c.Room)
            .AsQueryable();

    private async Task<CustomerDto> LoadDtoAsync(int id)
    {
        var customer = await QueryWithContracts().FirstAsync(t => t.Id == id);
        return _mapper.Map<CustomerDto>(customer);
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
