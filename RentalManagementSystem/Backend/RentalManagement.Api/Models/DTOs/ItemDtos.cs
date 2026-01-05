using System.ComponentModel.DataAnnotations;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for creating a new item
/// </summary>
public class CreateItemDto
{
    /// <summary>
    /// Item code or SKU
    /// </summary>
    [Required]
    [StringLength(50)]
    public string ItemCode { get; set; } = string.Empty;

    /// <summary>
    /// Item name or description
    /// </summary>
    [Required]
    [StringLength(200)]
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Detailed description of the item
    /// </summary>
    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Unit of measure (e.g., pcs, kg, m, hrs)
    /// </summary>
    [StringLength(20)]
    public string UnitOfMeasure { get; set; } = "pcs";

    /// <summary>
    /// Default unit price for this item
    /// </summary>
    [Required]
    [Range(0, double.MaxValue)]
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Default tax percentage (0-100)
    /// </summary>
    [Range(0, 100)]
    public decimal TaxPercent { get; set; } = 0;

    /// <summary>
    /// Item category or type
    /// </summary>
    [StringLength(100)]
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Whether this item is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Additional notes for this item
    /// </summary>
    [StringLength(500)]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating an existing item
/// </summary>
public class UpdateItemDto
{
    /// <summary>
    /// Item code or SKU
    /// </summary>
    [StringLength(50)]
    public string? ItemCode { get; set; }

    /// <summary>
    /// Item name or description
    /// </summary>
    [StringLength(200)]
    public string? ItemName { get; set; }

    /// <summary>
    /// Detailed description of the item
    /// </summary>
    [StringLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Unit of measure
    /// </summary>
    [StringLength(20)]
    public string? UnitOfMeasure { get; set; }

    /// <summary>
    /// Default unit price
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? UnitPrice { get; set; }

    /// <summary>
    /// Default tax percentage
    /// </summary>
    [Range(0, 100)]
    public decimal? TaxPercent { get; set; }

    /// <summary>
    /// Item category
    /// </summary>
    [StringLength(100)]
    public string? Category { get; set; }

    /// <summary>
    /// Whether this item is active
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Notes
    /// </summary>
    [StringLength(500)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for item response
/// </summary>
public class ItemDto
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Item code or SKU
    /// </summary>
    public string ItemCode { get; set; } = string.Empty;

    /// <summary>
    /// Item name
    /// </summary>
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Description
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Unit of measure
    /// </summary>
    public string UnitOfMeasure { get; set; } = string.Empty;

    /// <summary>
    /// Default unit price
    /// </summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Default tax percentage
    /// </summary>
    public decimal TaxPercent { get; set; }

    /// <summary>
    /// Category
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Whether this item is active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Notes
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// Created date
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Updated date
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for item summary information
/// </summary>
public class ItemSummaryDto
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Item code or SKU
    /// </summary>
    public string ItemCode { get; set; } = string.Empty;

    /// <summary>
    /// Item name
    /// </summary>
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Unit price
    /// </summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Category
    /// </summary>
    public string Category { get; set; } = string.Empty;
}

/// <summary>
/// DTO for item search and filter parameters
/// </summary>
public class ItemSearchDto
{
    /// <summary>
    /// Search term for item code or name
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by category
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Filter by active status
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Page number for pagination
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// Sort field
    /// </summary>
    public string SortBy { get; set; } = "ItemName";

    /// <summary>
    /// Sort direction (asc/desc)
    /// </summary>
    public string SortDirection { get; set; } = "asc";
}
