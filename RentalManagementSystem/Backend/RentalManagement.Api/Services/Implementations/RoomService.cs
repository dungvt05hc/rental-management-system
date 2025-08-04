using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of room management services
/// </summary>
public class RoomService : IRoomService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<RoomService> _logger;

    public RoomService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<RoomService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<ApiResponse<RoomDto>> CreateRoomAsync(CreateRoomDto createRoomDto)
    {
        try
        {
            // Check if room number already exists
            var existingRoom = await _context.Rooms
                .FirstOrDefaultAsync(r => r.RoomNumber == createRoomDto.RoomNumber);

            if (existingRoom != null)
            {
                return ApiResponse<RoomDto>.ErrorResponse("Room number already exists");
            }

            var room = _mapper.Map<Room>(createRoomDto);
            room.CreatedAt = DateTime.UtcNow;
            room.UpdatedAt = DateTime.UtcNow;

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            var roomDto = _mapper.Map<RoomDto>(room);
            
            _logger.LogInformation("Room {RoomNumber} created successfully", room.RoomNumber);
            return ApiResponse<RoomDto>.SuccessResponse(roomDto, "Room created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating room");
            return ApiResponse<RoomDto>.ErrorResponse("Failed to create room");
        }
    }

    public async Task<ApiResponse<RoomDto>> GetRoomByIdAsync(int id)
    {
        try
        {
            var room = await _context.Rooms
                .Include(r => r.Tenants)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (room == null)
            {
                return ApiResponse<RoomDto>.ErrorResponse("Room not found");
            }

            var roomDto = _mapper.Map<RoomDto>(room);
            return ApiResponse<RoomDto>.SuccessResponse(roomDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving room {Id}", id);
            return ApiResponse<RoomDto>.ErrorResponse("Failed to retrieve room");
        }
    }

    public async Task<ApiResponse<PagedResponse<RoomDto>>> GetRoomsAsync(RoomSearchDto searchDto)
    {
        try
        {
            var query = _context.Rooms.Include(r => r.Tenants).AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(searchDto.SearchTerm))
            {
                query = query.Where(r => r.RoomNumber.Contains(searchDto.SearchTerm) ||
                                       (r.Description != null && r.Description.Contains(searchDto.SearchTerm)));
            }

            if (searchDto.Type.HasValue)
            {
                query = query.Where(r => r.Type == searchDto.Type.Value);
            }

            if (searchDto.Status.HasValue)
            {
                query = query.Where(r => r.Status == searchDto.Status.Value);
            }

            if (searchDto.Floor.HasValue)
            {
                query = query.Where(r => r.Floor == searchDto.Floor.Value);
            }

            if (searchDto.MinRent.HasValue)
            {
                query = query.Where(r => r.MonthlyRent >= searchDto.MinRent.Value);
            }

            if (searchDto.MaxRent.HasValue)
            {
                query = query.Where(r => r.MonthlyRent <= searchDto.MaxRent.Value);
            }

            if (searchDto.HasAirConditioning.HasValue)
            {
                query = query.Where(r => r.HasAirConditioning == searchDto.HasAirConditioning.Value);
            }

            // Apply sorting
            query = searchDto.SortBy?.ToLower() switch
            {
                "roomnumber" => searchDto.SortDirection == "desc" 
                    ? query.OrderByDescending(r => r.RoomNumber)
                    : query.OrderBy(r => r.RoomNumber),
                "monthlyrent" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(r => r.MonthlyRent)
                    : query.OrderBy(r => r.MonthlyRent),
                "type" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(r => r.Type)
                    : query.OrderBy(r => r.Type),
                "status" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(r => r.Status)
                    : query.OrderBy(r => r.Status),
                "floor" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(r => r.Floor)
                    : query.OrderBy(r => r.Floor),
                _ => query.OrderBy(r => r.RoomNumber)
            };

            var totalItems = await query.CountAsync();
            var rooms = await query
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            var roomDtos = _mapper.Map<List<RoomDto>>(rooms);

            var pagedResponse = new PagedResponse<RoomDto>
            {
                Items = roomDtos,
                TotalItems = totalItems,
                Page = searchDto.Page,
                PageSize = searchDto.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalItems / searchDto.PageSize)
            };

            return ApiResponse<PagedResponse<RoomDto>>.SuccessResponse(pagedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving rooms");
            return ApiResponse<PagedResponse<RoomDto>>.ErrorResponse("Failed to retrieve rooms");
        }
    }

    public async Task<ApiResponse<RoomDto>> UpdateRoomAsync(int id, UpdateRoomDto updateRoomDto)
    {
        try
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return ApiResponse<RoomDto>.ErrorResponse("Room not found");
            }

            // Check if room number already exists (excluding current room)
            if (!string.IsNullOrEmpty(updateRoomDto.RoomNumber) && 
                updateRoomDto.RoomNumber != room.RoomNumber)
            {
                var existingRoom = await _context.Rooms
                    .FirstOrDefaultAsync(r => r.RoomNumber == updateRoomDto.RoomNumber && r.Id != id);

                if (existingRoom != null)
                {
                    return ApiResponse<RoomDto>.ErrorResponse("Room number already exists");
                }
            }

            _mapper.Map(updateRoomDto, room);
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var roomDto = _mapper.Map<RoomDto>(room);
            
            _logger.LogInformation("Room {Id} updated successfully", id);
            return ApiResponse<RoomDto>.SuccessResponse(roomDto, "Room updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating room {Id}", id);
            return ApiResponse<RoomDto>.ErrorResponse("Failed to update room");
        }
    }

    public async Task<ApiResponse<bool>> DeleteRoomAsync(int id)
    {
        try
        {
            var room = await _context.Rooms
                .Include(r => r.Tenants)
                .Include(r => r.Invoices)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (room == null)
            {
                return ApiResponse<bool>.ErrorResponse("Room not found");
            }

            // Check if room has active tenants
            if (room.Tenants.Any(t => t.HasActiveContract))
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete room with active tenants");
            }

            // Check if room has unpaid invoices
            if (room.Invoices.Any(i => i.Status != InvoiceStatus.Paid))
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete room with unpaid invoices");
            }

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Room {Id} deleted successfully", id);
            return ApiResponse<bool>.SuccessResponse(true, "Room deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting room {Id}", id);
            return ApiResponse<bool>.ErrorResponse("Failed to delete room");
        }
    }

    public async Task<ApiResponse<IEnumerable<RoomDto>>> GetRoomsByStatusAsync(RoomStatus status)
    {
        try
        {
            var rooms = await _context.Rooms
                .Where(r => r.Status == status)
                .Include(r => r.Tenants)
                .OrderBy(r => r.RoomNumber)
                .ToListAsync();

            var roomDtos = _mapper.Map<List<RoomDto>>(rooms);
            return ApiResponse<IEnumerable<RoomDto>>.SuccessResponse(roomDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving rooms by status {Status}", status);
            return ApiResponse<IEnumerable<RoomDto>>.ErrorResponse("Failed to retrieve rooms by status");
        }
    }

    public async Task<ApiResponse<IEnumerable<RoomDto>>> GetAvailableRoomsAsync()
    {
        try
        {
            var rooms = await _context.Rooms
                .Where(r => r.Status == RoomStatus.Vacant)
                .Include(r => r.Tenants)
                .OrderBy(r => r.RoomNumber)
                .ToListAsync();

            var roomDtos = _mapper.Map<List<RoomDto>>(rooms);
            return ApiResponse<IEnumerable<RoomDto>>.SuccessResponse(roomDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available rooms");
            return ApiResponse<IEnumerable<RoomDto>>.ErrorResponse("Failed to retrieve available rooms");
        }
    }

    public async Task<ApiResponse<bool>> ChangeRoomStatusAsync(int id, RoomStatus status)
    {
        try
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return ApiResponse<bool>.ErrorResponse("Room not found");
            }

            room.Status = status;
            room.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Room {Id} status updated to {Status}", id, status);
            return ApiResponse<bool>.SuccessResponse(true, "Room status updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating room status for room {Id}", id);
            return ApiResponse<bool>.ErrorResponse("Failed to update room status");
        }
    }

    public async Task<ApiResponse<object>> GetRoomOccupancyStatsAsync()
    {
        try
        {
            var totalRooms = await _context.Rooms.CountAsync();
            var vacantRooms = await _context.Rooms.CountAsync(r => r.Status == RoomStatus.Vacant);
            var rentedRooms = await _context.Rooms.CountAsync(r => r.Status == RoomStatus.Rented);
            var maintenanceRooms = await _context.Rooms.CountAsync(r => r.Status == RoomStatus.Maintenance);
            
            var averageRent = totalRooms > 0 ? await _context.Rooms.AverageAsync(r => r.MonthlyRent) : 0;
            var totalRevenue = await _context.Rooms
                .Where(r => r.Status == RoomStatus.Rented)
                .SumAsync(r => r.MonthlyRent);

            var roomTypeStats = await _context.Rooms
                .GroupBy(r => r.Type)
                .Select(g => new { RoomType = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            var stats = new
            {
                TotalRooms = totalRooms,
                VacantRooms = vacantRooms,
                RentedRooms = rentedRooms,
                MaintenanceRooms = maintenanceRooms,
                OccupancyRate = totalRooms > 0 ? Math.Round((double)rentedRooms / totalRooms * 100, 2) : 0,
                AverageRent = Math.Round(averageRent, 2),
                TotalRevenue = totalRevenue,
                RoomTypeBreakdown = roomTypeStats
            };

            return ApiResponse<object>.SuccessResponse(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving room statistics");
            return ApiResponse<object>.ErrorResponse("Failed to retrieve room statistics");
        }
    }
}
