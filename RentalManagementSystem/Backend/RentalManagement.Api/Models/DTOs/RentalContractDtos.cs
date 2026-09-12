using System.ComponentModel.DataAnnotations;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Models.DTOs;

/// <summary>
/// DTO for creating a new rental contract
/// </summary>
public class CreateRentalContractDto
{
    /// <summary>
    /// ID of the customer taking the contract
    /// </summary>
    [Required]
    public int CustomerId { get; set; }

    /// <summary>
    /// ID of the room being rented
    /// </summary>
    [Required]
    public int RoomId { get; set; }

    /// <summary>
    /// When the contract starts
    /// </summary>
    [Required]
    public DateTime StartDate { get; set; }

    /// <summary>
    /// When the contract ends. Null for an open-ended contract.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Monthly rent for this contract (optional, defaults to the room's rent)
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? MonthlyRent { get; set; }

    /// <summary>
    /// Security deposit held for this contract
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Status to create the contract in. Defaults to Active.
    /// </summary>
    public RentalContractStatus Status { get; set; } = RentalContractStatus.Active;

    /// <summary>
    /// Additional notes about the contract
    /// </summary>
    [StringLength(1000)]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>
/// DTO for updating an existing rental contract.
/// Customer and room cannot be changed — end the contract and create a new one instead.
/// </summary>
public class UpdateRentalContractDto
{
    /// <summary>
    /// When the contract starts
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// When the contract ends
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Monthly rent for this contract
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? MonthlyRent { get; set; }

    /// <summary>
    /// Security deposit held for this contract
    /// </summary>
    [Range(0, double.MaxValue)]
    public decimal? SecurityDeposit { get; set; }

    /// <summary>
    /// Additional notes about the contract
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for ending a rental contract. The contract is never deleted.
/// </summary>
public class EndRentalContractDto
{
    /// <summary>
    /// Date the contract actually ended. Defaults to now.
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Reason or notes for ending the contract
    /// </summary>
    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>
/// DTO for rental contract information response
/// </summary>
public class RentalContractDto
{
    /// <summary>
    /// Unique identifier for the contract
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// ID of the customer holding this contract
    /// </summary>
    public int CustomerId { get; set; }

    /// <summary>
    /// Full name of the customer holding this contract
    /// </summary>
    public string CustomerName { get; set; } = string.Empty;

    /// <summary>
    /// ID of the room being rented
    /// </summary>
    public int RoomId { get; set; }

    /// <summary>
    /// The room being rented
    /// </summary>
    public RoomSummaryDto? Room { get; set; }

    /// <summary>
    /// When the contract starts
    /// </summary>
    public DateTime StartDate { get; set; }

    /// <summary>
    /// When the contract ends
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Monthly rent for this contract
    /// </summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>
    /// Security deposit held for this contract
    /// </summary>
    public decimal SecurityDeposit { get; set; }

    /// <summary>
    /// Current status of the contract
    /// </summary>
    public RentalContractStatus Status { get; set; }

    /// <summary>
    /// Current status of the contract as a display string
    /// </summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>
    /// Whether the contract is active and today falls inside its term
    /// </summary>
    public bool IsCurrentlyActive { get; set; }

    /// <summary>
    /// Number of invoices issued under this contract
    /// </summary>
    public int InvoiceCount { get; set; }

    /// <summary>
    /// Additional notes about the contract
    /// </summary>
    public string Notes { get; set; } = string.Empty;

    /// <summary>
    /// When the contract was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the contract was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for rental contract search and filter parameters
/// </summary>
public class RentalContractSearchDto
{
    /// <summary>
    /// Filter by customer
    /// </summary>
    public int? CustomerId { get; set; }

    /// <summary>
    /// Filter by room
    /// </summary>
    public int? RoomId { get; set; }

    /// <summary>
    /// Filter by contract status
    /// </summary>
    public RentalContractStatus? Status { get; set; }

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
    public string SortBy { get; set; } = "StartDate";

    /// <summary>
    /// Sort direction (asc/desc)
    /// </summary>
    public string SortDirection { get; set; } = "desc";
}
