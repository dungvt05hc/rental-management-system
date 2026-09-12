using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for customer management operations
/// </summary>
public interface ICustomerService
{
    /// <summary>
    /// Creates a new customer
    /// </summary>
    /// <param name="createCustomerDto">Customer creation details</param>
    /// <returns>Created customer information</returns>
    Task<ApiResponse<CustomerDto>> CreateCustomerAsync(CreateCustomerDto createCustomerDto);

    /// <summary>
    /// Gets a customer by their ID
    /// </summary>
    /// <param name="id">Customer ID</param>
    /// <returns>Customer information</returns>
    Task<ApiResponse<CustomerDto>> GetCustomerByIdAsync(int id);

    /// <summary>
    /// Gets all customers with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of customers</returns>
    Task<ApiResponse<PagedResponse<CustomerDto>>> GetCustomersAsync(CustomerSearchDto searchDto);

    /// <summary>
    /// Updates an existing customer
    /// </summary>
    /// <param name="id">Customer ID to update</param>
    /// <param name="updateCustomerDto">Updated customer information</param>
    /// <returns>Updated customer information</returns>
    Task<ApiResponse<CustomerDto>> UpdateCustomerAsync(int id, UpdateCustomerDto updateCustomerDto);

    /// <summary>
    /// Deletes a customer
    /// </summary>
    /// <param name="id">Customer ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteCustomerAsync(int id);

    /// <summary>
    /// Assigns a customer to a room
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <param name="assignmentDto">Room assignment details</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> AssignCustomerToRoomAsync(int customerId, AssignCustomerToRoomDto assignmentDto);

    /// <summary>
    /// Unassigns a customer from their current room
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> UnassignCustomerFromRoomAsync(int customerId);

    /// <summary>
    /// Gets customers with active contracts
    /// </summary>
    /// <returns>List of customers with active contracts</returns>
    Task<ApiResponse<IEnumerable<CustomerDto>>> GetActiveCustomersAsync();

    /// <summary>
    /// Gets customers without room assignments
    /// </summary>
    /// <returns>List of customers without rooms</returns>
    Task<ApiResponse<IEnumerable<CustomerDto>>> GetUnassignedCustomersAsync();

    /// <summary>
    /// Gets customers by room ID
    /// </summary>
    /// <param name="roomId">Room ID</param>
    /// <returns>List of customers in the specified room</returns>
    Task<ApiResponse<IEnumerable<CustomerDto>>> GetCustomersByRoomAsync(int roomId);

    /// <summary>
    /// Gets customer statistics
    /// </summary>
    /// <returns>Customer statistics</returns>
    Task<ApiResponse<object>> GetCustomerStatsAsync();
}
