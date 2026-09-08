using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RentalManagement.Api.Data;
using RentalManagement.Api.Mappings;
using RentalManagement.Api.Models.DTOs;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services.Implementations;

namespace RentalManagement.Api.Tests;

/// <summary>
/// What an invoice ends up charging. The rule under test: when line items are
/// supplied, they — not the caller — decide the total.
/// Runs against real PostgreSQL because the money columns are decimal(18,2) and the
/// rounding they apply on write is part of the behaviour being checked.
/// </summary>
[Collection(PostgresCollection.Name)]
public class InvoiceTotalTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly IMapper _mapper;

    private int _tenantId;
    private int _roomId;

    public InvoiceTotalTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mapper = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();
    }

    public async Task InitializeAsync()
    {
        await using var context = _fixture.CreateContext();
        (_tenantId, _roomId) = await RentalTestData.ResetAndSeedTenantAsync(context, monthlyRent: 1_000m);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private InvoiceService CreateService(RentalManagementContext context) =>
        new(context, _mapper, NullLogger<InvoiceService>.Instance);

    private CreateInvoiceDto BuildDto(
        List<CreateInvoiceItemDto>? items = null,
        decimal additionalCharges = 0,
        decimal discount = 0) => new()
        {
            TenantId = _tenantId,
            RoomId = _roomId,
            AdditionalCharges = additionalCharges,
            Discount = discount,
            BillingPeriod = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            DueDate = new DateTime(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc),
            InvoiceItems = items ?? new List<CreateInvoiceItemDto>()
        };

    private static CreateInvoiceItemDto LineItem(
        string code,
        decimal quantity,
        decimal unitPrice,
        decimal discountPercent = 0,
        decimal taxPercent = 0,
        int lineNumber = 1) => new()
        {
            ItemCode = code,
            ItemName = code,
            Quantity = quantity,
            UnitPrice = unitPrice,
            DiscountPercent = discountPercent,
            TaxPercent = taxPercent,
            LineNumber = lineNumber
        };

    [Fact]
    public async Task CreateInvoice_WithNoLineItems_FallsBackToTheRoomRent()
    {
        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(
                BuildDto(additionalCharges: 150m, discount: 50m));

            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.SingleAsync();

        // 1000 rent + 150 charges - 50 discount
        Assert.Equal(1_100m, invoice.TotalAmount);
        Assert.Equal(1_100m, invoice.RemainingBalance);
    }

    [Fact]
    public async Task CreateInvoice_WithLineItems_IgnoresTheRoomRentAndUsesTheItems()
    {
        var items = new List<CreateInvoiceItemDto>
        {
            LineItem("ELEC", quantity: 2, unitPrice: 100.00m, lineNumber: 1),
            LineItem("WATER", quantity: 1, unitPrice: 50.00m, lineNumber: 2)
        };

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(BuildDto(items));
            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.SingleAsync();

        // 250 from the items, not the room's 1000.
        Assert.Equal(250.00m, invoice.TotalAmount);
        Assert.Equal(250.00m, invoice.RemainingBalance);
    }

    [Fact]
    public async Task CreateInvoice_WithDiscountedAndTaxedItems_ReplacesTheRentWithTheLineItems()
    {
        var items = new List<CreateInvoiceItemDto>
        {
            // 200 - 10% = 180, +10% tax = 198
            LineItem("A", quantity: 2, unitPrice: 100.00m, discountPercent: 10m, taxPercent: 10m, lineNumber: 1),
            // 100, +5% tax = 105
            LineItem("B", quantity: 1, unitPrice: 100.00m, taxPercent: 5m, lineNumber: 2)
        };

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(
                BuildDto(items, additionalCharges: 40m, discount: 25m));

            Assert.True(result.Success, result.Message);
            // 303 of line items, plus 40 of charges, less a 25 discount. The room's
            // 1000 rent plays no part once there are line items.
            Assert.Equal(318.00m, result.Data!.TotalAmount);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.Include(i => i.InvoiceItems).SingleAsync();

        Assert.Equal(303.00m, invoice.InvoiceItems.Sum(i => i.LineTotalWithTax));
        Assert.Equal(318.00m, invoice.TotalAmount);
        Assert.Equal(318.00m, invoice.RemainingBalance);
        Assert.Equal(40m, invoice.AdditionalCharges);
        Assert.Equal(25m, invoice.Discount);
    }

    [Fact]
    public async Task CreateInvoice_ThenUpdateWithNoItemChange_ComputesTheSameTotal()
    {
        // The regression guard for create and update drifting apart: whatever the
        // rule is, both paths have to apply it identically.
        var items = new List<CreateInvoiceItemDto>
        {
            LineItem("A", quantity: 2, unitPrice: 100.00m, discountPercent: 10m, taxPercent: 10m, lineNumber: 1),
            LineItem("B", quantity: 1, unitPrice: 100.00m, taxPercent: 5m, lineNumber: 2)
        };

        int invoiceId;
        decimal totalAfterCreate;

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(
                BuildDto(items, additionalCharges: 40m, discount: 25m));

            Assert.True(result.Success, result.Message);
            invoiceId = result.Data!.Id;
            totalAfterCreate = result.Data.TotalAmount;
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).UpdateInvoiceAsync(
                invoiceId, new UpdateInvoiceDto { Notes = "No change to the money" });

            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.SingleAsync();

        Assert.Equal(totalAfterCreate, invoice.TotalAmount);
    }

    [Fact]
    public async Task CreateInvoice_WithAZeroQuantityLine_ContributesNothing()
    {
        var items = new List<CreateInvoiceItemDto>
        {
            LineItem("REAL", quantity: 1, unitPrice: 80.00m, lineNumber: 1),
            LineItem("VOID", quantity: 0, unitPrice: 500.00m, taxPercent: 10m, lineNumber: 2)
        };

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(BuildDto(items));
            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.SingleAsync();

        Assert.Equal(80.00m, invoice.TotalAmount);
    }

    [Fact]
    public async Task CreateInvoice_WithAFullyDiscountedLine_ChargesTheRestOnly()
    {
        var items = new List<CreateInvoiceItemDto>
        {
            LineItem("FREE", quantity: 3, unitPrice: 200.00m, discountPercent: 100m, taxPercent: 10m, lineNumber: 1),
            LineItem("PAID", quantity: 1, unitPrice: 120.00m, lineNumber: 2)
        };

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(BuildDto(items));
            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.Include(i => i.InvoiceItems).SingleAsync();

        var freeLine = invoice.InvoiceItems.Single(i => i.ItemCode == "FREE");
        Assert.Equal(600.00m, freeLine.DiscountAmount);
        Assert.Equal(0m, freeLine.LineTotalWithTax);
        Assert.Equal(120.00m, invoice.TotalAmount);
    }

    [Fact]
    public async Task CreateInvoice_WithSubCentLineAmounts_TotalStillMatchesTheStoredLines()
    {
        // 0.5 x 20.01 = 10.005 per line, rounded to 10.01 as the line is calculated,
        // so the total is summed from the same figures the database stores: 30.03.
        var items = Enumerable.Range(1, 3)
            .Select(n => LineItem($"FRAC{n}", quantity: 0.5m, unitPrice: 20.01m, lineNumber: n))
            .ToList();

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(BuildDto(items));
            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.Include(i => i.InvoiceItems).SingleAsync();

        // The invariant that matters to a tenant reading the invoice: the total is
        // what the printed lines add up to.
        Assert.All(invoice.InvoiceItems, i => Assert.Equal(10.01m, i.LineTotalWithTax));
        Assert.Equal(30.03m, invoice.TotalAmount);
        Assert.Equal(invoice.InvoiceItems.Sum(i => i.LineTotalWithTax), invoice.TotalAmount);
        Assert.Equal(invoice.TotalAmount, invoice.RemainingBalance);
    }

    [Fact]
    public async Task UpdateInvoice_TouchingOnlyNotes_LeavesTheTotalAlone()
    {
        var items = new List<CreateInvoiceItemDto>
        {
            LineItem("ELEC", quantity: 1, unitPrice: 150.00m, lineNumber: 1)
        };

        int invoiceId;
        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreateInvoiceAsync(
                BuildDto(items, additionalCharges: 50m));

            Assert.True(result.Success, result.Message);
            Assert.Equal(200.00m, result.Data!.TotalAmount);
            invoiceId = result.Data.Id;
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).UpdateInvoiceAsync(
                invoiceId, new UpdateInvoiceDto { Notes = "Corrected the address" });

            Assert.True(result.Success, result.Message);
        }

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.SingleAsync();

        // Editing a note must not move money: create and update have to agree on how
        // AdditionalCharges combines with the line items.
        Assert.Equal(200.00m, invoice.TotalAmount);
        Assert.Equal(200.00m, invoice.RemainingBalance);
    }
}
