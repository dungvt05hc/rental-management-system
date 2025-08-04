using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for room management operations
/// </summary>
public interface IRoomService
{
    /// <summary>
    /// Creates a new room
    /// </summary>
    /// <param name="createRoomDto">Room creation details</param>
    /// <returns>Created room information</returns>
    Task<ApiResponse<RoomDto>> CreateRoomAsync(CreateRoomDto createRoomDto);

    /// <summary>
    /// Gets a room by its ID
    /// </summary>
    /// <param name="id">Room ID</param>
    /// <returns>Room information</returns>
    Task<ApiResponse<RoomDto>> GetRoomByIdAsync(int id);

    /// <summary>
    /// Gets all rooms with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of rooms</returns>
    Task<ApiResponse<PagedResponse<RoomDto>>> GetRoomsAsync(RoomSearchDto searchDto);

    /// <summary>
    /// Updates an existing room
    /// </summary>
    /// <param name="id">Room ID to update</param>
    /// <param name="updateRoomDto">Updated room information</param>
    /// <returns>Updated room information</returns>
    Task<ApiResponse<RoomDto>> UpdateRoomAsync(int id, UpdateRoomDto updateRoomDto);

    /// <summary>
    /// Deletes a room
    /// </summary>
    /// <param name="id">Room ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteRoomAsync(int id);

    /// <summary>
    /// Gets rooms by status
    /// </summary>
    /// <param name="status">Room status to filter by</param>
    /// <returns>List of rooms with the specified status</returns>
    Task<ApiResponse<IEnumerable<RoomDto>>> GetRoomsByStatusAsync(Models.Entities.RoomStatus status);

    /// <summary>
    /// Gets available rooms for rental
    /// </summary>
    /// <returns>List of available rooms</returns>
    Task<ApiResponse<IEnumerable<RoomDto>>> GetAvailableRoomsAsync();

    /// <summary>
    /// Changes room status
    /// </summary>
    /// <param name="id">Room ID</param>
    /// <param name="status">New status</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> ChangeRoomStatusAsync(int id, Models.Entities.RoomStatus status);

    /// <summary>
    /// Gets room occupancy statistics
    /// </summary>
    /// <returns>Room occupancy statistics</returns>
    Task<ApiResponse<object>> GetRoomOccupancyStatsAsync();
}
