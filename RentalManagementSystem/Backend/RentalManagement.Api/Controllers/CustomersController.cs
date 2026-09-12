using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for customer management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    /// <summary>
    /// Gets all customers with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of customers</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<CustomerDto>>>> GetCustomers([FromQuery] CustomerSearchDto searchDto)
    {
        var result = await _customerService.GetCustomersAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Gets a customer by their ID
    /// </summary>
    /// <param name="id">Customer ID</param>
    /// <returns>Customer information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> GetCustomer(int id)
    {
        var result = await _customerService.GetCustomerByIdAsync(id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates a new customer
    /// </summary>
    /// <param name="createCustomerDto">Customer creation details</param>
    /// <returns>Created customer information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> CreateCustomer([FromBody] CreateCustomerDto createCustomerDto)
    {
        var result = await _customerService.CreateCustomerAsync(createCustomerDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetCustomer), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Updates an existing customer
    /// </summary>
    /// <param name="id">Customer ID to update</param>
    /// <param name="updateCustomerDto">Updated customer information</param>
    /// <returns>Updated customer information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> UpdateCustomer(int id, [FromBody] UpdateCustomerDto updateCustomerDto)
    {
        var result = await _customerService.UpdateCustomerAsync(id, updateCustomerDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Deletes a customer
    /// </summary>
    /// <param name="id">Customer ID to delete</param>
    /// <returns>Deletion result</returns>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCustomer(int id)
    {
        var result = await _customerService.DeleteCustomerAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Assigns a customer to a room
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <param name="assignmentDto">Room assignment details</param>
    /// <returns>Assignment result</returns>
    [HttpPost("{customerId}/assign-room")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<bool>>> AssignCustomerToRoom(int customerId, [FromBody] AssignCustomerToRoomDto assignmentDto)
    {
        var result = await _customerService.AssignCustomerToRoomAsync(customerId, assignmentDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Unassigns a customer from their current room
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <returns>Unassignment result</returns>
    [HttpPost("{customerId}/unassign-room")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<bool>>> UnassignCustomerFromRoom(int customerId)
    {
        var result = await _customerService.UnassignCustomerFromRoomAsync(customerId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets active customers
    /// </summary>
    /// <returns>List of active customers</returns>
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerDto>>>> GetActiveCustomers()
    {
        var result = await _customerService.GetActiveCustomersAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets unassigned customers
    /// </summary>
    /// <returns>List of unassigned customers</returns>
    [HttpGet("unassigned")]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerDto>>>> GetUnassignedCustomers()
    {
        var result = await _customerService.GetUnassignedCustomersAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets customers by room
    /// </summary>
    /// <param name="roomId">Room ID</param>
    /// <returns>List of customers in the specified room</returns>
    [HttpGet("room/{roomId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<CustomerDto>>>> GetCustomersByRoom(int roomId)
    {
        var result = await _customerService.GetCustomersByRoomAsync(roomId);
        return Ok(result);
    }

    /// <summary>
    /// Gets customer statistics
    /// </summary>
    /// <returns>Customer statistics</returns>
    [HttpGet("statistics")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ApiResponse<object>>> GetCustomerStats()
    {
        var result = await _customerService.GetCustomerStatsAsync();
        return Ok(result);
    }
}
