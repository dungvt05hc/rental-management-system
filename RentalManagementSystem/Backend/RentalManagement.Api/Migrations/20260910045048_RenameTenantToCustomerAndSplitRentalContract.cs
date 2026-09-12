using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RentalManagement.Api.Migrations
{
    /// <summary>
    /// Renames Tenant to Customer and lifts the rental terms off the customer
    /// onto a new RentalContract table.
    ///
    /// Every operation preserves rows: the table is renamed, never dropped and
    /// recreated, and the rental columns are copied into RentalContracts before
    /// they are removed from Customers. Down() reverses both halves.
    /// </summary>
    public partial class RenameTenantToCustomerAndSplitRentalContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---------------------------------------------------------------
            // Phase 1 — rename Tenants to Customers, keeping every row in place
            // ---------------------------------------------------------------

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Tenants_TenantId",
                table: "Invoices");

            migrationBuilder.RenameTable(
                name: "Tenants",
                newName: "Customers");

            // RENAME TO leaves constraint and index names behind, so rename those too.
            migrationBuilder.Sql(@"ALTER TABLE ""Customers"" RENAME CONSTRAINT ""PK_Tenants"" TO ""PK_Customers"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Customers"" RENAME CONSTRAINT ""FK_Tenants_Rooms_RoomId"" TO ""FK_Customers_Rooms_RoomId"";");

            migrationBuilder.RenameIndex(
                name: "IX_Tenants_Email",
                table: "Customers",
                newName: "IX_Customers_Email");

            migrationBuilder.RenameIndex(
                name: "IX_Tenants_IdentificationNumber",
                table: "Customers",
                newName: "IX_Customers_IdentificationNumber");

            migrationBuilder.RenameIndex(
                name: "IX_Tenants_RoomId",
                table: "Customers",
                newName: "IX_Customers_RoomId");

            migrationBuilder.RenameColumn(
                name: "TenantId",
                table: "Invoices",
                newName: "CustomerId");

            migrationBuilder.RenameIndex(
                name: "IX_Invoices_TenantId_BillingPeriod",
                table: "Invoices",
                newName: "IX_Invoices_CustomerId_BillingPeriod");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Customers_CustomerId",
                table: "Invoices",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // ---------------------------------------------------------------
            // Phase 2 — move the rental terms onto RentalContracts
            // ---------------------------------------------------------------

            migrationBuilder.CreateTable(
                name: "RentalContracts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    RoomId = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MonthlyRent = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SecurityDeposit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW() AT TIME ZONE 'UTC'")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalContracts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalContracts_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RentalContracts_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RentalContracts_CustomerId_Status",
                table: "RentalContracts",
                columns: new[] { "CustomerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_RentalContracts_RoomId_Status",
                table: "RentalContracts",
                columns: new[] { "RoomId", "Status" });

            // One contract per customer that currently holds a room. Customers with no
            // room never rented anything, so they correctly end up with no contract.
            // Status: 2 = Active, 3 = Ended (RentalContractStatus).
            migrationBuilder.Sql(@"
                INSERT INTO ""RentalContracts""
                    (""CustomerId"", ""RoomId"", ""StartDate"", ""EndDate"", ""MonthlyRent"",
                     ""SecurityDeposit"", ""Status"", ""Notes"", ""CreatedAt"", ""UpdatedAt"")
                SELECT
                    c.""Id"",
                    c.""RoomId"",
                    COALESCE(c.""ContractStartDate"", c.""CreatedAt""),
                    CASE
                        WHEN c.""IsActive"" THEN c.""ContractEndDate""
                        ELSE COALESCE(c.""ContractEndDate"", NOW() AT TIME ZONE 'UTC')
                    END,
                    c.""MonthlyRent"",
                    c.""SecurityDeposit"",
                    CASE WHEN c.""IsActive"" THEN 2 ELSE 3 END,
                    '',
                    c.""CreatedAt"",
                    NOW() AT TIME ZONE 'UTC'
                FROM ""Customers"" c
                WHERE c.""RoomId"" IS NOT NULL;
            ");

            migrationBuilder.AddColumn<int>(
                name: "RentalContractId",
                table: "Invoices",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_RentalContractId",
                table: "Invoices",
                column: "RentalContractId");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_RentalContracts_RentalContractId",
                table: "Invoices",
                column: "RentalContractId",
                principalTable: "RentalContracts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Attach existing invoices to the contract for the same customer and room.
            // Invoices whose customer had no room stay unlinked, which the column allows.
            migrationBuilder.Sql(@"
                UPDATE ""Invoices"" i
                SET ""RentalContractId"" = rc.""Id""
                FROM ""RentalContracts"" rc
                WHERE rc.""CustomerId"" = i.""CustomerId""
                  AND rc.""RoomId"" = i.""RoomId"";
            ");

            // Only now that the data has been copied is it safe to drop the old columns.
            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Rooms_RoomId",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_Customers_RoomId",
                table: "Customers");

            migrationBuilder.DropColumn(name: "RoomId", table: "Customers");
            migrationBuilder.DropColumn(name: "ContractStartDate", table: "Customers");
            migrationBuilder.DropColumn(name: "ContractEndDate", table: "Customers");
            migrationBuilder.DropColumn(name: "MonthlyRent", table: "Customers");
            migrationBuilder.DropColumn(name: "SecurityDeposit", table: "Customers");

            // ---------------------------------------------------------------
            // Phase 3 — repoint the translation keys the UI now asks for.
            // The rows carry the existing Vietnamese values; only the keys move,
            // so no wording is added or changed here.
            // ---------------------------------------------------------------

            migrationBuilder.Sql(@"
                UPDATE ""Translations"" SET ""Key"" = 'customers' || substring(""Key"" from 8)
                WHERE ""Key"" LIKE 'tenants.%';

                UPDATE ""Translations"" SET ""Category"" = 'customers' WHERE ""Category"" = 'tenants';

                UPDATE ""Translations"" SET ""Key"" = 'invoices.customer'             WHERE ""Key"" = 'invoices.tenant';
                UPDATE ""Translations"" SET ""Key"" = 'invoices.customerRoom'         WHERE ""Key"" = 'invoices.tenantRoom';
                UPDATE ""Translations"" SET ""Key"" = 'invoices.noCustomerInfo'       WHERE ""Key"" = 'invoices.noTenantInfo';
                UPDATE ""Translations"" SET ""Key"" = 'dashboard.manageCustomers'     WHERE ""Key"" = 'dashboard.manageTenants';
                UPDATE ""Translations"" SET ""Key"" = 'dashboard.addEditViewCustomers' WHERE ""Key"" = 'dashboard.addEditViewTenants';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // ---------------------------------------------------------------
            // Phase 3 reversed — put the translation keys back
            // ---------------------------------------------------------------

            migrationBuilder.Sql(@"
                UPDATE ""Translations"" SET ""Key"" = 'dashboard.addEditViewTenants' WHERE ""Key"" = 'dashboard.addEditViewCustomers';
                UPDATE ""Translations"" SET ""Key"" = 'dashboard.manageTenants'      WHERE ""Key"" = 'dashboard.manageCustomers';
                UPDATE ""Translations"" SET ""Key"" = 'invoices.noTenantInfo'        WHERE ""Key"" = 'invoices.noCustomerInfo';
                UPDATE ""Translations"" SET ""Key"" = 'invoices.tenantRoom'          WHERE ""Key"" = 'invoices.customerRoom';
                UPDATE ""Translations"" SET ""Key"" = 'invoices.tenant'              WHERE ""Key"" = 'invoices.customer';

                UPDATE ""Translations"" SET ""Category"" = 'tenants' WHERE ""Category"" = 'customers';

                UPDATE ""Translations"" SET ""Key"" = 'tenants' || substring(""Key"" from 10)
                WHERE ""Key"" LIKE 'customers.%';
            ");

            // ---------------------------------------------------------------
            // Phase 2 reversed — fold the rental terms back onto the customer
            // ---------------------------------------------------------------

            migrationBuilder.AddColumn<int>(
                name: "RoomId",
                table: "Customers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ContractStartDate",
                table: "Customers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ContractEndDate",
                table: "Customers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyRent",
                table: "Customers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SecurityDeposit",
                table: "Customers",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // A customer may hold several contracts by now, but the old shape has room
            // for exactly one: prefer the active contract, otherwise the most recent.
            migrationBuilder.Sql(@"
                UPDATE ""Customers"" c
                SET ""RoomId"" = x.""RoomId"",
                    ""ContractStartDate"" = x.""StartDate"",
                    ""ContractEndDate"" = x.""EndDate"",
                    ""MonthlyRent"" = x.""MonthlyRent"",
                    ""SecurityDeposit"" = x.""SecurityDeposit""
                FROM (
                    SELECT DISTINCT ON (""CustomerId"")
                        ""CustomerId"", ""RoomId"", ""StartDate"", ""EndDate"",
                        ""MonthlyRent"", ""SecurityDeposit""
                    FROM ""RentalContracts""
                    ORDER BY ""CustomerId"", (""Status"" = 2) DESC, ""StartDate"" DESC
                ) x
                WHERE c.""Id"" = x.""CustomerId"";
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_RoomId",
                table: "Customers",
                column: "RoomId");

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Rooms_RoomId",
                table: "Customers",
                column: "RoomId",
                principalTable: "Rooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_RentalContracts_RentalContractId",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_RentalContractId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "RentalContractId",
                table: "Invoices");

            migrationBuilder.DropTable(
                name: "RentalContracts");

            // ---------------------------------------------------------------
            // Phase 1 reversed — rename Customers back to Tenants
            // ---------------------------------------------------------------

            migrationBuilder.DropForeignKey(
                name: "FK_Invoices_Customers_CustomerId",
                table: "Invoices");

            migrationBuilder.RenameIndex(
                name: "IX_Invoices_CustomerId_BillingPeriod",
                table: "Invoices",
                newName: "IX_Invoices_TenantId_BillingPeriod");

            migrationBuilder.RenameColumn(
                name: "CustomerId",
                table: "Invoices",
                newName: "TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_Customers_RoomId",
                table: "Customers",
                newName: "IX_Tenants_RoomId");

            migrationBuilder.RenameIndex(
                name: "IX_Customers_IdentificationNumber",
                table: "Customers",
                newName: "IX_Tenants_IdentificationNumber");

            migrationBuilder.RenameIndex(
                name: "IX_Customers_Email",
                table: "Customers",
                newName: "IX_Tenants_Email");

            migrationBuilder.Sql(@"ALTER TABLE ""Customers"" RENAME CONSTRAINT ""FK_Customers_Rooms_RoomId"" TO ""FK_Tenants_Rooms_RoomId"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Customers"" RENAME CONSTRAINT ""PK_Customers"" TO ""PK_Tenants"";");

            migrationBuilder.RenameTable(
                name: "Customers",
                newName: "Tenants");

            migrationBuilder.AddForeignKey(
                name: "FK_Invoices_Tenants_TenantId",
                table: "Invoices",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
