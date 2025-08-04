using System.ComponentModel.DataAnnotations;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for creating a new tenant
/// </summary>
public class CreateTenantDto
{
    /// <summary>
    /// Tenant's first name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's last name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's email address
    /// </summary>
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's phone number
    /// </summary>
    [Required]
    [Phone]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Tenant's national ID or identification number
    /// </summary>
    [StringLength(50)]
    public string IdentificationNumber { get; set; } = string.Empty;

    /// <summary>
    /// Emergency contact name
    /// </summary>
    [StringLength(200)]
    public string EmergencyContactName { get; set; } = string.Empty;

    /// <summary>
    /// Emergency contact phone number
    /// </summary>
    [StringLength(20)]
    public string EmergencyContactPhone { get; set; } = string.Empty;

    /// <summary>
    /// Security deposit amount
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Monthly rent amount
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Additional notes about the tenant
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating an existing tenant
/// </summary>
public class UpdateTenantDto
{
    /// <summary>
    /// Tenant's first name
    /// </summary>
    [StringLength(100)]
    public string? FirstName { get; set; }

    /// <summary>
    /// Tenant's last name
    /// </summary>
    [StringLength(100)]
    public string? LastName { get; set; }

    /// <summary>
    /// Tenant's email address
    /// </summary>
    [EmailAddress]
    [StringLength(255)]
    public string? Email { get; set; }

    /// <summary>
    /// Tenant's phone number
    /// </summary>
    [Phone]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Tenant's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Tenant's national ID or identification number
    /// </summary>
    [StringLength(50)]
    public string? IdentificationNumber { get; set; }

    /// <summary>
    /// Emergency contact name
    /// </summary>
    [StringLength(200)]
    public string? EmergencyContactName { get; set; }

    /// <summary>
    /// Emergency contact phone number
    /// </summary>
    [StringLength(20)]
    public string? EmergencyContactPhone { get; set; }

    /// <summary>
    /// Security deposit amount
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? SecurityDeposit { get; set; }

    /// <summary>
    /// Monthly rent amount
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? MonthlyRent { get; set; }

    /// <summary>
    /// Whether the tenant is active
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Additional notes about the tenant
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for assigning a tenant to a room
/// </summary>
public class AssignTenantToRoomDto
{
    /// <summary>
    /// ID of the room to assign
    /// </summary>
    [Required]
    public int RoomId { get; set; }

    /// <summary>
    /// When the rental contract starts
    /// </summary>
    [Required]
    public DateTime ContractStartDate { get; set; }

    /// <summary>
    /// When the rental contract ends
    /// </summary>
    [Required]
    public DateTime ContractEndDate { get; set; }

    /// <summary>
    /// Monthly rent for this assignment (optional, defaults to room rent)
    /// </summary>
    public decimal? MonthlyRent { get; set; }
}

/// <summary>
/// DTO for tenant information response
/// </summary>
public class TenantDto
{
    /// <summary>
    /// Unique identifier for the tenant
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Tenant's first name
    /// </summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's last name
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's full name
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's phone number
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Tenant's age (calculated from date of birth)
    /// </summary>
    public int? Age { get; set; }

    /// <summary>
    /// Tenant's national ID or identification number
    /// </summary>
    public string IdentificationNumber { get; set; } = string.Empty;

    /// <summary>
    /// Emergency contact name
    /// </summary>
    public string EmergencyContactName { get; set; } = string.Empty;

    /// <summary>
    /// Emergency contact phone number
    /// </summary>
    public string EmergencyContactPhone { get; set; } = string.Empty;

    /// <summary>
    /// Information about the assigned room
    /// </summary>
    public RoomSummaryDto? Room { get; set; }

    /// <summary>
    /// When the rental contract started
    /// </summary>
    public DateTime? ContractStartDate { get; set; }

    /// <summary>
    /// When the rental contract ends
    /// </summary>
    public DateTime? ContractEndDate { get; set; }

    /// <summary>
    /// Security deposit amount
    /// </summary>
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Monthly rent amount
    /// </summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Whether the tenant is active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Whether the tenant has an active contract
    /// </summary>
    public bool HasActiveContract { get; set; }

    /// <summary>
    /// Additional notes about the tenant
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the tenant was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the tenant was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for tenant summary information
/// </summary>
public class TenantSummaryDto
{
    /// <summary>
    /// Unique identifier for the tenant
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Tenant's full name
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Tenant's phone number
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// When the rental contract started
    /// </summary>
    public DateTime? ContractStartDate { get; set; }

    /// <summary>
    /// When the rental contract ends
    /// </summary>
    public DateTime? ContractEndDate { get; set; }

    /// <summary>
    /// Whether the tenant has an active contract
    /// </summary>
    public bool HasActiveContract { get; set; }
}

/// <summary>
/// DTO for room summary information
/// </summary>
public class RoomSummaryDto
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
    /// Type of room as string
    /// </summary>
    public string TypeName { get; set; } = string.Empty;

    /// <summary>
    /// Monthly rent price for the room
    /// </summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Floor number where the room is located
    /// </summary>
    public int Floor { get; set; }
}

/// <summary>
/// DTO for tenant search and filter parameters
/// </summary>
public class TenantSearchDto
{
    /// <summary>
    /// Search term for name, email, or phone
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Filter by room assignment status
    /// </summary>
    public bool? HasRoom { get; set; }

    /// <summary>
    /// Filter by active status
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Filter by contract status
    /// </summary>
    public bool? HasActiveContract { get; set; }

    /// <summary>
    /// Filter by specific room ID
    /// </summary>
    public int? RoomId { get; set; }

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
    public string SortBy { get; set; } = "LastName";

    /// <summary>
    /// Sort direction (asc/desc)
    /// </summary>
    public string SortDirection { get; set; } = "asc";
}
