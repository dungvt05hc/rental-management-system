using AutoMapper;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Mappings;

/// <summary>
/// AutoMapper profile for mapping between entities and DTOs
/// Handles automatic conversion between domain models and API contracts
/// </summary>
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        ConfigureUserMappings();
        ConfigureRoomMappings();
        ConfigureTenantMappings();
        ConfigureInvoiceMappings();
        ConfigurePaymentMappings();
    }

    /// <summary>
    /// Configures mappings for User entities and DTOs
    /// </summary>
    private void ConfigureUserMappings()
    {
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.Roles, opt => opt.Ignore()); // Roles will be populated separately

        CreateMap<RegisterRequestDto, User>()
            .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email))
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));
    }

    /// <summary>
    /// Configures mappings for Room entities and DTOs
    /// </summary>
    private void ConfigureRoomMappings()
    {
        CreateMap<Room, RoomDto>()
            .ForMember(dest => dest.TypeName, opt => opt.MapFrom(src => src.Type.ToString()))
            .ForMember(dest => dest.StatusName, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.CurrentTenant, opt => opt.MapFrom(src => 
                src.Tenants.FirstOrDefault(t => t.IsActive && t.HasActiveContract)));

        CreateMap<Room, RoomSummaryDto>()
            .ForMember(dest => dest.TypeName, opt => opt.MapFrom(src => src.Type.ToString()));

        CreateMap<CreateRoomDto, Room>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => RoomStatus.Vacant))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Tenants, opt => opt.Ignore())
            .ForMember(dest => dest.Invoices, opt => opt.Ignore());

        CreateMap<UpdateRoomDto, Room>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Tenants, opt => opt.Ignore())
            .ForMember(dest => dest.Invoices, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// Configures mappings for Tenant entities and DTOs
    /// </summary>
    private void ConfigureTenantMappings()
    {
        CreateMap<Tenant, TenantDto>()
            .ForMember(dest => dest.Age, opt => opt.MapFrom(src => 
                src.DateOfBirth.HasValue 
                    ? DateTime.UtcNow.Year - src.DateOfBirth.Value.Year - 
                      (DateTime.UtcNow.DayOfYear < src.DateOfBirth.Value.DayOfYear ? 1 : 0)
                    : (int?)null));

        CreateMap<Tenant, TenantSummaryDto>();

        CreateMap<CreateTenantDto, Tenant>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.RoomId, opt => opt.Ignore())
            .ForMember(dest => dest.Room, opt => opt.Ignore())
            .ForMember(dest => dest.ContractStartDate, opt => opt.Ignore())
            .ForMember(dest => dest.ContractEndDate, opt => opt.Ignore())
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Invoices, opt => opt.Ignore());

        CreateMap<UpdateTenantDto, Tenant>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.RoomId, opt => opt.Ignore())
            .ForMember(dest => dest.Room, opt => opt.Ignore())
            .ForMember(dest => dest.ContractStartDate, opt => opt.Ignore())
            .ForMember(dest => dest.ContractEndDate, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Invoices, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// Configures mappings for Invoice entities and DTOs
    /// </summary>
    private void ConfigureInvoiceMappings()
    {
        CreateMap<Invoice, InvoiceDto>()
            .ForMember(dest => dest.StatusName, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.Payments, opt => opt.MapFrom(src => src.Payments));

        CreateMap<Invoice, InvoiceSummaryDto>()
            .ForMember(dest => dest.StatusName, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.TenantName, opt => opt.MapFrom(src => src.Tenant.FullName))
            .ForMember(dest => dest.RoomNumber, opt => opt.MapFrom(src => src.Room.RoomNumber));

        CreateMap<CreateInvoiceDto, Invoice>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceNumber, opt => opt.Ignore()) // Will be generated
            .ForMember(dest => dest.Tenant, opt => opt.Ignore())
            .ForMember(dest => dest.Room, opt => opt.Ignore())
            .ForMember(dest => dest.MonthlyRent, opt => opt.Ignore()) // Will be set from tenant/room
            .ForMember(dest => dest.TotalAmount, opt => opt.Ignore()) // Will be calculated
            .ForMember(dest => dest.PaidAmount, opt => opt.MapFrom(_ => 0m))
            .ForMember(dest => dest.RemainingBalance, opt => opt.Ignore()) // Will be calculated
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => InvoiceStatus.Issued))
            .ForMember(dest => dest.IssueDate, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.PaidDate, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Payments, opt => opt.Ignore());

        CreateMap<UpdateInvoiceDto, Invoice>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceNumber, opt => opt.Ignore())
            .ForMember(dest => dest.TenantId, opt => opt.Ignore())
            .ForMember(dest => dest.Tenant, opt => opt.Ignore())
            .ForMember(dest => dest.RoomId, opt => opt.Ignore())
            .ForMember(dest => dest.Room, opt => opt.Ignore())
            .ForMember(dest => dest.MonthlyRent, opt => opt.Ignore())
            .ForMember(dest => dest.TotalAmount, opt => opt.Ignore()) // Will be recalculated
            .ForMember(dest => dest.PaidAmount, opt => opt.Ignore())
            .ForMember(dest => dest.RemainingBalance, opt => opt.Ignore()) // Will be recalculated
            .ForMember(dest => dest.BillingPeriod, opt => opt.Ignore())
            .ForMember(dest => dest.IssueDate, opt => opt.Ignore())
            .ForMember(dest => dest.PaidDate, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Payments, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// Configures mappings for Payment entities and DTOs
    /// </summary>
    private void ConfigurePaymentMappings()
    {
        CreateMap<Payment, PaymentDto>()
            .ForMember(dest => dest.MethodName, opt => opt.MapFrom(src => src.Method.ToString()));

        CreateMap<Payment, PaymentSummaryDto>()
            .ForMember(dest => dest.MethodName, opt => opt.MapFrom(src => src.Method.ToString()));

        CreateMap<CreatePaymentDto, Payment>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.Invoice, opt => opt.Ignore())
            .ForMember(dest => dest.RecordedDate, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.RecordedByUserId, opt => opt.Ignore()) // Will be set by service
            .ForMember(dest => dest.IsVerified, opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));
    }
}
