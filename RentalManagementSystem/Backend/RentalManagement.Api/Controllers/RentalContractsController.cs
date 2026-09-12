using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for rental contract management operations
/// </summary>
[ApiController]
[Route("api/rental-contracts")]
[Authorize]
public class RentalContractsController : ControllerBase
{
    private readonly IRentalContractService _contractService;

    public RentalContractsController(IRentalContractService contractService)
    {
        _contractService = contractService;
    }

    /// <summary>
    /// Gets contracts with optional filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of contracts</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<RentalContractDto>>>> GetContracts([FromQuery] RentalContractSearchDto searchDto)
    {
        var result = await _contractService.GetContractsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Gets a contract by its ID
    /// </summary>
    /// <param name="id">Contract ID</param>
    /// <returns>Contract information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<RentalContractDto>>> GetContract(int id)
    {
        var result = await _contractService.GetContractByIdAsync(id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets every contract held by one customer
    /// </summary>
    /// <param name="customerId">Customer ID</param>
    /// <returns>List of contracts, newest first</returns>
    [HttpGet("customer/{customerId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<RentalContractDto>>>> GetContractsByCustomer(int customerId)
    {
        var result = await _contractService.GetContractsByCustomerAsync(customerId);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates a new rental contract
    /// </summary>
    /// <param name="createDto">Contract creation details</param>
    /// <returns>Created contract information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<RentalContractDto>>> CreateContract([FromBody] CreateRentalContractDto createDto)
    {
        var result = await _contractService.CreateContractAsync(createDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetContract), new { id = result.Data!.Id }, result);
    }

    /// <summary>
    /// Updates an existing contract
    /// </summary>
    /// <param name="id">Contract ID to update</param>
    /// <param name="updateDto">Updated contract information</param>
    /// <returns>Updated contract information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<RentalContractDto>>> UpdateContract(int id, [FromBody] UpdateRentalContractDto updateDto)
    {
        var result = await _contractService.UpdateContractAsync(id, updateDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Activates a draft contract
    /// </summary>
    /// <param name="id">Contract ID to activate</param>
    /// <returns>Updated contract information</returns>
    [HttpPost("{id}/activate")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<RentalContractDto>>> ActivateContract(int id)
    {
        var result = await _contractService.ActivateContractAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Ends a contract. The contract is kept for history, never deleted.
    /// </summary>
    /// <param name="id">Contract ID to end</param>
    /// <param name="endDto">End date and notes</param>
    /// <returns>Updated contract information</returns>
    [HttpPost("{id}/end")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<RentalContractDto>>> EndContract(int id, [FromBody] EndRentalContractDto endDto)
    {
        var result = await _contractService.EndContractAsync(id, endDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Cancels a contract that never took effect
    /// </summary>
    /// <param name="id">Contract ID to cancel</param>
    /// <returns>Updated contract information</returns>
    [HttpPost("{id}/cancel")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<RentalContractDto>>> CancelContract(int id)
    {
        var result = await _contractService.CancelContractAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
