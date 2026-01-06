using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RentalManagement.Api.Data;
using RentalManagement.Api.Services.Interfaces;

namespace RentalManagement.Api.Services.Implementations;

/// <summary>
/// Service for generating PDF documents
/// </summary>
public class PdfService : IPdfService
{
    private readonly RentalManagementContext _context;
    private readonly ILogger<PdfService> _logger;

    public PdfService(RentalManagementContext context, ILogger<PdfService> logger)
    {
        _context = context;
        _logger = logger;
        
        // Configure QuestPDF license (Community license for free use)
        QuestPDF.Settings.License = LicenseType.Community;
    }

    /// <summary>
    /// Generates a PDF for an invoice
    /// </summary>
    public async Task<byte[]> GenerateInvoicePdfAsync(int invoiceId)
    {
        try
        {
            // Fetch invoice with related data
            var invoice = await _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.Room)
                .Include(i => i.Payments)
                .Include(i => i.InvoiceItems)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);

            if (invoice == null)
            {
                throw new Exception($"Invoice with ID {invoiceId} not found");
            }

            // Generate PDF
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(50);
                    page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Arial"));

                    page.Header().Element(c => ComposeHeader(c, invoice));
                    page.Content().Element(c => ComposeContent(c, invoice));
                    page.Footer().Element(c => ComposeFooter(c, invoice));
                });
            });

            return document.GeneratePdf();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating PDF for invoice {InvoiceId}", invoiceId);
            throw;
        }
    }

    private void ComposeHeader(IContainer container, Models.Entities.Invoice invoice)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                // Company info (left side)
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("INVOICE").FontSize(24).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().Text("Rental Management System").FontSize(9).FontColor(Colors.Grey.Darken1);
                    col.Item().Text("2/47 Phạm Văn Bạch, Phường Tân Sơn, TP. Hồ Chí Minh").FontSize(9);
                    col.Item().Text("Phone: (+84) 966332942").FontSize(9);
                    col.Item().Text("Email: info@rental.com").FontSize(9);
                });

                // Invoice number and status (right side)
                row.RelativeItem().AlignRight().Column(col =>
                {
                    col.Item().Text($"#{invoice.InvoiceNumber}").FontSize(18).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text(txt =>
                    {
                        txt.Span(invoice.Status.ToString()).FontSize(11).Bold().FontColor(GetStatusColor(invoice.Status));
                    });
                });
            });

            column.Item().PaddingTop(10).LineHorizontal(2).LineColor(Colors.Blue.Darken2);
        });
    }

    private void ComposeContent(IContainer container, Models.Entities.Invoice invoice)
    {
        container.PaddingTop(15).Column(column =>
        {
            // Invoice details section
            column.Item().Row(row =>
            {
                // Bill to section
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("BILL TO").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text(invoice.Tenant.FullName).FontSize(12).Bold();
                    col.Item().Text($"Room: {invoice.Room.RoomNumber}").FontSize(9);
                    col.Item().Text($"Email: {invoice.Tenant.Email}").FontSize(9);
                    col.Item().Text($"Phone: {invoice.Tenant.PhoneNumber}").FontSize(9);
                });

                // Invoice dates section
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("INVOICE DETAILS").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Row(r =>
                    {
                        r.RelativeItem(1).Text("Issue Date:").FontSize(9).FontColor(Colors.Grey.Darken1);
                        r.RelativeItem(1.5f).Text(invoice.IssueDate.ToString("MMM dd, yyyy")).FontSize(9).Bold();
                    });
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(1).Text("Due Date:").FontSize(9).FontColor(Colors.Grey.Darken1);
                        r.RelativeItem(1.5f).Text(invoice.DueDate.ToString("MMM dd, yyyy")).FontSize(9).Bold().FontColor(Colors.Red.Medium);
                    });
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(1).Text("Billing Period:").FontSize(9).FontColor(Colors.Grey.Darken1);
                        r.RelativeItem(1.5f).Text(invoice.BillingPeriod.ToString("MMMM yyyy")).FontSize(9).Bold();
                    });
                    if (invoice.PaidDate.HasValue)
                    {
                        col.Item().Row(r =>
                        {
                            r.RelativeItem(1).Text("Paid Date:").FontSize(9).FontColor(Colors.Grey.Darken1);
                            r.RelativeItem(1.5f).Text(invoice.PaidDate.Value.ToString("MMM dd, yyyy")).FontSize(9).Bold().FontColor(Colors.Green.Medium);
                        });
                    }
                });
            });

            // Invoice Items Table
            column.Item().PaddingTop(20).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(4); // Description
                    columns.RelativeColumn(1); // Qty
                    columns.RelativeColumn(1); // Unit
                    columns.RelativeColumn(1.5f); // Unit Price
                    columns.RelativeColumn(1.5f); // Amount
                });

                // Header
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6)
                        .Text("DESCRIPTION").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignCenter()
                        .Text("QTY").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignCenter()
                        .Text("UNIT").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignRight()
                        .Text("UNIT PRICE").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignRight()
                        .Text("AMOUNT").FontColor(Colors.White).FontSize(9).Bold();
                });

                // Additional charges
                if (invoice.AdditionalCharges > 0)
                {
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Column(col =>
                    {
                        col.Item().Text("Additional Charges").FontSize(9).Bold();
                        if (!string.IsNullOrWhiteSpace(invoice.AdditionalChargesDescription))
                        {
                            col.Item().PaddingTop(2).Text(invoice.AdditionalChargesDescription).FontSize(8).FontColor(Colors.Grey.Darken1).Italic();
                        }
                    });
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                        .Text("1").FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                        .Text("item").FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                        .Text($"${invoice.AdditionalCharges:N2}").FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                        .Text($"${invoice.AdditionalCharges:N2}").FontSize(9).Bold();
                }

                // Invoice items
                if (invoice.InvoiceItems.Any())
                {
                    foreach (var item in invoice.InvoiceItems.OrderBy(i => i.LineNumber))
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Column(col =>
                        {
                            col.Item().Text(item.ItemName).FontSize(9).Bold();
                            if (!string.IsNullOrWhiteSpace(item.Description))
                            {
                                col.Item().PaddingTop(2).Text(item.Description).FontSize(8).FontColor(Colors.Grey.Darken1).Italic();
                            }
                            if (item.TaxPercent > 0)
                            {
                                col.Item().PaddingTop(2).Text($"Tax: {item.TaxPercent}%").FontSize(8).FontColor(Colors.Grey.Darken1);
                            }
                        });
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                            .Text(item.Quantity.ToString()).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                            .Text(item.UnitOfMeasure).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                            .Text($"${item.UnitPrice:N2}").FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                            .Text($"${item.LineTotalWithTax:N2}").FontSize(9).Bold();
                    }
                }

                // Discount
                if (invoice.Discount > 0)
                {
                    table.Cell().Padding(6).Column(col =>
                    {
                        col.Item().Text("Discount").FontSize(9).Bold().FontColor(Colors.Green.Darken1);
                    });
                    table.Cell().Padding(6).Text("");
                    table.Cell().Padding(6).Text("");
                    table.Cell().Padding(6).Text("");
                    table.Cell().Padding(6).AlignRight()
                        .Text($"-${invoice.Discount:N2}").FontSize(9).Bold().FontColor(Colors.Green.Darken1);
                }

                // Subtotal
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("");
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("");
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("");
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignRight()
                    .Text("Subtotal:").FontSize(9).Bold();
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignRight()
                    .Text($"${invoice.TotalAmount:N2}").FontSize(9).Bold();

                // Total amount due
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).Text("");
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).Text("");
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).Text("");
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).AlignRight()
                    .Text("TOTAL AMOUNT DUE:").FontSize(10).Bold();
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).AlignRight()
                    .Text($"${invoice.TotalAmount:N2}").FontSize(12).Bold().FontColor(Colors.Blue.Darken2);

                // Paid amount
                if (invoice.PaidAmount > 0)
                {
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).Text("");
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).Text("");
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).Text("");
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).AlignRight()
                        .Text("Amount Paid:").FontSize(9).Bold().FontColor(Colors.Green.Darken1);
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).AlignRight()
                        .Text($"${invoice.PaidAmount:N2}").FontSize(9).Bold().FontColor(Colors.Green.Darken1);

                    // Remaining balance
                    var balanceColor = invoice.RemainingBalance > 0 ? Colors.Red.Medium : Colors.Green.Medium;
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).Text("");
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).Text("");
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).Text("");
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).AlignRight()
                        .Text("REMAINING BALANCE:").FontSize(10).Bold();
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).AlignRight()
                        .Text($"${invoice.RemainingBalance:N2}").FontSize(12).Bold().FontColor(balanceColor);
                }
            });

            // Payment history
            if (invoice.Payments.Any())
            {
                column.Item().PaddingTop(20).Column(col =>
                {
                    col.Item().Text("PAYMENT HISTORY").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1.5f);
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Date").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Method").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Reference").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5).AlignRight()
                                .Text("Amount").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                        });

                        foreach (var payment in invoice.Payments.OrderBy(p => p.PaymentDate))
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.PaymentDate.ToString("MMM dd, yyyy")).FontSize(8);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.Method.ToString()).FontSize(8);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.ReferenceNumber ?? "-").FontSize(8);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).AlignRight()
                                .Text($"${payment.Amount:N2}").FontSize(8).Bold();
                        }
                    });
                });
            }

            // Notes
            if (!string.IsNullOrWhiteSpace(invoice.Notes))
            {
                column.Item().PaddingTop(15).Column(col =>
                {
                    col.Item().Text("NOTES").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text(invoice.Notes).FontSize(9).FontColor(Colors.Grey.Darken1);
                });
            }

            // Payment instructions
            column.Item().PaddingTop(15).Border(1).BorderColor(Colors.Grey.Lighten1).Background(Colors.Grey.Lighten4).Padding(10).Column(col =>
            {
                col.Item().Text("PAYMENT INSTRUCTIONS").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                col.Item().PaddingTop(5).Text("Please make payment by the due date to avoid late fees.").FontSize(9);
                col.Item().Text("Accepted payment methods: Cash, Bank Transfer, Credit/Debit Card, Check").FontSize(9);
                
                col.Item().PaddingTop(8).Border(1).BorderColor(Colors.Blue.Lighten1).Background(Colors.Blue.Lighten4).Padding(8).Column(bankCol =>
                {
                    bankCol.Item().Text("Bank Details:").FontSize(9).Bold().FontColor(Colors.Blue.Darken2);
                    bankCol.Item().PaddingTop(3).Text(txt =>
                    {
                        txt.Span("Bank Name: ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        txt.Span("Vo Thai Dung").FontSize(8).Bold();
                        txt.Span(" | Account: ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        txt.Span("50966332942 TPBank").FontSize(8).Bold();
                        txt.Span(" | Momo: ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        txt.Span("0966332942").FontSize(8).Bold();
                    });
                });
            });
        });
    }

    private void ComposeFooter(IContainer container, Models.Entities.Invoice invoice)
    {
        container.AlignBottom().Column(column =>
        {
            column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
            column.Item().PaddingTop(5).AlignCenter().Text("Thank you for your business!").FontSize(8).FontColor(Colors.Grey.Darken1);
            column.Item().AlignCenter().Text(txt =>
            {
                txt.Span("Generated on ").FontSize(8).FontColor(Colors.Grey.Darken1);
                txt.Span(DateTime.UtcNow.ToString("MMMM dd, yyyy")).FontSize(8).FontColor(Colors.Grey.Darken1);
            });
        });
    }

    private string GetStatusColor(Models.Entities.InvoiceStatus status)
    {
        return status switch
        {
            Models.Entities.InvoiceStatus.Paid => Colors.Green.Medium,
            Models.Entities.InvoiceStatus.Overdue => Colors.Red.Medium,
            Models.Entities.InvoiceStatus.PartiallyPaid => Colors.Orange.Medium,
            Models.Entities.InvoiceStatus.Issued => Colors.Blue.Medium,
            Models.Entities.InvoiceStatus.Unpaid => Colors.Orange.Darken1,
            Models.Entities.InvoiceStatus.Cancelled => Colors.Grey.Darken1,
            _ => Colors.Grey.Medium
        };
    }
}
