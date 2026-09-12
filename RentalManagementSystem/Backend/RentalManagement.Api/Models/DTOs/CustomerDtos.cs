using System.ComponentModel.DataAnnotations;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for creating a new customer.
/// Rent and deposit are not captured here — they belong to a rental contract.
/// </summary>
public class CreateCustomerDto
{
    /// <summary>
    /// Customer's first name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's last name
    /// </summary>
    [Required]
    [StringLength(100)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's email address
    /// </summary>
    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Customer's phone number
    /// </summary>
    [Required]
    [Phone]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Customer's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Customer's national ID or identification number
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
    /// Additional notes about the customer
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating an existing customer
/// </summary>
public class UpdateCustomerDto
{
    /// <summary>
    /// Customer's first name
    /// </summary>
    [StringLength(100)]
    public string? FirstName { get; set; }

    /// <summary>
    /// Customer's last name
    /// </summary>
    [StringLength(100)]
    public string? LastName { get; set; }

    /// <summary>
    /// Customer's email address
    /// </summary>
    [EmailAddress]
    [StringLength(255)]
    public string? Email { get; set; }

    /// <summary>
    /// Customer's phone number
    /// </summary>
    [Phone]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Customer's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Customer's national ID or identification number
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
    /// Whether the customer is active
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Additional notes about the customer
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for assigning a customer to a room. Creates an active rental contract.
/// </summary>
public class AssignCustomerToRoomDto
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

    /// <summary>
    /// Security deposit for this assignment
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal SecurityDeposit { get; set; }
}

/// <summary>
/// DTO for customer information response.
/// Rental fields are derived from the customer's currently active contract.
/// </summary>
public class CustomerDto
{
    /// <summary>
    /// Unique identifier for the customer
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Customer's first name
    /// </summary>
    public string FirstName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's last name
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's full name
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Customer's phone number
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Customer's date of birth
    /// </summary>
    public DateTime? DateOfBirth { get; set; }

    /// <summary>
    /// Customer's age (calculated from date of birth)
    /// </summary>
    public int? Age { get; set; }

    /// <summary>
    /// Customer's national ID or identification number
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
    /// ID of the currently active contract, if any
    /// </summary>
    public int? ActiveContractId { get; set; }

    /// <summary>
    /// Room under the currently active contract, if any
    /// </summary>
    public RoomSummaryDto? Room { get; set; }

    /// <summary>
    /// Start date of the currently active contract
    /// </summary>
    public DateTime? ContractStartDate { get; set; }

    /// <summary>
    /// End date of the currently active contract
    /// </summary>
    public DateTime? ContractEndDate { get; set; }

    /// <summary>
    /// Security deposit held under the currently active contract
    /// </summary>
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Monthly rent under the currently active contract
    /// </summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Whether the customer is active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Whether the customer has a currently active contract
    /// </summary>
    public bool HasActiveContract { get; set; }

    /// <summary>
    /// Total number of contracts this customer has held
    /// </summary>
    public int ContractCount { get; set; }

    /// <summary>
    /// Additional notes about the customer
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the customer was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the customer was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for customer summary information
/// </summary>
public class CustomerSummaryDto
{
    /// <summary>
    /// Unique identifier for the customer
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Customer's full name
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Customer's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Customer's phone number
    /// </summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Start date of the currently active contract
    /// </summary>
    public DateTime? ContractStartDate { get; set; }

    /// <summary>
    /// End date of the currently active contract
    /// </summary>
    public DateTime? ContractEndDate { get; set; }

    /// <summary>
    /// Whether the customer has a currently active contract
    /// </summary>
    public bool HasActiveContract { get; set; }
}

/// <summary>
/// DTO for customer search and filter parameters
/// </summary>
public class CustomerSearchDto
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
