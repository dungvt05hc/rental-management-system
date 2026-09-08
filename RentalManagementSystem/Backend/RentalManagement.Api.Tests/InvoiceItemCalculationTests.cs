using RentalManagement.Api.Models.Entities;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Unit tests for <see cref="InvoiceItem.CalculateTotals"/> — the single place where
/// a line's money is decided. No database: this is arithmetic, and every invoice
/// total in the system is built out of these numbers.
/// </summary>
public class InvoiceItemCalculationTests
{
    private static InvoiceItem Item(
        decimal quantity,
        decimal unitPrice,
        decimal discountPercent = 0,
        decimal discountAmount = 0,
        decimal taxPercent = 0,
        decimal taxAmount = 0) => new()
        {
            ItemCode = "TEST",
            ItemName = "Test item",
            Quantity = quantity,
            UnitPrice = unitPrice,
            DiscountPercent = discountPercent,
            DiscountAmount = discountAmount,
            TaxPercent = taxPercent,
            TaxAmount = taxAmount
        };

    [Fact]
    public void CalculateTotals_QuantityTimesUnitPrice_IsTheLineTotal()
    {
        var item = Item(quantity: 3, unitPrice: 10.00m);

        item.CalculateTotals();

        Assert.Equal(0m, item.DiscountAmount);
        Assert.Equal(0m, item.TaxAmount);
        Assert.Equal(30.00m, item.LineTotal);
        Assert.Equal(30.00m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithDiscountPercent_DerivesTheDiscountAmount()
    {
        var item = Item(quantity: 2, unitPrice: 100.00m, discountPercent: 10m);

        item.CalculateTotals();

        Assert.Equal(20.00m, item.DiscountAmount);
        Assert.Equal(180.00m, item.LineTotal);
        Assert.Equal(180.00m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithTaxPercent_TaxesTheDiscountedTotal()
    {
        // Tax applies after the discount, not to the gross line.
        var item = Item(quantity: 2, unitPrice: 100.00m, discountPercent: 10m, taxPercent: 10m);

        item.CalculateTotals();

        Assert.Equal(20.00m, item.DiscountAmount);
        Assert.Equal(180.00m, item.LineTotal);
        Assert.Equal(18.00m, item.TaxAmount);
        Assert.Equal(198.00m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithExplicitDiscountAmount_UsesItVerbatim()
    {
        var item = Item(quantity: 1, unitPrice: 100.00m, discountAmount: 15.00m);

        item.CalculateTotals();

        Assert.Equal(15.00m, item.DiscountAmount);
        Assert.Equal(85.00m, item.LineTotal);
    }

    [Fact]
    public void CalculateTotals_WhenBothDiscountPercentAndAmountAreGiven_TheAmountWins()
    {
        // Documents the current rule: the percent is only expanded into an amount
        // when no amount was supplied. See TEST-FINDINGS.md #4 — the frontend
        // resolves this collision the other way round.
        var item = Item(quantity: 1, unitPrice: 100.00m, discountPercent: 50m, discountAmount: 10.00m);

        item.CalculateTotals();

        Assert.Equal(10.00m, item.DiscountAmount);
        Assert.Equal(90.00m, item.LineTotal);
    }

    [Fact]
    public void CalculateTotals_CalledTwice_DoesNotCompoundTheDiscount()
    {
        // Update paths re-run this on an item that already carries computed values,
        // so it has to be idempotent.
        var item = Item(quantity: 2, unitPrice: 100.00m, discountPercent: 10m, taxPercent: 10m);

        item.CalculateTotals();
        var firstPass = (item.DiscountAmount, item.TaxAmount, item.LineTotal, item.LineTotalWithTax);

        item.CalculateTotals();

        Assert.Equal(firstPass, (item.DiscountAmount, item.TaxAmount, item.LineTotal, item.LineTotalWithTax));
    }

    // --- Boundaries ------------------------------------------------------------

    [Fact]
    public void CalculateTotals_WithZeroQuantity_ProducesAZeroLine()
    {
        var item = Item(quantity: 0, unitPrice: 250.00m, discountPercent: 10m, taxPercent: 10m);

        item.CalculateTotals();

        Assert.Equal(0m, item.DiscountAmount);
        Assert.Equal(0m, item.LineTotal);
        Assert.Equal(0m, item.TaxAmount);
        Assert.Equal(0m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithZeroUnitPrice_ProducesAZeroLine()
    {
        var item = Item(quantity: 5, unitPrice: 0m, taxPercent: 10m);

        item.CalculateTotals();

        Assert.Equal(0m, item.LineTotal);
        Assert.Equal(0m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithFullDiscount_ChargesNothingAndTaxesNothing()
    {
        var item = Item(quantity: 4, unitPrice: 125.00m, discountPercent: 100m, taxPercent: 10m);

        item.CalculateTotals();

        Assert.Equal(500.00m, item.DiscountAmount);
        Assert.Equal(0m, item.LineTotal);
        Assert.Equal(0m, item.TaxAmount);
        Assert.Equal(0m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WhenDiscountExceedsTheLine_GoesNegative()
    {
        // Nothing clamps an over-large explicit discount. Recorded so a future
        // clamp is a deliberate change rather than an accident.
        var item = Item(quantity: 1, unitPrice: 100.00m, discountAmount: 150.00m);

        item.CalculateTotals();

        Assert.Equal(-50.00m, item.LineTotal);
        Assert.Equal(-50.00m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithFractionalQuantity_RoundsTheLineToCents()
    {
        // Quantity is decimal(18,3) and UnitPrice decimal(18,2), so their product can
        // carry five decimals while every money column stores two. Rounding here, not
        // on write, keeps the line equal to what the database stores — which is what
        // the invoice total is summed from.
        var item = Item(quantity: 0.5m, unitPrice: 20.01m);

        item.CalculateTotals();

        // 10.005, rounded away from zero the way PostgreSQL rounds into decimal(18,2).
        Assert.Equal(10.01m, item.LineTotal);
        Assert.Equal(10.01m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_WithFractionalTax_RoundsTheTaxToCents()
    {
        var item = Item(quantity: 1, unitPrice: 33.33m, taxPercent: 10m);

        item.CalculateTotals();

        // 3.333 rounds down; the line total is built from the rounded tax.
        Assert.Equal(3.33m, item.TaxAmount);
        Assert.Equal(36.66m, item.LineTotalWithTax);
    }

    [Fact]
    public void CalculateTotals_RoundsHalvesAwayFromZero_NotToEven()
    {
        // Math.Round's default is banker's rounding, which would make this 0.02.
        // PostgreSQL rounds 0.025 to 0.03, and the two have to agree.
        var item = Item(quantity: 0.5m, unitPrice: 0.05m);

        item.CalculateTotals();

        Assert.Equal(0.03m, item.LineTotal);
    }

    [Fact]
    public void CalculateTotals_RoundedLines_SumToTheSameTotalTheDatabaseWould()
    {
        // Three lines of 10.005: rounded per line they come to 30.03, where summing
        // first and rounding once would have given 30.02.
        var lines = Enumerable.Range(0, 3).Select(_ =>
        {
            var line = Item(quantity: 0.5m, unitPrice: 20.01m);
            line.CalculateTotals();
            return line;
        }).ToList();

        Assert.Equal(30.03m, lines.Sum(l => l.LineTotalWithTax));
    }

    [Theory]
    // Repeated fractions are exact in decimal; these would drift in double.
    [InlineData(3, 0.1, 0.3)]
    [InlineData(3, 1.15, 3.45)]
    [InlineData(7, 0.07, 0.49)]
    public void CalculateTotals_UsesDecimalArithmetic_NoBinaryFloatingPointDrift(
        double quantity, double unitPrice, double expectedLineTotal)
    {
        var item = Item((decimal)quantity, (decimal)unitPrice);

        item.CalculateTotals();

        Assert.Equal((decimal)expectedLineTotal, item.LineTotal);
    }
}
