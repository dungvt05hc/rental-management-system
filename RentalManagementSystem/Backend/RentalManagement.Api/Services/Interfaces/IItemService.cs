using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Services.Interfaces;

/// <summary>
/// Service interface for item management operations
/// </summary>
public interface IItemService
{
    /// <summary>
    /// Creates a new item
    /// </summary>
    /// <param name="createItemDto">Item creation details</param>
    /// <returns>Created item information</returns>
    Task<ApiResponse<ItemDto>> CreateItemAsync(CreateItemDto createItemDto);

    /// <summary>
    /// Gets an item by its ID
    /// </summary>
    /// <param name="id">Item ID</param>
    /// <returns>Item information</returns>
    Task<ApiResponse<ItemDto>> GetItemByIdAsync(int id);

    /// <summary>
    /// Gets all items with optional search and filtering
    /// </summary>
    /// <param name="searchDto">Search and filter parameters</param>
    /// <returns>Paginated list of items</returns>
    Task<ApiResponse<PagedResponse<ItemDto>>> GetItemsAsync(ItemSearchDto searchDto);

    /// <summary>
    /// Updates an existing item
    /// </summary>
    /// <param name="id">Item ID to update</param>
    /// <param name="updateItemDto">Updated item information</param>
    /// <returns>Updated item information</returns>
    Task<ApiResponse<ItemDto>> UpdateItemAsync(int id, UpdateItemDto updateItemDto);

    /// <summary>
    /// Deletes an item
    /// </summary>
    /// <param name="id">Item ID to delete</param>
    /// <returns>Success status</returns>
    Task<ApiResponse<bool>> DeleteItemAsync(int id);

    /// <summary>
    /// Gets all active items
    /// </summary>
    /// <returns>List of active items</returns>
    Task<ApiResponse<IEnumerable<ItemDto>>> GetActiveItemsAsync();

    /// <summary>
    /// Gets items by category
    /// </summary>
    /// <param name="category">Category name</param>
    /// <returns>List of items in the category</returns>
    Task<ApiResponse<IEnumerable<ItemDto>>> GetItemsByCategoryAsync(string category);

    /// <summary>
    /// Gets all unique categories
    /// </summary>
    /// <returns>List of category names</returns>
    Task<ApiResponse<IEnumerable<string>>> GetCategoriesAsync();
}
