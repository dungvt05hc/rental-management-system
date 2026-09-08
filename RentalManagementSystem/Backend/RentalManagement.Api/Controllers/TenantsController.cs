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

    public TenantsController(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    /// <summary>
    /// Gets all tenants with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of tenants</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<TenantDto>>>> GetTenants([FromQuery] TenantSearchDto searchDto)
    {
        var result = await _tenantService.GetTenantsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Gets a tenant by their ID
    /// </summary>
    /// <param name="id">Tenant ID</param>
    /// <returns>Tenant information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<TenantDto>>> GetTenant(int id)
    {
        var result = await _tenantService.GetTenantByIdAsync(id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
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
        var result = await _tenantService.CreateTenantAsync(createTenantDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetTenant), new { id = result.Data!.Id }, result);
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
        var result = await _tenantService.UpdateTenantAsync(id, updateTenantDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
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
        var result = await _tenantService.DeleteTenantAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
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
        var result = await _tenantService.AssignTenantToRoomAsync(tenantId, assignmentDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
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
        var result = await _tenantService.UnassignTenantFromRoomAsync(tenantId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets active tenants
    /// </summary>
    /// <returns>List of active tenants</returns>
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IEnumerable<TenantDto>>>> GetActiveTenants()
    {
        var result = await _tenantService.GetActiveTenantsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets unassigned tenants
    /// </summary>
    /// <returns>List of unassigned tenants</returns>
    [HttpGet("unassigned")]
    public async Task<ActionResult<ApiResponse<IEnumerable<TenantDto>>>> GetUnassignedTenants()
    {
        var result = await _tenantService.GetUnassignedTenantsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets tenants by room
    /// </summary>
    /// <param name="roomId">Room ID</param>
    /// <returns>List of tenants in the specified room</returns>
    [HttpGet("room/{roomId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<TenantDto>>>> GetTenantsByRoom(int roomId)
    {
        var result = await _tenantService.GetTenantsByRoomAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Gets tenant statistics
    /// </summary>
    /// <returns>Tenant statistics</returns>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetTenantStats()
    {
        var result = await _tenantService.GetTenantStatsAsync();
        return Ok(result);
    }
}
