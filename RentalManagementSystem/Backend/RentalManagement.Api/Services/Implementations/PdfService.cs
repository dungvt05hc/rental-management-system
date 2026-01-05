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
                    col.Item().Text("RENTAL MANAGEMENT SYSTEM").FontSize(20).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().Text("Property Management Solutions").FontSize(10).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingTop(5).Text("123 Main Street, City, State 12345").FontSize(9);
                    col.Item().Text("Phone: (555) 123-4567 | Email: info@rental.com").FontSize(9);
                });

                // Invoice number and status (right side)
                row.RelativeItem().AlignRight().Column(col =>
                {
                    col.Item().Text("INVOICE").FontSize(24).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().Text($"#{invoice.InvoiceNumber}").FontSize(14).Bold();
                    col.Item().PaddingTop(5).Text(txt =>
                    {
                        txt.Span("Status: ").FontSize(10);
                        txt.Span(invoice.Status.ToString()).FontSize(10).Bold().FontColor(GetStatusColor(invoice.Status));
                    });
                });
            });

            column.Item().PaddingTop(15).LineHorizontal(2).LineColor(Colors.Blue.Darken2);
        });
    }

    private void ComposeContent(IContainer container, Models.Entities.Invoice invoice)
    {
        container.PaddingTop(20).Column(column =>
        {
            // Invoice details section
            column.Item().Row(row =>
            {
                // Bill to section
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("BILL TO").FontSize(12).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingTop(5).Text(invoice.Tenant.FullName).FontSize(12).Bold();
                    col.Item().Text($"Room: {invoice.Room.RoomNumber}").FontSize(10);
                    col.Item().Text($"Email: {invoice.Tenant.Email}").FontSize(10);
                    col.Item().Text($"Phone: {invoice.Tenant.PhoneNumber}").FontSize(10);
                });

                // Invoice dates section
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("INVOICE DETAILS").FontSize(12).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingTop(5).Row(r =>
                    {
                        r.RelativeItem(1).Text("Issue Date:").FontSize(10);
                        r.RelativeItem(2).Text(invoice.IssueDate.ToString("MMM dd, yyyy")).FontSize(10);
                    });
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(1).Text("Due Date:").FontSize(10);
                        r.RelativeItem(2).Text(invoice.DueDate.ToString("MMM dd, yyyy")).FontSize(10).FontColor(Colors.Red.Medium);
                    });
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(1).Text("Billing Period:").FontSize(10);
                        r.RelativeItem(2).Text(invoice.BillingPeriod.ToString("MMMM yyyy")).FontSize(10);
                    });
                    if (invoice.PaidDate.HasValue)
                    {
                        col.Item().Row(r =>
                        {
                            r.RelativeItem(1).Text("Paid Date:").FontSize(10);
                            r.RelativeItem(2).Text(invoice.PaidDate.Value.ToString("MMM dd, yyyy")).FontSize(10).FontColor(Colors.Green.Medium);
                        });
                    }
                });
            });

            // Charges table
            column.Item().PaddingTop(30).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(3); // Description
                    columns.RelativeColumn(1); // Amount
                });

                // Header
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken2).Padding(8)
                        .Text("DESCRIPTION").FontColor(Colors.White).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(8).AlignRight()
                        .Text("AMOUNT").FontColor(Colors.White).Bold();
                });

                // Monthly rent
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8)
                    .Text("Monthly Rent").FontSize(10);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                    .Text($"${invoice.MonthlyRent:N2}").FontSize(10);

                // Additional charges
                if (invoice.AdditionalCharges > 0)
                {
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(col =>
                    {
                        col.Item().Text("Additional Charges").FontSize(10);
                        if (!string.IsNullOrWhiteSpace(invoice.AdditionalChargesDescription))
                        {
                            col.Item().Text(invoice.AdditionalChargesDescription).FontSize(8).FontColor(Colors.Grey.Darken1).Italic();
                        }
                    });
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                        .Text($"${invoice.AdditionalCharges:N2}").FontSize(10);
                }

                // Invoice items
                if (invoice.InvoiceItems.Any())
                {
                    foreach (var item in invoice.InvoiceItems.OrderBy(i => i.LineNumber))
                    {
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(col =>
                        {
                            col.Item().Text(item.ItemName).FontSize(10);
                            if (!string.IsNullOrWhiteSpace(item.Description))
                            {
                                col.Item().Text(item.Description).FontSize(8).FontColor(Colors.Grey.Darken1).Italic();
                            }
                            col.Item().Text($"{item.Quantity} {item.UnitOfMeasure} × ${item.UnitPrice:N2}").FontSize(8).FontColor(Colors.Grey.Darken1);
                        });
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                            .Text($"${item.LineTotalWithTax:N2}").FontSize(10);
                    }
                }

                // Discount
                if (invoice.Discount > 0)
                {
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8)
                        .Text("Discount").FontSize(10).FontColor(Colors.Green.Medium);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(8).AlignRight()
                        .Text($"-${invoice.Discount:N2}").FontSize(10).FontColor(Colors.Green.Medium);
                }

                // Subtotal
                table.Cell().Padding(8).PaddingTop(10).AlignRight()
                    .Text("Subtotal:").FontSize(11).Bold();
                table.Cell().Padding(8).PaddingTop(10).AlignRight()
                    .Text($"${invoice.TotalAmount:N2}").FontSize(11).Bold();

                // Total amount
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).AlignRight()
                    .Text("TOTAL AMOUNT DUE:").FontSize(12).Bold();
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).AlignRight()
                    .Text($"${invoice.TotalAmount:N2}").FontSize(14).Bold().FontColor(Colors.Blue.Darken2);

                // Paid amount
                if (invoice.PaidAmount > 0)
                {
                    table.Cell().Padding(8).AlignRight()
                        .Text("Amount Paid:").FontSize(11).FontColor(Colors.Green.Medium);
                    table.Cell().Padding(8).AlignRight()
                        .Text($"${invoice.PaidAmount:N2}").FontSize(11).FontColor(Colors.Green.Medium);

                    // Remaining balance
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).AlignRight()
                        .Text("REMAINING BALANCE:").FontSize(12).Bold();
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).AlignRight()
                        .Text($"${invoice.RemainingBalance:N2}").FontSize(14).Bold()
                        .FontColor(invoice.RemainingBalance > 0 ? Colors.Red.Medium : Colors.Green.Medium);
                }
            });

            // Payment history
            if (invoice.Payments.Any())
            {
                column.Item().PaddingTop(30).Column(col =>
                {
                    col.Item().Text("PAYMENT HISTORY").FontSize(12).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                        });

                        // Header
                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Date").FontSize(9).Bold();
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Method").FontSize(9).Bold();
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Reference").FontSize(9).Bold();
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5).AlignRight()
                                .Text("Amount").FontSize(9).Bold();
                        });

                        foreach (var payment in invoice.Payments.OrderBy(p => p.PaymentDate))
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.PaymentDate.ToString("MMM dd, yyyy")).FontSize(9);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.Method.ToString()).FontSize(9);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.ReferenceNumber ?? "-").FontSize(9);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).AlignRight()
                                .Text($"${payment.Amount:N2}").FontSize(9);
                        }
                    });
                });
            }

            // Notes
            if (!string.IsNullOrWhiteSpace(invoice.Notes))
            {
                column.Item().PaddingTop(20).Column(col =>
                {
                    col.Item().Text("NOTES").FontSize(10).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingTop(5).Text(invoice.Notes).FontSize(9).FontColor(Colors.Grey.Darken1);
                });
            }

            // Payment instructions
            column.Item().PaddingTop(30).Background(Colors.Grey.Lighten4).Padding(15).Column(col =>
            {
                col.Item().Text("PAYMENT INSTRUCTIONS").FontSize(11).Bold().FontColor(Colors.Blue.Darken2);
                col.Item().PaddingTop(5).Text("Please make payment by the due date to avoid late fees.").FontSize(9);
                col.Item().Text("Accepted payment methods: Cash, Bank Transfer, Credit/Debit Card, Check").FontSize(9);
                col.Item().PaddingTop(5).Text("Bank Details:").FontSize(9).Bold();
                col.Item().Text("Bank Name: First National Bank | Account: 1234567890 | Routing: 987654321").FontSize(8);
            });
        });
    }

    private void ComposeFooter(IContainer container, Models.Entities.Invoice invoice)
    {
        container.AlignBottom().Column(column =>
        {
            column.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
            column.Item().PaddingTop(5).AlignCenter().Text(txt =>
            {
                txt.Span("Generated on ").FontSize(8).FontColor(Colors.Grey.Darken1);
                txt.Span(DateTime.UtcNow.ToString("MMM dd, yyyy HH:mm UTC")).FontSize(8).FontColor(Colors.Grey.Darken1);
            });
            column.Item().AlignCenter().Text("Thank you for your business!").FontSize(8).FontColor(Colors.Grey.Darken1);
            column.Item().AlignCenter().Text(text =>
            {
                text.Span("Page ").FontSize(8).FontColor(Colors.Grey.Darken1);
                text.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Darken1);
                text.Span(" of ").FontSize(8).FontColor(Colors.Grey.Darken1);
                text.TotalPages().FontSize(8).FontColor(Colors.Grey.Darken1);
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
