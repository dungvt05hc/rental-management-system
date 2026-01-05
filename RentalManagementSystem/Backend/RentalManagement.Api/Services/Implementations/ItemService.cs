using AutoMapper;
using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Data;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Implementation of item management services
/// </summary>
public class ItemService : IItemService
{
    private readonly RentalManagementContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<ItemService> _logger;

    public ItemService(
        RentalManagementContext context,
        IMapper mapper,
        ILogger<ItemService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<ApiResponse<ItemDto>> CreateItemAsync(CreateItemDto createItemDto)
    {
        try
        {
            // Check if item code already exists
            var existingItem = await _context.Items
                .FirstOrDefaultAsync(i => i.ItemCode == createItemDto.ItemCode);

            if (existingItem != null)
            {
                return ApiResponse<ItemDto>.ErrorResponse("Item code already exists");
            }

            var item = _mapper.Map<Item>(createItemDto);
            item.CreatedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            var itemDto = _mapper.Map<ItemDto>(item);
            
            _logger.LogInformation("Item {ItemCode} created successfully", item.ItemCode);
            return ApiResponse<ItemDto>.SuccessResponse(itemDto, "Item created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating item");
            return ApiResponse<ItemDto>.ErrorResponse("Failed to create item");
        }
    }

    public async Task<ApiResponse<ItemDto>> GetItemByIdAsync(int id)
    {
        try
        {
            var item = await _context.Items.FindAsync(id);

            if (item == null)
            {
                return ApiResponse<ItemDto>.ErrorResponse("Item not found");
            }

            var itemDto = _mapper.Map<ItemDto>(item);
            return ApiResponse<ItemDto>.SuccessResponse(itemDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving item {Id}", id);
            return ApiResponse<ItemDto>.ErrorResponse("Failed to retrieve item");
        }
    }

    public async Task<ApiResponse<PagedResponse<ItemDto>>> GetItemsAsync(ItemSearchDto searchDto)
    {
        try
        {
            var query = _context.Items.AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(searchDto.SearchTerm))
            {
                query = query.Where(i => i.ItemCode.Contains(searchDto.SearchTerm) ||
                                       i.ItemName.Contains(searchDto.SearchTerm) ||
                                       (i.Description != null && i.Description.Contains(searchDto.SearchTerm)));
            }

            if (!string.IsNullOrEmpty(searchDto.Category))
            {
                query = query.Where(i => i.Category == searchDto.Category);
            }

            if (searchDto.IsActive.HasValue)
            {
                query = query.Where(i => i.IsActive == searchDto.IsActive.Value);
            }

            // Apply sorting
            query = searchDto.SortBy?.ToLower() switch
            {
                "itemcode" => searchDto.SortDirection == "desc" 
                    ? query.OrderByDescending(i => i.ItemCode)
                    : query.OrderBy(i => i.ItemCode),
                "itemname" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(i => i.ItemName)
                    : query.OrderBy(i => i.ItemName),
                "unitprice" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(i => i.UnitPrice)
                    : query.OrderBy(i => i.UnitPrice),
                "category" => searchDto.SortDirection == "desc"
                    ? query.OrderByDescending(i => i.Category)
                    : query.OrderBy(i => i.Category),
                _ => query.OrderBy(i => i.ItemName)
            };

            var totalItems = await query.CountAsync();
            var items = await query
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            var itemDtos = _mapper.Map<List<ItemDto>>(items);

            var pagedResponse = new PagedResponse<ItemDto>
            {
                Items = itemDtos,
                TotalItems = totalItems,
                Page = searchDto.Page,
                PageSize = searchDto.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalItems / searchDto.PageSize)
            };

            return ApiResponse<PagedResponse<ItemDto>>.SuccessResponse(pagedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving items");
            return ApiResponse<PagedResponse<ItemDto>>.ErrorResponse("Failed to retrieve items");
        }
    }

    public async Task<ApiResponse<ItemDto>> UpdateItemAsync(int id, UpdateItemDto updateItemDto)
    {
        try
        {
            var item = await _context.Items.FindAsync(id);
            if (item == null)
            {
                return ApiResponse<ItemDto>.ErrorResponse("Item not found");
            }

            // Check if item code already exists (excluding current item)
            if (!string.IsNullOrEmpty(updateItemDto.ItemCode) && 
                updateItemDto.ItemCode != item.ItemCode)
            {
                var existingItem = await _context.Items
                    .FirstOrDefaultAsync(i => i.ItemCode == updateItemDto.ItemCode && i.Id != id);

                if (existingItem != null)
                {
                    return ApiResponse<ItemDto>.ErrorResponse("Item code already exists");
                }
            }

            _mapper.Map(updateItemDto, item);
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var itemDto = _mapper.Map<ItemDto>(item);
            
            _logger.LogInformation("Item {Id} updated successfully", id);
            return ApiResponse<ItemDto>.SuccessResponse(itemDto, "Item updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {Id}", id);
            return ApiResponse<ItemDto>.ErrorResponse("Failed to update item");
        }
    }

    public async Task<ApiResponse<bool>> DeleteItemAsync(int id)
    {
        try
        {
            var item = await _context.Items.FindAsync(id);

            if (item == null)
            {
                return ApiResponse<bool>.ErrorResponse("Item not found");
            }

            // Check if item is used in any invoice items
            var isUsedInInvoices = await _context.InvoiceItems
                .AnyAsync(ii => ii.ItemCode == item.ItemCode);

            if (isUsedInInvoices)
            {
                return ApiResponse<bool>.ErrorResponse("Cannot delete item that is used in invoices");
            }

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Item {Id} deleted successfully", id);
            return ApiResponse<bool>.SuccessResponse(true, "Item deleted successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting item {Id}", id);
            return ApiResponse<bool>.ErrorResponse("Failed to delete item");
        }
    }

    public async Task<ApiResponse<IEnumerable<ItemDto>>> GetActiveItemsAsync()
    {
        try
        {
            var items = await _context.Items
                .Where(i => i.IsActive)
                .OrderBy(i => i.ItemName)
                .ToListAsync();

            var itemDtos = _mapper.Map<List<ItemDto>>(items);
            return ApiResponse<IEnumerable<ItemDto>>.SuccessResponse(itemDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active items");
            return ApiResponse<IEnumerable<ItemDto>>.ErrorResponse("Failed to retrieve active items");
        }
    }

    public async Task<ApiResponse<IEnumerable<ItemDto>>> GetItemsByCategoryAsync(string category)
    {
        try
        {
            var items = await _context.Items
                .Where(i => i.Category == category && i.IsActive)
                .OrderBy(i => i.ItemName)
                .ToListAsync();

            var itemDtos = _mapper.Map<List<ItemDto>>(items);
            return ApiResponse<IEnumerable<ItemDto>>.SuccessResponse(itemDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving items by category {Category}", category);
            return ApiResponse<IEnumerable<ItemDto>>.ErrorResponse("Failed to retrieve items by category");
        }
    }

    public async Task<ApiResponse<IEnumerable<string>>> GetCategoriesAsync()
    {
        try
        {
            var categories = await _context.Items
                .Where(i => !string.IsNullOrEmpty(i.Category))
                .Select(i => i.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return ApiResponse<IEnumerable<string>>.SuccessResponse(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving categories");
            return ApiResponse<IEnumerable<string>>.ErrorResponse("Failed to retrieve categories");
        }
    }
}
