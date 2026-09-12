using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentalManagement.Api.Migrations
{
    /// <summary>
    /// Đổi ngôn ngữ mặc định của hệ thống sang tiếng Việt.
    /// </summary>
    /// <remarks>
    /// Seed lúc khởi động chỉ đặt IsDefault khi tạo ngôn ngữ mới, nên những
    /// database đã có sẵn "en" là mặc định sẽ không tự đổi. Migration này lo
    /// phần đó. Lựa chọn ngôn ngữ riêng của từng người dùng không bị ảnh hưởng.
    /// </remarks>
    public partial class SetVietnameseAsDefaultLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Hàng "vi" có thể chưa tồn tại (database mới, seed chạy sau
            // migration) — khi đó seed sẽ tự tạo nó với IsDefault = true.
            migrationBuilder.Sql("""
                UPDATE "Languages" SET "IsDefault" = false WHERE "IsDefault" = true;
                UPDATE "Languages" SET "IsDefault" = true, "IsActive" = true WHERE "Code" = 'vi';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Languages" SET "IsDefault" = false WHERE "IsDefault" = true;
                UPDATE "Languages" SET "IsDefault" = true WHERE "Code" = 'en';
                """);
        }
    }
}
