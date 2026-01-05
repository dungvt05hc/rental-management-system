using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Controllers;

/// <summary>
/// Controller for item management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ItemsController : ControllerBase
{
    private readonly IItemService _itemService;
    private readonly ILogger<ItemsController> _logger;

    public ItemsController(IItemService itemService, ILogger<ItemsController> logger)
    {
        _itemService = itemService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all items with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of items</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<ItemDto>>>> GetItems([FromQuery] ItemSearchDto searchDto)
    {
        try
        {
            var result = await _itemService.GetItemsAsync(searchDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving items");
            return StatusCode(500, ApiResponse<PagedResponse<ItemDto>>.ErrorResponse("An error occurred while retrieving items"));
        }
    }

    /// <summary>
    /// Gets an item by its ID
    /// </summary>
    /// <param name="id">Item ID</param>
    /// <returns>Item information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ItemDto>>> GetItem(int id)
    {
        try
        {
            var result = await _itemService.GetItemByIdAsync(id);
            
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving item {Id}", id);
            return StatusCode(500, ApiResponse<ItemDto>.ErrorResponse("An error occurred while retrieving the item"));
        }
    }

    /// <summary>
    /// Creates a new item
    /// </summary>
    /// <param name="createItemDto">Item creation details</param>
    /// <returns>Created item information</returns>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<ItemDto>>> CreateItem([FromBody] CreateItemDto createItemDto)
    {
        try
        {
            var result = await _itemService.CreateItemAsync(createItemDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return CreatedAtAction(nameof(GetItem), new { id = result.Data!.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating item");
            return StatusCode(500, ApiResponse<ItemDto>.ErrorResponse("An error occurred while creating the item"));
        }
    }

    /// <summary>
    /// Updates an existing item
    /// </summary>
    /// <param name="id">Item ID to update</param>
    /// <param name="updateItemDto">Updated item information</param>
    /// <returns>Updated item information</returns>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    public async Task<ActionResult<ApiResponse<ItemDto>>> UpdateItem(int id, [FromBody] UpdateItemDto updateItemDto)
    {
        try
        {
            var result = await _itemService.UpdateItemAsync(id, updateItemDto);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {Id}", id);
            return StatusCode(500, ApiResponse<ItemDto>.ErrorResponse("An error occurred while updating the item"));
        }
    }

    /// <summary>
    /// Deletes an item
    /// </summary>
    /// <param name="id">Item ID to delete</param>
    /// <returns>Deletion result</returns>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteItem(int id)
    {
        try
        {
            var result = await _itemService.DeleteItemAsync(id);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting item {Id}", id);
            return StatusCode(500, ApiResponse<bool>.ErrorResponse("An error occurred while deleting the item"));
        }
    }

    /// <summary>
    /// Gets all active items
    /// </summary>
    /// <returns>List of active items</returns>
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetActiveItems()
    {
        try
        {
            var result = await _itemService.GetActiveItemsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active items");
            return StatusCode(500, ApiResponse<IEnumerable<ItemDto>>.ErrorResponse("An error occurred while retrieving active items"));
        }
    }

    /// <summary>
    /// Gets items by category
    /// </summary>
    /// <param name="category">Category name</param>
    /// <returns>List of items in the category</returns>
    [HttpGet("category/{category}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetItemsByCategory(string category)
    {
        try
        {
            var result = await _itemService.GetItemsByCategoryAsync(category);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving items by category {Category}", category);
            return StatusCode(500, ApiResponse<IEnumerable<ItemDto>>.ErrorResponse("An error occurred while retrieving items by category"));
        }
    }

    /// <summary>
    /// Gets all unique categories
    /// </summary>
    /// <returns>List of category names</returns>
    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IEnumerable<string>>>> GetCategories()
    {
        try
        {
            var result = await _itemService.GetCategoriesAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving categories");
            return StatusCode(500, ApiResponse<IEnumerable<string>>.ErrorResponse("An error occurred while retrieving categories"));
        }
    }
}
