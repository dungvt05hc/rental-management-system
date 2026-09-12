using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for rental contract management operations
/// </summary>
public interface IRentalContractService
{
    /// <summary>
    /// Creates a new rental contract
    /// </summary>
    /// <param name="createDto">Contract creation details</param>
    /// <returns>Created contract information</returns>
    Task<ApiResponse<RentalContractDto>> CreateContractAsync(CreateRentalContractDto createDto);

    /// <summary>
    /// Gets a contract by its ID
    /// </summary>
    /// <param name="id">Contract ID</param>
    /// <returns>Contract information</returns>
    Task<ApiResponse<RentalContractDto>> GetContractByIdAsync(int id);

    /// <summary>
    /// Gets contracts with optional filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of contracts</returns>
    Task<ApiResponse<PagedResponse<RentalContractDto>>> GetContractsAsync(RentalContractSearchDto searchDto);

    /// <summary>
    /// Gets every contract held by one customer, newest first
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <returns>List of contracts</returns>
    Task<ApiResponse<IEnumerable<RentalContractDto>>> GetContractsByCustomerAsync(int customerId);

    /// <summary>
    /// Updates an existing contract
    /// </summary>
    /// <param name="id">Contract ID to update</param>
    /// <param name="updateDto">Updated contract information</param>
    /// <returns>Updated contract information</returns>
    Task<ApiResponse<RentalContractDto>> UpdateContractAsync(int id, UpdateRentalContractDto updateDto);

    /// <summary>
    /// Ends a contract, preserving it for history. Frees the room.
    /// </summary>
    /// <param name="id">Contract ID to end</param>
    /// <param name="endDto">End date and notes</param>
    /// <returns>Updated contract information</returns>
    Task<ApiResponse<RentalContractDto>> EndContractAsync(int id, EndRentalContractDto endDto);

    /// <summary>
    /// Cancels a contract that never took effect. Frees the room.
    /// </summary>
    /// <param name="id">Contract ID to cancel</param>
    /// <returns>Updated contract information</returns>
    Task<ApiResponse<RentalContractDto>> CancelContractAsync(int id);

    /// <summary>
    /// Activates a draft contract, marking the room rented
    /// </summary>
    /// <param name="id">Contract ID to activate</param>
    /// <returns>Updated contract information</returns>
    Task<ApiResponse<RentalContractDto>> ActivateContractAsync(int id);
}
