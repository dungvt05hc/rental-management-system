using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for room management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;

    public RoomsController(IRoomService roomService)
    {
        _roomService = roomService;
    }

    /// <summary>
    /// Gets all rooms with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of rooms</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<RoomDto>>>> GetRooms([FromQuery] RoomSearchDto searchDto)
    {
        var result = await _roomService.GetRoomsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Gets a room by its ID
    /// </summary>
    /// <param name="id">Room ID</param>
    /// <returns>Room information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RoomDto>>> GetRoom(int id)
    {
        var result = await _roomService.GetRoomByIdAsync(id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates a new room
    /// </summary>
    /// <param name="createRoomDto">Room creation details</param>
    /// <returns>Created room information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<RoomDto>>> CreateRoom([FromBody] CreateRoomDto createRoomDto)
    {
        var result = await _roomService.CreateRoomAsync(createRoomDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetRoom), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Updates an existing room
    /// </summary>
    /// <param name="id">Room ID to update</param>
    /// <param name="updateRoomDto">Updated room information</param>
    /// <returns>Updated room information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<RoomDto>>> UpdateRoom(int id, [FromBody] UpdateRoomDto updateRoomDto)
    {
        var result = await _roomService.UpdateRoomAsync(id, updateRoomDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Deletes a room
    /// </summary>
    /// <param name="id">Room ID to delete</param>
    /// <returns>Deletion result</returns>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRoom(int id)
    {
        var result = await _roomService.DeleteRoomAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets available rooms
    /// </summary>
    /// <returns>List of available rooms</returns>
    [HttpGet("available")]
    public async Task<ActionResult<ApiResponse<IEnumerable<RoomDto>>>> GetAvailableRooms()
    {
        var result = await _roomService.GetAvailableRoomsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets rooms by status
    /// </summary>
    /// <param name="status">Room status</param>
    /// <returns>List of rooms with the specified status</returns>
    [HttpGet("status/{status}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<RoomDto>>>> GetRoomsByStatus(RoomStatus status)
    {
        var result = await _roomService.GetRoomsByStatusAsync(status);
        return Ok(result);
    }

    /// <summary>
    /// Changes room status
    /// </summary>
    /// <param name="id">Room ID</param>
    /// <param name="status">New room status</param>
    /// <returns>Status change result</returns>
    [HttpPatch("{id}/status/{status}")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<bool>>> ChangeRoomStatus(int id, RoomStatus status)
    {
        var result = await _roomService.ChangeRoomStatusAsync(id, status);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets room occupancy statistics
    /// </summary>
    /// <returns>Room occupancy statistics</returns>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetRoomOccupancyStats()
    {
        var result = await _roomService.GetRoomOccupancyStatsAsync();
        return Ok(result);
    }
}
