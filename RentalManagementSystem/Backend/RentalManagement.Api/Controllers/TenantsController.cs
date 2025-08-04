using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for tenant management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TenantsController : ControllerBase
{
    private readonly ITenantService _tenantService;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(ITenantService tenantService, ILogger<TenantsController> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all tenants with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of tenants</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<TenantDto>>>> GetTenants([FromQuery] TenantSearchDto searchDto)
    {
        try
        {
            var result = await _tenantService.GetTenantsAsync(searchDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenants");
            return StatusCode(500, ApiResponse<PagedResponse<TenantDto>>.ErrorResponse("An error occurred while retrieving tenants"));
        }
    }

    /// <summary>
    /// Gets a tenant by their ID
    /// </summary>
    /// <param name="id">Tenant ID</param>
    /// <returns>Tenant information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<TenantDto>>> GetTenant(int id)
    {
        try
        {
            var result = await _tenantService.GetTenantByIdAsync(id);
            
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant {Id}", id);
            return StatusCode(500, ApiResponse<TenantDto>.ErrorResponse("An error occurred while retrieving the tenant"));
        }
    }

    /// <summary>
    /// Creates a new tenant
    /// </summary>
    /// <param name="createTenantDto">Tenant creation details</param>
    /// <returns>Created tenant information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<TenantDto>>> CreateTenant([FromBody] CreateTenantDto createTenantDto)
    {
        try
        {
            var result = await _tenantService.CreateTenantAsync(createTenantDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetTenant), new { id = result.Data!.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tenant");
            return StatusCode(500, ApiResponse<TenantDto>.ErrorResponse("An error occurred while creating the tenant"));
        }
    }

    /// <summary>
    /// Updates an existing tenant
    /// </summary>
    /// <param name="id">Tenant ID to update</param>
    /// <param name="updateTenantDto">Updated tenant information</param>
    /// <returns>Updated tenant information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<TenantDto>>> UpdateTenant(int id, [FromBody] UpdateTenantDto updateTenantDto)
    {
        try
        {
            var result = await _tenantService.UpdateTenantAsync(id, updateTenantDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tenant {Id}", id);
            return StatusCode(500, ApiResponse<TenantDto>.ErrorResponse("An error occurred while updating the tenant"));
        }
    }

    /// <summary>
    /// Deletes a tenant
    /// </summary>
    /// <param name="id">Tenant ID to delete</param>
    /// <returns>Deletion result</returns>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteTenant(int id)
    {
        try
        {
            var result = await _tenantService.DeleteTenantAsync(id);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tenant {Id}", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while deleting the tenant"));
        }
    }

    /// <summary>
    /// Assigns a tenant to a room
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <param name="assignmentDto">Room assignment details</param>
    /// <returns>Assignment result</returns>
    [HttpPost("{tenantId}/assign-room")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignTenantToRoom(int tenantId, [FromBody] AssignTenantToRoomDto assignmentDto)
    {
        try
        {
            var result = await _tenantService.AssignTenantToRoomAsync(tenantId, assignmentDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning tenant {TenantId} to room", tenantId);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while assigning tenant to room"));
        }
    }

    /// <summary>
    /// Unassigns a tenant from their current room
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <returns>Unassignment result</returns>
    [HttpPost("{tenantId}/unassign-room")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<bool>>> UnassignTenantFromRoom(int tenantId)
    {
        try
        {
            var result = await _tenantService.UnassignTenantFromRoomAsync(tenantId);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unassigning tenant {TenantId} from room", tenantId);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while unassigning tenant from room"));
        }
    }

    /// <summary>
    /// Gets active tenants
    /// </summary>
    /// <returns>List of active tenants</returns>
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IEnumerable<TenantDto>>>> GetActiveTenants()
    {
        try
        {
            var result = await _tenantService.GetActiveTenantsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active tenants");
            return StatusCode(500, ApiResponse<IEnumerable<TenantDto>>.ErrorResponse("An error occurred while retrieving active tenants"));
        }
    }

    /// <summary>
    /// Gets unassigned tenants
    /// </summary>
    /// <returns>List of unassigned tenants</returns>
    [HttpGet("unassigned")]
    public async Task<ActionResult<ApiResponse<IEnumerable<TenantDto>>>> GetUnassignedTenants()
    {
        try
        {
            var result = await _tenantService.GetUnassignedTenantsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving unassigned tenants");
            return StatusCode(500, ApiResponse<IEnumerable<TenantDto>>.ErrorResponse("An error occurred while retrieving unassigned tenants"));
        }
    }

    /// <summary>
    /// Gets tenants by room
    /// </summary>
    /// <param name="roomId">Room ID</param>
    /// <returns>List of tenants in the specified room</returns>
    [HttpGet("room/{roomId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<TenantDto>>>> GetTenantsByRoom(int roomId)
    {
        try
        {
            var result = await _tenantService.GetTenantsByRoomAsync(roomId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenants by room {RoomId}", roomId);
            return StatusCode(500, ApiResponse<IEnumerable<TenantDto>>.ErrorResponse("An error occurred while retrieving tenants by room"));
        }
    }

    /// <summary>
    /// Gets tenant statistics
    /// </summary>
    /// <returns>Tenant statistics</returns>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetTenantStats()
    {
        try
        {
            var result = await _tenantService.GetTenantStatsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tenant statistics");
            return StatusCode(500, ApiResponse<object>.ErrorResponse("An error occurred while retrieving tenant statistics"));
        }
    }
}
