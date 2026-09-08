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
/// The payment ledger: recording money against an invoice has to move
/// RemainingBalance by exactly the amount paid and flip Status only when the
/// invoice is genuinely settled.
/// </summary>
[Collection(PostgresCollection.Name)]
public class PaymentServiceTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly IMapper _mapper;

    private static readonly DateTime PaidOn = new(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);

    private int _tenantId;
    private int _roomId;

    public PaymentServiceTests(PostgresFixture fixture)
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

    private PaymentService CreateService(RentalManagementContext context) =>
        new(context, _mapper, NullLogger<PaymentService>.Instance);

    /// <summary>
    /// Writes an issued invoice for the given amount and returns its id.
    /// </summary>
    private async Task<int> SeedInvoiceAsync(decimal totalAmount)
    {
        await using var context = _fixture.CreateContext();

        var invoice = new Invoice
        {
            TenantId = _tenantId,
            RoomId = _roomId,
            InvoiceNumber = $"INV-TEST-{Guid.NewGuid():N}"[..20],
            MonthlyRent = totalAmount,
            TotalAmount = totalAmount,
            RemainingBalance = totalAmount,
            BillingPeriod = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            IssueDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            DueDate = new DateTime(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc),
            Status = InvoiceStatus.Issued
        };

        context.Invoices.Add(invoice);
        await context.SaveChangesAsync();

        return invoice.Id;
    }

    private static CreatePaymentDto Pay(int invoiceId, decimal amount) => new()
    {
        InvoiceId = invoiceId,
        Amount = amount,
        Method = PaymentMethod.Cash,
        PaymentDate = PaidOn
    };

    private async Task<Invoice> LoadInvoiceAsync(int invoiceId)
    {
        await using var context = _fixture.CreateContext();
        return await context.Invoices.SingleAsync(i => i.Id == invoiceId);
    }

    [Fact]
    public async Task CreatePayment_ForPartOfTheBill_ReducesTheBalanceByThatMuch()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 300m));
            Assert.True(result.Success, result.Message);
            Assert.Equal(300m, result.Data!.Amount);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(300m, invoice.PaidAmount);
        Assert.Equal(700m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
        Assert.Null(invoice.PaidDate);
    }

    [Fact]
    public async Task CreatePayment_InInstalments_TracksTheRunningBalance()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        foreach (var (amount, expectedBalance) in new[] { (250m, 750m), (250m, 500m), (100m, 400m) })
        {
            await using var context = _fixture.CreateContext();
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, amount));

            Assert.True(result.Success, result.Message);

            var invoice = await context.Invoices.SingleAsync(i => i.Id == invoiceId);
            Assert.Equal(expectedBalance, invoice.RemainingBalance);
            Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
        }

        await using var verify = _fixture.CreateContext();
        Assert.Equal(3, await verify.Payments.CountAsync(p => p.InvoiceId == invoiceId));
        Assert.Equal(600m, await verify.Payments.Where(p => p.InvoiceId == invoiceId).SumAsync(p => p.Amount));
    }

    [Fact]
    public async Task CreatePayment_SettlingTheBill_MarksItPaid()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 1_000m));
            Assert.True(result.Success, result.Message);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(1_000m, invoice.PaidAmount);
        Assert.Equal(0m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.Equal(PaidOn, invoice.PaidDate);
    }

    [Fact]
    public async Task CreatePayment_FinalInstalment_MarksItPaid()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        await using (var first = _fixture.CreateContext())
        {
            Assert.True((await CreateService(first).CreatePaymentAsync(Pay(invoiceId, 999.99m))).Success);
        }

        await using (var second = _fixture.CreateContext())
        {
            Assert.True((await CreateService(second).CreatePaymentAsync(Pay(invoiceId, 0.01m))).Success);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(0m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
    }

    // --- Overpayment -----------------------------------------------------------

    [Fact]
    public async Task CreatePayment_ForMoreThanIsOwed_IsRejectedAndChangesNothing()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 1_000.01m));

            Assert.False(result.Success);
            Assert.Equal("Payment amount cannot exceed remaining balance", result.Message);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(0m, invoice.PaidAmount);
        Assert.Equal(1_000m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.Issued, invoice.Status);

        // The rejected payment must leave no row behind.
        await using var verify = _fixture.CreateContext();
        Assert.Empty(await verify.Payments.ToListAsync());
    }

    [Fact]
    public async Task CreatePayment_ForMoreThanTheRemainderOfAPartlyPaidBill_IsRejected()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        await using (var context = _fixture.CreateContext())
        {
            Assert.True((await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 600m))).Success);
        }

        await using (var context = _fixture.CreateContext())
        {
            // 400 is owed; 401 is not accepted.
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 401m));
            Assert.False(result.Success);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(600m, invoice.PaidAmount);
        Assert.Equal(400m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
    }

    [Fact]
    public async Task CreatePayment_AgainstASettledBill_IsRejected()
    {
        var invoiceId = await SeedInvoiceAsync(500m);

        await using (var context = _fixture.CreateContext())
        {
            Assert.True((await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 500m))).Success);
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 0.01m));
            Assert.False(result.Success);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(500m, invoice.PaidAmount);
        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
    }

    [Fact]
    public async Task CreatePayment_ForAnInvoiceThatDoesNotExist_IsRejected()
    {
        await using var context = _fixture.CreateContext();

        var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId: 424242, amount: 10m));

        Assert.False(result.Success);
        Assert.Equal("Invoice not found", result.Message);
    }

    // --- Reversals -------------------------------------------------------------

    [Fact]
    public async Task DeletePayment_PutsTheMoneyBackOnTheInvoice()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        int paymentId;
        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 400m));
            Assert.True(result.Success, result.Message);
            paymentId = result.Data!.Id;
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).DeletePaymentAsync(paymentId);
            Assert.True(result.Success, result.Message);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(0m, invoice.PaidAmount);
        Assert.Equal(1_000m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.Issued, invoice.Status);
        Assert.Null(invoice.PaidDate);
    }

    [Fact]
    public async Task DeletePayment_OnASettledInvoice_ReopensIt()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        int secondPaymentId;
        await using (var context = _fixture.CreateContext())
        {
            Assert.True((await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 600m))).Success);
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 400m));
            Assert.True(result.Success, result.Message);
            secondPaymentId = result.Data!.Id;
        }

        Assert.Equal(InvoiceStatus.Paid, (await LoadInvoiceAsync(invoiceId)).Status);

        await using (var context = _fixture.CreateContext())
        {
            Assert.True((await CreateService(context).DeletePaymentAsync(secondPaymentId)).Success);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(600m, invoice.PaidAmount);
        Assert.Equal(400m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
        Assert.Null(invoice.PaidDate);
    }

    [Fact]
    public async Task DeletePayment_OnceVerified_IsRefused()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        int paymentId;
        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 400m));
            Assert.True(result.Success, result.Message);
            paymentId = result.Data!.Id;
        }

        await using (var context = _fixture.CreateContext())
        {
            Assert.True((await CreateService(context).VerifyPaymentAsync(paymentId)).Success);
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).DeletePaymentAsync(paymentId);
            Assert.False(result.Success);
            Assert.Equal("Cannot delete a verified payment", result.Message);
        }

        // The balance is untouched by the refused deletion.
        var invoice = await LoadInvoiceAsync(invoiceId);
        Assert.Equal(600m, invoice.RemainingBalance);
    }

    [Fact]
    public async Task UpdatePayment_ToASmallerAmount_GivesTheDifferenceBack()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        int paymentId;
        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 800m));
            Assert.True(result.Success, result.Message);
            paymentId = result.Data!.Id;
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).UpdatePaymentAsync(paymentId, Pay(invoiceId, 500m));
            Assert.True(result.Success, result.Message);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(500m, invoice.PaidAmount);
        Assert.Equal(500m, invoice.RemainingBalance);
        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
    }

    [Fact]
    public async Task UpdatePayment_BeyondWhatIsOwed_IsRejected()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        int paymentId;
        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 800m));
            Assert.True(result.Success, result.Message);
            paymentId = result.Data!.Id;
        }

        await using (var context = _fixture.CreateContext())
        {
            var result = await CreateService(context).UpdatePaymentAsync(paymentId, Pay(invoiceId, 1_000.01m));
            Assert.False(result.Success);
        }

        var invoice = await LoadInvoiceAsync(invoiceId);

        Assert.Equal(800m, invoice.PaidAmount);
        Assert.Equal(200m, invoice.RemainingBalance);
    }

    [Fact]
    public async Task CreatePayment_ConcurrentlyOnOneInvoice_CannotCollectMoreThanIsOwed()
    {
        var invoiceId = await SeedInvoiceAsync(1_000m);

        // Ten tills taking 600 each against a 1000 invoice. Only one of them fits.
        var results = await Task.WhenAll(Enumerable.Range(0, 10).Select(async _ =>
        {
            await using var context = _fixture.CreateContext();
            return await CreateService(context).CreatePaymentAsync(Pay(invoiceId, 600m));
        }));

        await using var verify = _fixture.CreateContext();
        var invoice = await verify.Invoices.SingleAsync(i => i.Id == invoiceId);
        var recorded = await verify.Payments.Where(p => p.InvoiceId == invoiceId).SumAsync(p => p.Amount);

        // The invariant that has to hold however the requests interleave: the money
        // booked against the invoice is the money the payment rows say was taken.
        Assert.Equal(recorded, invoice.PaidAmount);
        Assert.Equal(invoice.TotalAmount - recorded, invoice.RemainingBalance);
        Assert.Equal(1, results.Count(r => r.Success));
    }
}
