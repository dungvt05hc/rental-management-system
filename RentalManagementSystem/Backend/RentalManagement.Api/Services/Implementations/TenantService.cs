using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of tenant management services
/// </summary>
public class TenantService : ITenantService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<TenantService> _logger;

    public TenantService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<TenantService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new tenant
    /// </summary>
    public async Task<ApiResponse<TenantDto>> CreateTenantAsync(CreateTenantDto createTenantDto)
    {
        try
        {
            // Check if email already exists
            var existingTenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Email.ToLower() == createTenantDto.Email.ToLower());

            if (existingTenant != null)
            {
                return ApiResponse<TenantDto>.ErrorResponse("A tenant with this email already exists");
            }

            var tenant = new Tenant
            {
                FirstName = createTenantDto.FirstName,
                LastName = createTenantDto.LastName,
                Email = createTenantDto.Email,
                PhoneNumber = createTenantDto.PhoneNumber,
                DateOfBirth = createTenantDto.DateOfBirth,
                IdentificationNumber = createTenantDto.IdentificationNumber,
                EmergencyContactName = createTenantDto.EmergencyContactName,
                EmergencyContactPhone = createTenantDto.EmergencyContactPhone,
                MonthlyRent = createTenantDto.MonthlyRent,
                SecurityDeposit = createTenantDto.SecurityDeposit,
                IsActive = true,
                Notes = createTenantDto.Notes
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            var tenantDto = _mapper.Map<TenantDto>(tenant);
            
            _logger.LogInformation("Created tenant {TenantId} - {FullName}", tenant.Id, tenant.FullName);
            return ApiResponse<TenantDto>.SuccessResponse(tenantDto, "Tenant created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tenant {Email}", createTenantDto.Email);
            return ApiResponse<TenantDto>.ErrorResponse("An error occurred while creating the tenant");
        }
    }

    /// <summary>
    /// Gets a tenant by their ID
    /// </summary>
    public async Task<ApiResponse<TenantDto>> GetTenantByIdAsync(int id)
    {
        try
        {
            var tenant = await _context.Tenants
                .Include(t => t.Room)
                .Include(t => t.Invoices)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
            {
                return ApiResponse<TenantDto>.ErrorResponse("Tenant not found");
            }

            var tenantDto = _mapper.Map<TenantDto>(tenant);
            return ApiResponse<TenantDto>.SuccessResponse(tenantDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant {TenantId}", id);
            return ApiResponse<TenantDto>.ErrorResponse("An error occurred while retrieving the tenant");
        }
    }

    /// <summary>
    /// Gets all tenants with optional search and filtering
    /// </summary>
    public async Task<ApiResponse<PagedResponse<TenantDto>>> GetTenantsAsync(TenantSearchDto searchDto)
    {
        try
        {
            var query = _context.Tenants
                .Include(t => t.Room)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(searchDto.SearchTerm))
            {
                var searchTerm = searchDto.SearchTerm.ToLower();
                query = query.Where(t => 
                    t.FirstName.ToLower().Contains(searchTerm) ||
                    t.LastName.ToLower().Contains(searchTerm) ||
                    t.Email.ToLower().Contains(searchTerm) ||
                    t.PhoneNumber.Contains(searchTerm) ||
                    (t.Room != null && t.Room.RoomNumber.ToLower().Contains(searchTerm)));
            }

            if (searchDto.IsActive.HasValue)
            {
                query = query.Where(t => t.IsActive == searchDto.IsActive.Value);
            }

            if (searchDto.RoomId.HasValue)
            {
                query = query.Where(t => t.RoomId == searchDto.RoomId.Value);
            }

            if (searchDto.HasRoom.HasValue)
            {
                if (searchDto.HasRoom.Value)
                {
                    query = query.Where(t => t.RoomId.HasValue);
                }
                else
                {
                    query = query.Where(t => !t.RoomId.HasValue);
                }
            }

            // Apply sorting
            var isDescending = searchDto.SortDirection?.ToLower() == "desc";
            query = searchDto.SortBy?.ToLower() switch
            {
                "firstname" => isDescending ? query.OrderByDescending(t => t.FirstName) : query.OrderBy(t => t.FirstName),
                "lastname" => isDescending ? query.OrderByDescending(t => t.LastName) : query.OrderBy(t => t.LastName),
                "email" => isDescending ? query.OrderByDescending(t => t.Email) : query.OrderBy(t => t.Email),
                "monthlyrent" => isDescending ? query.OrderByDescending(t => t.MonthlyRent) : query.OrderBy(t => t.MonthlyRent),
                "contractstartdate" => isDescending ? query.OrderByDescending(t => t.ContractStartDate) : query.OrderBy(t => t.ContractStartDate),
                "contractenddate" => isDescending ? query.OrderByDescending(t => t.ContractEndDate) : query.OrderBy(t => t.ContractEndDate),
                _ => query.OrderBy(t => t.FirstName).ThenBy(t => t.LastName)
            };

            var totalCount = await query.CountAsync();
            var tenants = await query
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            var tenantDtos = _mapper.Map<List<TenantDto>>(tenants);

            var pagedResponse = PagedResponse<TenantDto>.Create(
                tenantDtos,
                searchDto.Page,
                searchDto.PageSize,
                totalCount
            );

            return ApiResponse<PagedResponse<TenantDto>>.SuccessResponse(pagedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenants");
            return ApiResponse<PagedResponse<TenantDto>>.ErrorResponse("An error occurred while retrieving tenants");
        }
    }

    /// <summary>
    /// Updates an existing tenant
    /// </summary>
    public async Task<ApiResponse<TenantDto>> UpdateTenantAsync(int id, UpdateTenantDto updateTenantDto)
    {
        try
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null)
            {
                return ApiResponse<TenantDto>.ErrorResponse("Tenant not found");
            }

            // Check if email already exists for another tenant
            if (!string.IsNullOrEmpty(updateTenantDto.Email) && 
                updateTenantDto.Email.ToLower() != tenant.Email.ToLower())
            {
                var existingTenant = await _context.Tenants
                    .FirstOrDefaultAsync(t => t.Email.ToLower() == updateTenantDto.Email.ToLower() && t.Id != id);

                if (existingTenant != null)
                {
                    return ApiResponse<TenantDto>.ErrorResponse("A tenant with this email already exists");
                }
            }

            // Update properties if provided
            if (!string.IsNullOrEmpty(updateTenantDto.FirstName))
                tenant.FirstName = updateTenantDto.FirstName;

            if (!string.IsNullOrEmpty(updateTenantDto.LastName))
                tenant.LastName = updateTenantDto.LastName;

            if (!string.IsNullOrEmpty(updateTenantDto.Email))
                tenant.Email = updateTenantDto.Email;

            if (!string.IsNullOrEmpty(updateTenantDto.PhoneNumber))
                tenant.PhoneNumber = updateTenantDto.PhoneNumber;

            if (updateTenantDto.DateOfBirth.HasValue)
                tenant.DateOfBirth = updateTenantDto.DateOfBirth;

            if (!string.IsNullOrEmpty(updateTenantDto.IdentificationNumber))
                tenant.IdentificationNumber = updateTenantDto.IdentificationNumber;

            if (!string.IsNullOrEmpty(updateTenantDto.EmergencyContactName))
                tenant.EmergencyContactName = updateTenantDto.EmergencyContactName;

            if (!string.IsNullOrEmpty(updateTenantDto.EmergencyContactPhone))
                tenant.EmergencyContactPhone = updateTenantDto.EmergencyContactPhone;

            if (updateTenantDto.MonthlyRent.HasValue)
                tenant.MonthlyRent = updateTenantDto.MonthlyRent.Value;

            if (updateTenantDto.SecurityDeposit.HasValue)
                tenant.SecurityDeposit = updateTenantDto.SecurityDeposit.Value;

            if (updateTenantDto.IsActive.HasValue)
                tenant.IsActive = updateTenantDto.IsActive.Value;

            if (updateTenantDto.Notes != null)
                tenant.Notes = updateTenantDto.Notes;

            tenant.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var tenantDto = _mapper.Map<TenantDto>(tenant);
            
            _logger.LogInformation("Updated tenant {TenantId}", id);
            return ApiResponse<TenantDto>.SuccessResponse(tenantDto, "Tenant updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tenant {TenantId}", id);
            return ApiResponse<TenantDto>.ErrorResponse("An error occurred while updating the tenant");
        }
    }

    /// <summary>
    /// Deletes a tenant
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteTenantAsync(int id)
    {
        try
        {
            var tenant = await _context.Tenants
                .Include(t => t.Invoices)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tenant == null)
            {
                return ApiResponse<bool>.ErrorResponse("Tenant not found");
            }

            // Check if tenant has outstanding invoices
            var hasOutstandingInvoices = tenant.Invoices.Any(i => i.Status != InvoiceStatus.Paid);
            if (hasOutstandingInvoices)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete tenant with outstanding invoices");
            }

            // If tenant is assigned to a room, make the room available
            if (tenant.RoomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(tenant.RoomId.Value);
                if (room != null)
                {
                    room.Status = RoomStatus.Vacant;
                    room.UpdatedAt = DateTime.UtcNow;
                }
            }

            _context.Tenants.Remove(tenant);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted tenant {TenantId} - {FullName}", id, $"{tenant.FirstName} {tenant.LastName}");
            return ApiResponse<bool>.SuccessResponse(true, "Tenant deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tenant {TenantId}", id);
            return ApiResponse<bool>.ErrorResponse("An error occurred while deleting the tenant");
        }
    }

    /// <summary>
    /// Assigns a tenant to a room
    /// </summary>
    public async Task<ApiResponse<bool>> AssignTenantToRoomAsync(int tenantId, AssignTenantToRoomDto assignmentDto)
    {
        try
        {
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null)
            {
                return ApiResponse<bool>.ErrorResponse("Tenant not found");
            }

            var room = await _context.Rooms.FindAsync(assignmentDto.RoomId);
            if (room == null)
            {
                return ApiResponse<bool>.ErrorResponse("Room not found");
            }

            // Check if tenant is already assigned to the same room
            if (tenant.RoomId.HasValue && tenant.RoomId.Value == assignmentDto.RoomId)
            {
                return ApiResponse<bool>.ErrorResponse("Tenant is already assigned to this room");
            }

            // Check if the new room is available
            if (room.Status != RoomStatus.Vacant)
            {
                return ApiResponse<bool>.ErrorResponse("Room is not available");
            }

            // If tenant is currently in another room, make it vacant
            if (tenant.RoomId.HasValue)
            {
                var oldRoom = await _context.Rooms.FindAsync(tenant.RoomId.Value);
                if (oldRoom != null)
                {
                    oldRoom.Status = RoomStatus.Vacant;
                    oldRoom.UpdatedAt = DateTime.UtcNow;
                    _logger.LogInformation("Made room {OldRoomId} vacant (tenant {TenantId} reassigned)", oldRoom.Id, tenantId);
                }
            }

            // Assign tenant to new room
            tenant.RoomId = assignmentDto.RoomId;
            tenant.MonthlyRent = assignmentDto.MonthlyRent ?? room.MonthlyRent;
            tenant.ContractStartDate = NormalizeToUtc(assignmentDto.ContractStartDate);
            tenant.ContractEndDate = NormalizeToUtc(assignmentDto.ContractEndDate);
            tenant.UpdatedAt = DateTime.UtcNow;

            // Update new room status
            room.Status = RoomStatus.Rented;
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Assigned tenant {TenantId} to room {RoomId}", tenantId, assignmentDto.RoomId);
            return ApiResponse<bool>.SuccessResponse(true, "Tenant assigned to room successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning tenant {TenantId} to room {RoomId}", tenantId, assignmentDto.RoomId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while assigning the tenant to the room");
        }
    }

    /// <summary>
    /// Unassigns a tenant from their current room
    /// </summary>
    public async Task<ApiResponse<bool>> UnassignTenantFromRoomAsync(int tenantId)
    {
        try
        {
            var tenant = await _context.Tenants.FindAsync(tenantId);
            if (tenant == null)
            {
                return ApiResponse<bool>.ErrorResponse("Tenant not found");
            }

            if (!tenant.RoomId.HasValue)
            {
                return ApiResponse<bool>.ErrorResponse("Tenant is not assigned to any room");
            }

            // Check for outstanding invoices
            var hasOutstandingInvoices = await _context.Invoices
                .AnyAsync(i => i.TenantId == tenantId && i.Status != InvoiceStatus.Paid);

            if (hasOutstandingInvoices)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot unassign tenant with outstanding invoices");
            }

            var roomId = tenant.RoomId.Value;
            var room = await _context.Rooms.FindAsync(roomId);

            // Unassign tenant from room
            tenant.RoomId = null;
            tenant.UpdatedAt = DateTime.UtcNow;

            // Update room status if found
            if (room != null)
            {
                room.Status = RoomStatus.Vacant;
                room.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Unassigned tenant {TenantId} from room {RoomId}", tenantId, roomId);
            return ApiResponse<bool>.SuccessResponse(true, "Tenant unassigned from room successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unassigning tenant {TenantId} from room", tenantId);
            return ApiResponse<bool>.ErrorResponse("An error occurred while unassigning the tenant from the room");
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

    /// <summary>
    /// Gets tenants with active contracts
    /// </summary>
    public async Task<ApiResponse<IEnumerable<TenantDto>>> GetActiveTenantsAsync()
    {
        try
        {
            var activeTenants = await _context.Tenants
                .Include(t => t.Room)
                .Where(t => t.IsActive)
                .OrderBy(t => t.FullName)
                .ToListAsync();

            var tenantDtos = _mapper.Map<List<TenantDto>>(activeTenants);
            return ApiResponse<IEnumerable<TenantDto>>.SuccessResponse(tenantDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active tenants");
            return ApiResponse<IEnumerable<TenantDto>>.ErrorResponse("An error occurred while retrieving active tenants");
        }
    }

    /// <summary>
    /// Gets tenants without room assignments
    /// </summary>
    public async Task<ApiResponse<IEnumerable<TenantDto>>> GetUnassignedTenantsAsync()
    {
        try
        {
            var unassignedTenants = await _context.Tenants
                .Where(t => !t.RoomId.HasValue && t.IsActive)
                .OrderBy(t => t.FullName)
                .ToListAsync();

            var tenantDtos = _mapper.Map<List<TenantDto>>(unassignedTenants);
            return ApiResponse<IEnumerable<TenantDto>>.SuccessResponse(tenantDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving unassigned tenants");
            return ApiResponse<IEnumerable<TenantDto>>.ErrorResponse("An error occurred while retrieving unassigned tenants");
        }
    }

    /// <summary>
    /// Gets tenants by room ID
    /// </summary>
    public async Task<ApiResponse<IEnumerable<TenantDto>>> GetTenantsByRoomAsync(int roomId)
    {
        try
        {
            var tenants = await _context.Tenants
                .Include(t => t.Room)
                .Where(t => t.RoomId == roomId)
                .OrderBy(t => t.FullName)
                .ToListAsync();

            var tenantDtos = _mapper.Map<List<TenantDto>>(tenants);
            return ApiResponse<IEnumerable<TenantDto>>.SuccessResponse(tenantDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenants for room {RoomId}", roomId);
            return ApiResponse<IEnumerable<TenantDto>>.ErrorResponse("An error occurred while retrieving tenants for the room");
        }
    }

    /// <summary>
    /// Gets tenant statistics
    /// </summary>
    public async Task<ApiResponse<object>> GetTenantStatsAsync()
    {
        try
        {
            var now = DateTime.UtcNow;
            var next30Days = now.AddDays(30);
            var next90Days = now.AddDays(90);

            var stats = new
            {
                TotalTenants = await _context.Tenants.CountAsync(),
                ActiveTenants = await _context.Tenants.CountAsync(t => t.IsActive),
                InactiveTenants = await _context.Tenants.CountAsync(t => !t.IsActive),
                AssignedTenants = await _context.Tenants.CountAsync(t => t.RoomId.HasValue && t.IsActive),
                UnassignedTenants = await _context.Tenants.CountAsync(t => !t.RoomId.HasValue && t.IsActive),
                LeasesExpiringIn30Days = await _context.Tenants
                    .CountAsync(t => t.IsActive && t.ContractEndDate <= next30Days && t.ContractEndDate >= now),
                LeasesExpiringIn90Days = await _context.Tenants
                    .CountAsync(t => t.IsActive && t.ContractEndDate <= next90Days && t.ContractEndDate >= now),
                TotalMonthlyRent = await _context.Tenants
                    .Where(t => t.IsActive && t.RoomId.HasValue)
                    .SumAsync(t => t.MonthlyRent),
                AverageMonthlyRent = await _context.Tenants
                    .Where(t => t.IsActive && t.RoomId.HasValue)
                    .AverageAsync(t => (double?)t.MonthlyRent) ?? 0,
                TotalSecurityDeposits = await _context.Tenants
                    .Where(t => t.IsActive)
                    .SumAsync(t => t.SecurityDeposit)
            };

            return ApiResponse<object>.SuccessResponse(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant statistics");
            return ApiResponse<object>.ErrorResponse("An error occurred while retrieving tenant statistics");
        }
    }
}
