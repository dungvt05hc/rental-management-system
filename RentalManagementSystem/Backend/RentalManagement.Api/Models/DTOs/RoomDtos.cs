using System.ComponentModel.DataAnnotations;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for creating a new room
/// </summary>
public class CreateRoomDto
{
    /// <summary>
    /// Room number for identification
    /// </summary>
    [Required]
    [StringLength(20)]
    public string RoomNumber { get; set; } = string.Empty;

    /// <summary>
    /// Type of room
    /// </summary>
    [Required]
    public RoomType Type { get; set; }

    /// <summary>
    /// Monthly rent price for the room
    /// </summary>
    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Monthly rent must be a positive value")]
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Floor number where the room is located
    /// </summary>
    [Range(0, 100)]
    public int Floor { get; set; }

    /// <summary>
    /// Area of the room in square meters
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? Area { get; set; }

    /// <summary>
    /// Description or additional notes about the room
    /// </summary>
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Whether the room has air conditioning
    /// </summary>
    public bool HasAirConditioning { get; set; }

    /// <summary>
    /// Whether the room has a private bathroom
    /// </summary>
    public bool HasPrivateBathroom { get; set; }

    /// <summary>
    /// Whether the room is furnished
    /// </summary>
    public bool IsFurnished { get; set; }
}

/// <summary>
/// DTO for updating an existing room
/// </summary>
public class UpdateRoomDto
{
    /// <summary>
    /// Room number for identification
    /// </summary>
    [StringLength(20)]
    public string? RoomNumber { get; set; }

    /// <summary>
    /// Type of room
    /// </summary>
    public RoomType? Type { get; set; }

    /// <summary>
    /// Monthly rent price for the room
    /// </summary>
    [Range(0, double.MaxValue, ErrorMessage = "Monthly rent must be a positive value")]
    public decimal? MonthlyRent { get; set; }

    /// <summary>
    /// Current status of the room
    /// </summary>
    public RoomStatus? Status { get; set; }

    /// <summary>
    /// Floor number where the room is located
    /// </summary>
    [Range(0, 100)]
    public int? Floor { get; set; }

    /// <summary>
    /// Area of the room in square meters
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? Area { get; set; }

    /// <summary>
    /// Description or additional notes about the room
    /// </summary>
    [StringLength(1000)]
    public string? Description { get; set; }

    /// <summary>
    /// Whether the room has air conditioning
    /// </summary>
    public bool? HasAirConditioning { get; set; }

    /// <summary>
    /// Whether the room has a private bathroom
    /// </summary>
    public bool? HasPrivateBathroom { get; set; }

    /// <summary>
    /// Whether the room is furnished
    /// </summary>
    public bool? IsFurnished { get; set; }
}

/// <summary>
/// DTO for room information response
/// </summary>
public class RoomDto
{
    /// <summary>
    /// Unique identifier for the room
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Room number for identification
    /// </summary>
    public string RoomNumber { get; set; } = string.Empty;

    /// <summary>
    /// Type of room
    /// </summary>
    public RoomType Type { get; set; }

    /// <summary>
    /// Type of room as string
    /// </summary>
    public string TypeName { get; set; } = string.Empty;

    /// <summary>
    /// Monthly rent price for the room
    /// </summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Current status of the room
    /// </summary>
    public RoomStatus Status { get; set; }

    /// <summary>
    /// Status of the room as string
    /// </summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>
    /// Floor number where the room is located
    /// </summary>
    public int Floor { get; set; }

    /// <summary>
    /// Area of the room in square meters
    /// </summary>
    public decimal? Area { get; set; }

    /// <summary>
    /// Description or additional notes about the room
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Whether the room has air conditioning
    /// </summary>
    public bool HasAirConditioning { get; set; }

    /// <summary>
    /// Whether the room has a private bathroom
    /// </summary>
    public bool HasPrivateBathroom { get; set; }

    /// <summary>
    /// Whether the room is furnished
    /// </summary>
    public bool IsFurnished { get; set; }

    /// <summary>
    /// Current tenant information (if occupied)
    /// </summary>
    public TenantSummaryDto? CurrentTenant { get; set; }

    /// <summary>
    /// When the room was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the room was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for room search and filter parameters
/// </summary>
public class RoomSearchDto
{
    /// <summary>
    /// Search term for room number or description
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by room type
    /// </summary>
    public RoomType? Type { get; set; }

    /// <summary>
    /// Filter by room status
    /// </summary>
    public RoomStatus? Status { get; set; }

    /// <summary>
    /// Filter by floor number
    /// </summary>
    public int? Floor { get; set; }

    /// <summary>
    /// Minimum monthly rent
    /// </summary>
    public decimal? MinRent { get; set; }

    /// <summary>
    /// Maximum monthly rent
    /// </summary>
    public decimal? MaxRent { get; set; }

    /// <summary>
    /// Filter by air conditioning availability
    /// </summary>
    public bool? HasAirConditioning { get; set; }

    /// <summary>
    /// Filter by private bathroom availability
    /// </summary>
    public bool? HasPrivateBathroom { get; set; }

    /// <summary>
    /// Filter by furnished status
    /// </summary>
    public bool? IsFurnished { get; set; }

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
    public string SortBy { get; set; } = "RoomNumber";

    /// <summary>
    /// Sort direction (asc/desc)
    /// </summary>
    public string SortDirection { get; set; } = "asc";
}
