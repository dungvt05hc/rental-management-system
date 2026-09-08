using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentalManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceNumberCounter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InvoiceNumberCounters",
                columns: table => new
                {
                    Period = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    LastValue = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvoiceNumberCounters", x => x.Period);
                });

            // Seed one counter per period already present in Invoices, set to the
            // highest number issued for that period. Without this the generator
            // would restart at 0001 on an existing database and collide with
            // invoices that have already gone out to tenants.
            // Numbers are INV-yyyyMM-NNNN: the period is 6 chars at offset 5, the
            // sequence is everything after the second dash. Rows that do not match
            // that shape are ignored rather than guessed at.
            migrationBuilder.Sql("""
                INSERT INTO "InvoiceNumberCounters" ("Period", "LastValue")
                SELECT substring("InvoiceNumber" from 5 for 6),
                       MAX(CAST(substring("InvoiceNumber" from 12) AS integer))
                FROM "Invoices"
                WHERE "InvoiceNumber" ~ '^INV-\d{6}-\d+$'
                GROUP BY substring("InvoiceNumber" from 5 for 6)
                ON CONFLICT ("Period") DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InvoiceNumberCounters");
        }
    }
}
