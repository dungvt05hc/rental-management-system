using System.Text.RegularExpressions;
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
/// Data-integrity tests for invoice creation: unique numbering under concurrency
/// and all-or-nothing writes.
/// </summary>
[Collection(PostgresCollection.Name)]
public class InvoiceServiceIntegrityTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly IMapper _mapper;

    private int _customerId;
    private int _roomId;

    public InvoiceServiceIntegrityTests(PostgresFixture fixture)
    {
        _fixture = fixture;

        var configuration = new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>());
        _mapper = configuration.CreateMapper();
    }

    /// <summary>
    /// Each test starts from an empty invoice table with exactly one customer in one room.
    /// </summary>
    public async Task InitializeAsync()
    {
        await using var context = _fixture.CreateContext();

        await context.Database.ExecuteSqlRawAsync("""
            TRUNCATE "InvoiceItems", "Invoices", "Customers", "Rooms", "InvoiceNumberCounters"
            RESTART IDENTITY CASCADE;
            """);

        var room = new Room
        {
            RoomNumber = $"R{Guid.NewGuid():N}"[..8],
            MonthlyRent = 1_000m,
            Floor = 1
        };
        context.Rooms.Add(room);
        await context.SaveChangesAsync();

        var customer = new Customer
        {
            FirstName = "Test",
            LastName = "Customer",
            Email = $"{Guid.NewGuid():N}@example.test",
            IdentificationNumber = Guid.NewGuid().ToString("N"),
            IsActive = true
        };
        context.Customers.Add(customer);
        await context.SaveChangesAsync();

        context.RentalContracts.Add(new RentalContract
        {
            CustomerId = customer.Id,
            RoomId = room.Id,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            MonthlyRent = 1_000m,
            Status = RentalContractStatus.Active
        });
        await context.SaveChangesAsync();

        _roomId = room.Id;
        _customerId = customer.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private InvoiceService CreateService(RentalManagementContext context) =>
        new(context, _mapper, NullLogger<InvoiceService>.Instance);

    private CreateInvoiceDto BuildDto(List<CreateInvoiceItemDto>? items = null) => new()
    {
        CustomerId = _customerId,
        RoomId = _roomId,
        BillingPeriod = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
        DueDate = new DateTime(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc),
        InvoiceItems = items ?? new List<CreateInvoiceItemDto>()
    };

    [Fact]
    public async Task CreateInvoice_RunInParallel_GivesEveryInvoiceItsOwnNumber()
    {
        const int concurrentRequests = 50;

        // Each request gets its own DbContext, the way concurrent HTTP requests
        // each get their own scoped context.
        var results = await Task.WhenAll(Enumerable.Range(0, concurrentRequests).Select(async _ =>
        {
            await using var context = _fixture.CreateContext();
            var service = CreateService(context);
            return await service.CreateInvoiceAsync(BuildDto());
        }));

        Assert.All(results, r => Assert.True(r.Success, r.Message));

        var numbers = results.Select(r => r.Data!.InvoiceNumber).ToList();

        Assert.Equal(concurrentRequests, numbers.Distinct().Count());

        // The format customers already have on paper must not drift.
        Assert.All(numbers, n => Assert.Matches(@"^INV-\d{6}-\d{4}$", n));

        // 50 invoices in one month means a contiguous 0001..0050 run.
        var period = DateTime.UtcNow.ToString("yyyyMM");
        var expected = Enumerable.Range(1, concurrentRequests).Select(i => $"INV-{period}-{i:D4}");
        Assert.Equal(expected.OrderBy(x => x), numbers.OrderBy(x => x));
    }

    [Fact]
    public async Task CreateInvoice_WhenLineItemInsertFails_LeavesNoOrphanInvoice()
    {
        var dto = BuildDto(new List<CreateInvoiceItemDto>
        {
            new()
            {
                ItemCode = "OK-1",
                ItemName = "Electricity",
                Quantity = 1,
                UnitPrice = 100m,
                LineNumber = 1
            },
            new()
            {
                // ItemCode is varchar(50): this row is rejected by the database at
                // the line-item save, after the invoice row has been inserted.
                ItemCode = new string('X', 100),
                ItemName = "Water",
                Quantity = 1,
                UnitPrice = 50m,
                LineNumber = 2
            }
        });

        await using (var context = _fixture.CreateContext())
        {
            var service = CreateService(context);
            // Specifically the line-item insert being rejected, so this test cannot
            // pass on some unrelated failure earlier in the method.
            await Assert.ThrowsAsync<DbUpdateException>(() => service.CreateInvoiceAsync(dto));
        }

        // The invoice insert and the line-item insert have to roll back together.
        await using var verifyContext = _fixture.CreateContext();
        Assert.Empty(await verifyContext.Invoices.ToListAsync());
        Assert.Empty(await verifyContext.InvoiceItems.ToListAsync());
    }

    [Fact]
    public async Task CreateInvoice_WithLineItems_CommitsInvoiceAndItemsTogether()
    {
        var dto = BuildDto(new List<CreateInvoiceItemDto>
        {
            new() { ItemCode = "ELEC", ItemName = "Electricity", Quantity = 2, UnitPrice = 100m, LineNumber = 1 },
            new() { ItemCode = "WATER", ItemName = "Water", Quantity = 1, UnitPrice = 50m, LineNumber = 2 }
        });

        await using (var context = _fixture.CreateContext())
        {
            var service = CreateService(context);
            var result = await service.CreateInvoiceAsync(dto);
            Assert.True(result.Success, result.Message);
        }

        await using var verifyContext = _fixture.CreateContext();
        var invoice = await verifyContext.Invoices.Include(i => i.InvoiceItems).SingleAsync();

        Assert.Equal(2, invoice.InvoiceItems.Count);

        // The total on the committed row must match the items that were committed.
        Assert.Equal(invoice.InvoiceItems.Sum(i => i.LineTotalWithTax), invoice.TotalAmount);
        Assert.Equal(invoice.TotalAmount, invoice.RemainingBalance);
    }

    [Fact]
    public async Task GenerateMonthlyInvoices_GivesEachCustomerADistinctNumber()
    {
        await using (var seedContext = _fixture.CreateContext())
        {
            // Five more customers, each in their own room, all billed in one run.
            for (var i = 0; i < 5; i++)
            {
                var room = new Room { RoomNumber = $"M{i}-{Guid.NewGuid():N}"[..8], MonthlyRent = 500m, Floor = 2 };
                seedContext.Rooms.Add(room);
                await seedContext.SaveChangesAsync();

                var batchCustomer = new Customer
                {
                    FirstName = $"Batch{i}",
                    LastName = "Customer",
                    Email = $"{Guid.NewGuid():N}@example.test",
                    IdentificationNumber = Guid.NewGuid().ToString("N"),
                    IsActive = true
                };
                seedContext.Customers.Add(batchCustomer);
                await seedContext.SaveChangesAsync();

                seedContext.RentalContracts.Add(new RentalContract
                {
                    CustomerId = batchCustomer.Id,
                    RoomId = room.Id,
                    StartDate = DateTime.UtcNow.AddMonths(-1),
                    MonthlyRent = 500m,
                    Status = RentalContractStatus.Active
                });
            }

            await seedContext.SaveChangesAsync();
        }

        await using (var context = _fixture.CreateContext())
        {
            var service = CreateService(context);
            var result = await service.GenerateMonthlyInvoicesAsync(
                new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc));

            Assert.True(result.Success, result.Message);
            Assert.Equal(6, result.Data);
        }

        await using var verifyContext = _fixture.CreateContext();
        var numbers = await verifyContext.Invoices.Select(i => i.InvoiceNumber).ToListAsync();

        Assert.Equal(6, numbers.Count);
        Assert.Equal(6, numbers.Distinct().Count());
    }
}
