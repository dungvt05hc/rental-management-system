using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentalManagement.Api.Migrations
{
    /// <summary>
    /// Tìm kiếm không dấu cho khách thuê và phòng: gõ "nguyen van an" ra
    /// "Nguyễn Văn An".
    /// </summary>
    public partial class AddUnaccentSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // unaccent: bỏ dấu. pg_trgm: index cho LIKE '%...%'.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            // unaccent(text) một tham số chỉ là STABLE chứ không IMMUTABLE: nó
            // tra từ điển qua search_path, mà search_path thì đổi được giữa các
            // phiên. PostgreSQL vì thế từ chối dùng nó trong cột generated hoặc
            // index biểu thức.
            //
            // Dạng hai tham số unaccent(regdictionary, text) không phụ thuộc
            // search_path nên bọc lại được thành IMMUTABLE một cách trung thực.
            // Từ điển được chỉ định tuyệt đối ('public.unaccent'), không suy ra
            // từ ngữ cảnh.
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
                RETURNS text
                LANGUAGE sql
                IMMUTABLE
                PARALLEL SAFE
                STRICT
                AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
                """);

            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "Rooms",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(immutable_unaccent(coalesce(\"RoomNumber\", '') || ' ' || coalesce(\"Description\", '')))",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "Customers",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(immutable_unaccent(coalesce(\"FirstName\", '') || ' ' || coalesce(\"LastName\", '') || ' ' || coalesce(\"Email\", '') || ' ' || coalesce(\"PhoneNumber\", '')))",
                stored: true);

            // Index GIN trigram chứ không phải btree: tìm kiếm ở đây là
            // LIKE '%tu khoa%', mà btree trên biểu thức chỉ phục vụ được so sánh
            // bằng và khớp tiền tố. Với LIKE hai đầu %, chỉ GIN + gin_trgm_ops
            // mới tránh được quét toàn bảng.
            migrationBuilder.Sql("""
                CREATE INDEX ix_customers_searchtext_trgm
                    ON "Customers" USING gin ("SearchText" gin_trgm_ops);
                """);

            migrationBuilder.Sql("""
                CREATE INDEX ix_rooms_searchtext_trgm
                    ON "Rooms" USING gin ("SearchText" gin_trgm_ops);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_rooms_searchtext_trgm;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_customers_searchtext_trgm;");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "Customers");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS public.immutable_unaccent(text);");

            // Cố tình không DROP EXTENSION: extension là tài nguyên cấp
            // database, phần khác của hệ thống có thể đang dùng.
        }
    }
}
