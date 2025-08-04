using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for tenant management operations
/// </summary>
public interface ITenantService
{
    /// <summary>
    /// Creates a new tenant
    /// </summary>
    /// <param name="createTenantDto">Tenant creation details</param>
    /// <returns>Created tenant information</returns>
    Task<ApiResponse<TenantDto>> CreateTenantAsync(CreateTenantDto createTenantDto);

    /// <summary>
    /// Gets a tenant by their ID
    /// </summary>
    /// <param name="id">Tenant ID</param>
    /// <returns>Tenant information</returns>
    Task<ApiResponse<TenantDto>> GetTenantByIdAsync(int id);

    /// <summary>
    /// Gets all tenants with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of tenants</returns>
    Task<ApiResponse<PagedResponse<TenantDto>>> GetTenantsAsync(TenantSearchDto searchDto);

    /// <summary>
    /// Updates an existing tenant
    /// </summary>
    /// <param name="id">Tenant ID to update</param>
    /// <param name="updateTenantDto">Updated tenant information</param>
    /// <returns>Updated tenant information</returns>
    Task<ApiResponse<TenantDto>> UpdateTenantAsync(int id, UpdateTenantDto updateTenantDto);

    /// <summary>
    /// Deletes a tenant
    /// </summary>
    /// <param name="id">Tenant ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteTenantAsync(int id);

    /// <summary>
    /// Assigns a tenant to a room
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <param name="assignmentDto">Room assignment details</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> AssignTenantToRoomAsync(int tenantId, AssignTenantToRoomDto assignmentDto);

    /// <summary>
    /// Unassigns a tenant from their current room
    /// </summary>
    /// <param name="tenantId">Tenant ID</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> UnassignTenantFromRoomAsync(int tenantId);

    /// <summary>
    /// Gets tenants with active contracts
    /// </summary>
    /// <returns>List of tenants with active contracts</returns>
    Task<ApiResponse<IEnumerable<TenantDto>>> GetActiveTenantsAsync();

    /// <summary>
    /// Gets tenants without room assignments
    /// </summary>
    /// <returns>List of tenants without rooms</returns>
    Task<ApiResponse<IEnumerable<TenantDto>>> GetUnassignedTenantsAsync();

    /// <summary>
    /// Gets tenants by room ID
    /// </summary>
    /// <param name="roomId">Room ID</param>
    /// <returns>List of tenants in the specified room</returns>
    Task<ApiResponse<IEnumerable<TenantDto>>> GetTenantsByRoomAsync(int roomId);

    /// <summary>
    /// Gets tenant statistics
    /// </summary>
    /// <returns>Tenant statistics</returns>
    Task<ApiResponse<object>> GetTenantStatsAsync();
}
