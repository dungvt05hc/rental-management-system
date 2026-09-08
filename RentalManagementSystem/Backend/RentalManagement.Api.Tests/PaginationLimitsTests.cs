using RentalManagement.Api.Models.DTOs;

namespace RentalManagement.Api.Tests;

/// <summary>
/// The pageSize ceiling. The rule under test: whatever a client asks for, the
/// service layer never fetches more than MaxPageSize rows in one request —
/// pageSize=100000 used to be accepted as-is.
/// Pure arithmetic, so no database is involved.
/// </summary>
public class PaginationLimitsTests
{
    [Fact]
    public void Keeps_a_reasonable_request_untouched()
    {
        var (page, pageSize) = PaginationLimits.Normalize(3, 25);

        Assert.Equal(3, page);
        Assert.Equal(25, pageSize);
    }

    [Fact]
    public void Caps_an_oversized_pageSize_at_the_maximum()
    {
        var (_, pageSize) = PaginationLimits.Normalize(1, 100_000);

        Assert.Equal(PaginationLimits.MaxPageSize, pageSize);
    }

    [Fact]
    public void Allows_exactly_the_maximum()
    {
        var (_, pageSize) = PaginationLimits.Normalize(1, PaginationLimits.MaxPageSize);

        Assert.Equal(PaginationLimits.MaxPageSize, pageSize);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Falls_back_to_the_default_when_pageSize_is_not_positive(int requested)
    {
        var (_, pageSize) = PaginationLimits.Normalize(1, requested);

        Assert.Equal(PaginationLimits.DefaultPageSize, pageSize);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Clamps_a_non_positive_page_to_the_first_page(int requested)
    {
        var (page, _) = PaginationLimits.Normalize(requested, 10);

        Assert.Equal(1, page);
    }
}
