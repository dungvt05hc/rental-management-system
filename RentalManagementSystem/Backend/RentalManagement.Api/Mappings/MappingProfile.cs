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
        ConfigureCustomerMappings();
        ConfigureRentalContractMappings();
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

        // Đăng ký bằng mã mời. Không có ánh xạ nào chạm tới role hay IsActive:
        // role đến từ mã mời, còn EmailConfirmed do AuthService đặt tường minh.
        CreateMap<SelfRegisterDto, User>()
            .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email.Trim()))
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email.Trim()))
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
            .ForMember(dest => dest.CurrentCustomer, opt => opt.MapFrom(src =>
                src.RentalContracts
                   .Where(c => c.Status == RentalContractStatus.Active)
                   .OrderByDescending(c => c.StartDate)
                   .Select(c => c.Customer)
                   .FirstOrDefault()));

        CreateMap<Room, RoomSummaryDto>()
            .ForMember(dest => dest.TypeName, opt => opt.MapFrom(src => src.Type.ToString()));

        CreateMap<CreateRoomDto, Room>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.Status, opt => opt.MapFrom(_ => RoomStatus.Vacant))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.RentalContracts, opt => opt.Ignore())
            .ForMember(dest => dest.Invoices, opt => opt.Ignore());

        CreateMap<UpdateRoomDto, Room>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.RentalContracts, opt => opt.Ignore())
            .ForMember(dest => dest.Invoices, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// Configures mappings for Customer entities and DTOs
    /// </summary>
    private void ConfigureCustomerMappings()
    {
        // Rental fields on CustomerDto are derived from the customer's active contract,
        // so the pre-rename API shape survives the split onto RentalContract.
        CreateMap<Customer, CustomerDto>()
            .ForMember(dest => dest.Age, opt => opt.MapFrom(src =>
                src.DateOfBirth.HasValue
                    ? DateTime.UtcNow.Year - src.DateOfBirth.Value.Year -
                      (DateTime.UtcNow.DayOfYear < src.DateOfBirth.Value.DayOfYear ? 1 : 0)
                    : (int?)null))
            .ForMember(dest => dest.ActiveContractId, opt => opt.Ignore())
            .ForMember(dest => dest.Room, opt => opt.Ignore())
            .ForMember(dest => dest.ContractStartDate, opt => opt.Ignore())
            .ForMember(dest => dest.ContractEndDate, opt => opt.Ignore())
            .ForMember(dest => dest.MonthlyRent, opt => opt.Ignore())
            .ForMember(dest => dest.SecurityDeposit, opt => opt.Ignore())
            .ForMember(dest => dest.HasActiveContract, opt => opt.Ignore())
            .ForMember(dest => dest.ContractCount, opt => opt.MapFrom(src => src.RentalContracts.Count))
            .AfterMap((src, dest, ctx) =>
            {
                var contract = ActiveContract(src);
                if (contract == null)
                {
                    return;
                }

                dest.ActiveContractId = contract.Id;
                dest.ContractStartDate = contract.StartDate;
                dest.ContractEndDate = contract.EndDate;
                dest.MonthlyRent = contract.MonthlyRent;
                dest.SecurityDeposit = contract.SecurityDeposit;
                dest.HasActiveContract = true;
                dest.Room = contract.Room == null ? null : ctx.Mapper.Map<RoomSummaryDto>(contract.Room);
            });

        CreateMap<Customer, CustomerSummaryDto>()
            .ForMember(dest => dest.ContractStartDate, opt => opt.Ignore())
            .ForMember(dest => dest.ContractEndDate, opt => opt.Ignore())
            .ForMember(dest => dest.HasActiveContract, opt => opt.Ignore())
            .AfterMap((src, dest) =>
            {
                var contract = ActiveContract(src);
                if (contract == null)
                {
                    return;
                }

                dest.ContractStartDate = contract.StartDate;
                dest.ContractEndDate = contract.EndDate;
                dest.HasActiveContract = true;
            });

        CreateMap<CreateCustomerDto, Customer>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => true))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.RentalContracts, opt => opt.Ignore())
            .ForMember(dest => dest.Invoices, opt => opt.Ignore());

        CreateMap<UpdateCustomerDto, Customer>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.RentalContracts, opt => opt.Ignore())
            .ForMember(dest => dest.Invoices, opt => opt.Ignore())
            .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember is not null));
    }

    /// <summary>
    /// The customer's currently active contract, or null when they hold none.
    /// Requires RentalContracts (and their Room) to have been loaded.
    /// </summary>
    private static RentalContract? ActiveContract(Customer customer) =>
        customer.RentalContracts
            .Where(c => c.Status == RentalContractStatus.Active)
            .OrderByDescending(c => c.StartDate)
            .FirstOrDefault();

    /// <summary>
    /// Configures mappings for RentalContract entities and DTOs
    /// </summary>
    private void ConfigureRentalContractMappings()
    {
        CreateMap<RentalContract, RentalContractDto>()
            .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => src.Customer.FullName))
            .ForMember(dest => dest.StatusName, opt => opt.MapFrom(src => src.Status.ToString()))
            .ForMember(dest => dest.InvoiceCount, opt => opt.Ignore()); // Filled in by the service
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
            .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => src.Customer.FullName))
            .ForMember(dest => dest.RoomNumber, opt => opt.MapFrom(src => src.Room.RoomNumber));

        CreateMap<CreateInvoiceDto, Invoice>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.InvoiceNumber, opt => opt.Ignore()) // Will be generated
            .ForMember(dest => dest.Customer, opt => opt.Ignore())
            .ForMember(dest => dest.Room, opt => opt.Ignore())
            .ForMember(dest => dest.MonthlyRent, opt => opt.Ignore()) // Will be set from customer/room
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
            .ForMember(dest => dest.CustomerId, opt => opt.Ignore())
            .ForMember(dest => dest.Customer, opt => opt.Ignore())
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
