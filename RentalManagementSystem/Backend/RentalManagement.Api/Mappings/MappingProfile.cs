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
        ConfigureItemMappings();
        ConfigureInvoiceItemMappings();
        ConfigureLanguageMappings();
        ConfigureSystemSettingMappings();
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
            .ForMember(dest => dest.Payments, opt => opt.MapFrom(src => src.Payments))
            .ForMember(dest => dest.InvoiceItems, opt => opt.MapFrom(src => src.InvoiceItems));

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
            .ForMember(dest => dest.Payments, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceItems, opt => opt.Ignore());

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
            .ForMember(dest => dest.InvoiceItems, opt => opt.Ignore())
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

    /// <summary>
    /// Configures mappings for Item entities and DTOs
    /// </summary>
    private void ConfigureItemMappings()
    {
        CreateMap<Item, ItemDto>();

        CreateMap<Item, ItemSummaryDto>();

        CreateMap<CreateItemDto, Item>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));

        CreateMap<UpdateItemDto, Item>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// Configures mappings for InvoiceItem entities and DTOs
    /// </summary>
    private void ConfigureInvoiceItemMappings()
    {
        CreateMap<InvoiceItem, InvoiceItemDto>();

        CreateMap<CreateInvoiceItemDto, InvoiceItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceId, opt => opt.Ignore())
            .ForMember(dest => dest.Invoice, opt => opt.Ignore())
            .ForMember(dest => dest.TaxAmount, opt => opt.Ignore()) // Will be calculated
            .ForMember(dest => dest.LineTotal, opt => opt.Ignore()) // Will be calculated
            .ForMember(dest => dest.LineTotalWithTax, opt => opt.Ignore()) // Will be calculated
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));

        CreateMap<UpdateInvoiceItemDto, InvoiceItem>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceId, opt => opt.Ignore())
            .ForMember(dest => dest.Invoice, opt => opt.Ignore())
            .ForMember(dest => dest.TaxAmount, opt => opt.Ignore()) // Will be recalculated
            .ForMember(dest => dest.LineTotal, opt => opt.Ignore()) // Will be recalculated
            .ForMember(dest => dest.LineTotalWithTax, opt => opt.Ignore()) // Will be recalculated
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// Configures mappings for Language and Translation entities and DTOs
    /// </summary>
    private void ConfigureLanguageMappings()
    {
        CreateMap<Language, LanguageDto>();

        CreateMap<CreateLanguageDto, Language>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.Translations, opt => opt.Ignore());

        CreateMap<Translation, TranslationDto>();
    }

    /// <summary>
    /// Configures mappings for SystemSetting entities and DTOs
    /// </summary>
    private void ConfigureSystemSettingMappings()
    {
        CreateMap<SystemSetting, SystemSettingDto>();

        CreateMap<CreateSystemSettingDto, SystemSetting>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.ModifiedBy, opt => opt.Ignore());

        CreateMap<UpdateSystemSettingDto, SystemSetting>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.Key, opt => opt.Ignore())
            .ForMember(dest => dest.Category, opt => opt.Ignore())
            .ForMember(dest => dest.DataType, opt => opt.Ignore())
            .ForMember(dest => dest.IsEditable, opt => opt.Ignore())
            .ForMember(dest => dest.IsVisible, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.ModifiedBy, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }
}
