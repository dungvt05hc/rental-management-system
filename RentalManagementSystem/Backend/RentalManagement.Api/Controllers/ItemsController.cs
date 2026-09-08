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

    public ItemsController(IItemService itemService)
    {
        _itemService = itemService;
    }

    /// <summary>
    /// Gets all items with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of items</returns>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<ItemDto>>>> GetItems([FromQuery] ItemSearchDto searchDto)
    {
        var result = await _itemService.GetItemsAsync(searchDto);
        return Ok(result);
    }

    /// <summary>
    /// Gets an item by its ID
    /// </summary>
    /// <param name="id">Item ID</param>
    /// <returns>Item information</returns>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ItemDto>>> GetItem(int id)
    {
        var result = await _itemService.GetItemByIdAsync(id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
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
        var result = await _itemService.CreateItemAsync(createItemDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetItem), new { id = result.Data!.Id }, result);
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
        var result = await _itemService.UpdateItemAsync(id, updateItemDto);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
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
        var result = await _itemService.DeleteItemAsync(id);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gets all active items
    /// </summary>
    /// <returns>List of active items</returns>
    [HttpGet("active")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetActiveItems()
    {
        var result = await _itemService.GetActiveItemsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets items by category
    /// </summary>
    /// <param name="category">Category name</param>
    /// <returns>List of items in the category</returns>
    [HttpGet("category/{category}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetItemsByCategory(string category)
    {
        var result = await _itemService.GetItemsByCategoryAsync(category);
        return Ok(result);
    }

    /// <summary>
    /// Gets all unique categories
    /// </summary>
    /// <returns>List of category names</returns>
    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IEnumerable<string>>>> GetCategories()
    {
        var result = await _itemService.GetCategoriesAsync();
        return Ok(result);
    }
}
