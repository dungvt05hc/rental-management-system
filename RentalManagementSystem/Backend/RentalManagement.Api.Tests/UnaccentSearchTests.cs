using Microsoft.EntityFrameworkCore;
using RentalManagement.Api.Models.Entities;
using RentalManagement.Api.Services;

namespace RentalManagement.Api.Tests;

/// <summary>
/// Tìm kiếm phải bỏ qua dấu: gõ "nguyen van an" ra "Nguyễn Văn An".
/// </summary>
/// <remarks>
/// Chạy trên PostgreSQL thật chứ không phải provider in-memory, vì phần đáng
/// nghi nằm ở chính phía database: unaccent() một tham số chỉ STABLE nên không
/// dùng cho cột generated được, migration phải bọc nó lại thành IMMUTABLE. Nếu
/// lớp bọc đó sai, MigrateAsync() trong fixture sẽ ném ngay.
/// </remarks>
[Collection(PostgresCollection.Name)]
public class UnaccentSearchTests
{
    private readonly PostgresFixture _fixture;

    public UnaccentSearchTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Theory]
    [InlineData("nguyen van an")]   // không dấu, đúng như khách hay gõ
    [InlineData("Nguyễn Văn An")]   // đủ dấu
    [InlineData("NGUYEN VAN AN")]   // chữ hoa
    [InlineData("nguyen")]          // một phần họ
    [InlineData("van an")]          // trải qua cả FirstName lẫn LastName
    public async Task Customer_is_found_however_the_name_is_typed(string term)
    {
        await using var context = _fixture.CreateContext();

        var customer = await GivenCustomerAsync(context, "Nguyễn", "Văn An");

        var normalized = SearchText.Normalize(term);
        var found = await context.Customers
            .Where(c => c.Id == customer.Id && c.SearchText.Contains(normalized))
            .AnyAsync();

        Assert.True(found, $"tìm \"{term}\" phải ra \"Nguyễn Văn An\"");
    }

    [Fact]
    public async Task Stroked_d_is_folded_the_same_way_on_both_sides()
    {
        await using var context = _fixture.CreateContext();

        // "Đặng" là trường hợp riêng: Đ không phải D kèm dấu phụ mà là một ký tự
        // độc lập, chuẩn hoá Unicode không tách ra được. Phía C# thay tay; phía
        // PostgreSQL do unaccent lo. Kiểm tra để hai bên không lệch nhau.
        var customer = await GivenCustomerAsync(context, "Đặng", "Thị Hưởng");

        var normalized = SearchText.Normalize("dang thi huong");
        var found = await context.Customers
            .Where(c => c.Id == customer.Id && c.SearchText.Contains(normalized))
            .AnyAsync();

        Assert.True(found);
    }

    [Theory]
    [InlineData("ban cong")]     // trong phần mô tả, không dấu
    [InlineData("hướng Đông")]   // trong phần mô tả, đủ dấu
    [InlineData("A-101")]        // số phòng
    public async Task Room_number_and_description_are_searchable_without_accents(string term)
    {
        await using var context = _fixture.CreateContext();

        var room = await GivenRoomAsync(context, "A-101", "Phòng có ban công, hướng Đông");

        var normalized = SearchText.Normalize(term);
        var found = await context.Rooms
            .Where(r => r.Id == room.Id && r.SearchText.Contains(normalized))
            .AnyAsync();

        Assert.True(found, $"tìm \"{term}\" phải ra phòng A-101");
    }

    [Fact]
    public async Task Search_matches_a_contiguous_run_of_text_only()
    {
        await using var context = _fixture.CreateContext();

        var room = await GivenRoomAsync(context, "B-202", "Phòng có ban công, hướng Đông");

        // Ghi lại giới hạn của cách tìm hiện tại: đây là so chuỗi con, không
        // phải so theo từ. "ban cong huong" nhảy qua dấu phẩy nên không khớp.
        // Muốn khớp kiểu đó thì phải chuyển sang full-text search (tsvector).
        var acrossPunctuation = SearchText.Normalize("ban cong huong");
        var found = await context.Rooms
            .Where(r => r.Id == room.Id && r.SearchText.Contains(acrossPunctuation))
            .AnyAsync();

        Assert.False(found);
    }

    [Fact]
    public async Task Search_column_follows_the_row_when_the_name_changes()
    {
        await using var context = _fixture.CreateContext();

        var customer = await GivenCustomerAsync(context, "Trần", "Bích Ngọc");

        customer.LastName = "Bảo Châu";
        await context.SaveChangesAsync();

        // Cột là GENERATED ALWAYS ... STORED, PostgreSQL tự tính lại — không có
        // chỗ nào trong code phải nhớ đồng bộ nó.
        await context.Entry(customer).ReloadAsync();

        Assert.Contains("bao chau", customer.SearchText, StringComparison.Ordinal);
        Assert.DoesNotContain("bich ngoc", customer.SearchText, StringComparison.Ordinal);
    }

    [Fact]
    public void Normalize_strips_tones_and_lowercases()
    {
        Assert.Equal("nguyen van an", SearchText.Normalize("  Nguyễn Văn An  "));
        Assert.Equal("dien nuoc", SearchText.Normalize("Điện nước"));
        Assert.Equal("hoa don qua han", SearchText.Normalize("Hoá đơn quá hạn"));
        Assert.Equal(string.Empty, SearchText.Normalize(null));
        Assert.Equal(string.Empty, SearchText.Normalize("   "));
    }

    private static async Task<Customer> GivenCustomerAsync(
        Data.RentalManagementContext context,
        string firstName,
        string lastName)
    {
        var unique = Guid.NewGuid().ToString("N")[..8];

        var customer = new Customer
        {
            FirstName = firstName,
            LastName = lastName,
            Email = $"{unique}@example.com",
            PhoneNumber = "0900000000",
            IdentificationNumber = unique
        };

        context.Customers.Add(customer);
        await context.SaveChangesAsync();

        return customer;
    }

    private static async Task<Room> GivenRoomAsync(
        Data.RentalManagementContext context,
        string roomNumber,
        string description)
    {
        var room = new Room
        {
            RoomNumber = $"{roomNumber}-{Guid.NewGuid().ToString("N")[..4]}",
            Type = RoomType.Single,
            Status = RoomStatus.Vacant,
            MonthlyRent = 3_500_000m,
            Floor = 1,
            Description = description
        };

        context.Rooms.Add(room);
        await context.SaveChangesAsync();

        return room;
    }
}
