using System.Globalization;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Drawing;
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

    /// <summary>
    /// Hoá đơn xuất ra theo quy ước Việt Nam: "12.000 ₫", "09/03/2026".
    /// </summary>
    private static readonly CultureInfo Vietnamese = CultureInfo.GetCultureInfo("vi-VN");

    /// <summary>
    /// Tên font sau khi đăng ký với QuestPDF.
    /// </summary>
    private const string FontFamily = "Roboto";

    /// <summary>
    /// Đăng ký font chỉ một lần cho cả tiến trình.
    /// </summary>
    /// <remarks>
    /// Trước đây tài liệu đặt FontFamily("Arial"). Trên máy dev macOS thì có
    /// Arial nên nhìn vẫn ổn, còn trong container Linux lúc deploy thì không —
    /// QuestPDF rơi về font thay thế, và font đó thiếu glyph tiếng Việt nên chữ
    /// có dấu ra ô vuông. Nhúng font vào assembly thì môi trường nào cũng như
    /// nhau.
    /// </remarks>
    private static readonly Lazy<bool> FontsRegistered = new(() =>
    {
        var assembly = typeof(PdfService).Assembly;

        foreach (var resourceName in assembly.GetManifestResourceNames())
        {
            if (!resourceName.EndsWith(".ttf", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream is not null)
            {
                FontManager.RegisterFont(stream);
            }
        }

        return true;
    });

    public PdfService(RentalManagementContext context)
    {
        _context = context;

        // Configure QuestPDF license (Community license for free use)
        QuestPDF.Settings.License = LicenseType.Community;

        _ = FontsRegistered.Value;
    }

    private static string Money(decimal amount) => amount.ToString("C0", Vietnamese);

    private static string Day(DateTime date) => date.ToString("dd/MM/yyyy", Vietnamese);

    private static string Month(DateTime date) => date.ToString("'Tháng' MM/yyyy", Vietnamese);

    private static string Quantity(decimal value) => value.ToString("0.###", Vietnamese);

    /// <summary>
    /// Generates a PDF for an invoice
    /// </summary>
    public async Task<byte[]> GenerateInvoicePdfAsync(int invoiceId)
    {
        // Fetch invoice with related data
        var invoice = await _context.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Room)
            .Include(i => i.Payments)
            .Include(i => i.InvoiceItems)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        if (invoice == null)
        {
            throw new KeyNotFoundException($"Invoice with ID {invoiceId} not found");
        }

        // Generate PDF
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(50);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily(FontFamily));

                page.Header().Element(c => ComposeHeader(c, invoice));
                page.Content().Element(c => ComposeContent(c, invoice));
                page.Footer().Element(c => ComposeFooter(c));
            });
        });

        return document.GeneratePdf();
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
                    col.Item().Text("HOÁ ĐƠN").FontSize(24).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().Text("Hệ thống quản lý nhà trọ").FontSize(9).FontColor(Colors.Grey.Darken1);
                    col.Item().Text("2/47 Phạm Văn Bạch, Phường Tân Sơn, TP. Hồ Chí Minh").FontSize(9);
                    col.Item().Text("Điện thoại: (+84) 966332942").FontSize(9);
                    col.Item().Text("Email: info@rental.com").FontSize(9);
                });

                // Invoice number and status (right side)
                row.RelativeItem().AlignRight().Column(col =>
                {
                    col.Item().Text($"#{invoice.InvoiceNumber}").FontSize(18).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text(txt =>
                    {
                        txt.Span(StatusLabel(invoice.Status)).FontSize(11).Bold().FontColor(GetStatusColor(invoice.Status));
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
                    col.Item().Text("KHÁCH THUÊ").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text(invoice.Customer.FullName).FontSize(12).Bold();
                    col.Item().Text($"Phòng: {invoice.Room.RoomNumber}").FontSize(9);
                    col.Item().Text($"Email: {invoice.Customer.Email}").FontSize(9);
                    col.Item().Text($"Điện thoại: {invoice.Customer.PhoneNumber}").FontSize(9);
                });

                // Invoice dates section
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("THÔNG TIN HOÁ ĐƠN").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Row(r =>
                    {
                        r.RelativeItem(1).Text("Ngày lập:").FontSize(9).FontColor(Colors.Grey.Darken1);
                        r.RelativeItem(1.5f).Text(Day(invoice.IssueDate)).FontSize(9).Bold();
                    });
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(1).Text("Hạn thanh toán:").FontSize(9).FontColor(Colors.Grey.Darken1);
                        r.RelativeItem(1.5f).Text(Day(invoice.DueDate)).FontSize(9).Bold().FontColor(Colors.Red.Medium);
                    });
                    col.Item().Row(r =>
                    {
                        r.RelativeItem(1).Text("Kỳ hoá đơn:").FontSize(9).FontColor(Colors.Grey.Darken1);
                        r.RelativeItem(1.5f).Text(Month(invoice.BillingPeriod)).FontSize(9).Bold();
                    });
                    if (invoice.PaidDate.HasValue)
                    {
                        col.Item().Row(r =>
                        {
                            r.RelativeItem(1).Text("Ngày thanh toán:").FontSize(9).FontColor(Colors.Grey.Darken1);
                            r.RelativeItem(1.5f).Text(Day(invoice.PaidDate.Value)).FontSize(9).Bold().FontColor(Colors.Green.Medium);
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
                        .Text("NỘI DUNG").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignCenter()
                        .Text("SL").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignCenter()
                        .Text("ĐVT").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignRight()
                        .Text("ĐƠN GIÁ").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background(Colors.Blue.Darken2).Padding(6).AlignRight()
                        .Text("THÀNH TIỀN").FontColor(Colors.White).FontSize(9).Bold();
                });

                // Additional charges
                if (invoice.AdditionalCharges > 0)
                {
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Column(col =>
                    {
                        col.Item().Text("Phụ thu").FontSize(9).Bold();
                        if (!string.IsNullOrWhiteSpace(invoice.AdditionalChargesDescription))
                        {
                            col.Item().PaddingTop(2).Text(invoice.AdditionalChargesDescription).FontSize(8).FontColor(Colors.Grey.Darken1).Italic();
                        }
                    });
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                        .Text("1").FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                        .Text("khoản").FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                        .Text(Money(invoice.AdditionalCharges)).FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                        .Text(Money(invoice.AdditionalCharges)).FontSize(9).Bold();
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
                                col.Item().PaddingTop(2).Text($"Thuế: {Quantity(item.TaxPercent)}%").FontSize(8).FontColor(Colors.Grey.Darken1);
                            }
                        });
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                            .Text(Quantity(item.Quantity)).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                            .Text(item.UnitOfMeasure).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                            .Text(Money(item.UnitPrice)).FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                            .Text(Money(item.LineTotalWithTax)).FontSize(9).Bold();
                    }
                }

                // Discount
                if (invoice.Discount > 0)
                {
                    table.Cell().Padding(6).Column(col =>
                    {
                        col.Item().Text("Giảm giá").FontSize(9).Bold().FontColor(Colors.Green.Darken1);
                    });
                    table.Cell().Padding(6).Text("");
                    table.Cell().Padding(6).Text("");
                    table.Cell().Padding(6).Text("");
                    table.Cell().Padding(6).AlignRight()
                        .Text($"-{Money(invoice.Discount)}").FontSize(9).Bold().FontColor(Colors.Green.Darken1);
                }

                // Subtotal
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("");
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("");
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("");
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignRight()
                    .Text("Cộng:").FontSize(9).Bold();
                table.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignRight()
                    .Text(Money(invoice.TotalAmount)).FontSize(9).Bold();

                // Total amount due
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).Text("");
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).Text("");
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).Text("");
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).AlignRight()
                    .Text("TỔNG CỘNG:").FontSize(10).Bold();
                table.Cell().Background(Colors.Blue.Lighten4).Padding(8).AlignRight()
                    .Text(Money(invoice.TotalAmount)).FontSize(12).Bold().FontColor(Colors.Blue.Darken2);

                // Paid amount
                if (invoice.PaidAmount > 0)
                {
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).Text("");
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).Text("");
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).Text("");
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).AlignRight()
                        .Text("Đã thanh toán:").FontSize(9).Bold().FontColor(Colors.Green.Darken1);
                    table.Cell().Background(Colors.Green.Lighten4).Padding(6).AlignRight()
                        .Text(Money(invoice.PaidAmount)).FontSize(9).Bold().FontColor(Colors.Green.Darken1);

                    // Remaining balance
                    var balanceColor = invoice.RemainingBalance > 0 ? Colors.Red.Medium : Colors.Green.Medium;
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).Text("");
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).Text("");
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).Text("");
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).AlignRight()
                        .Text("CÒN NỢ:").FontSize(10).Bold();
                    table.Cell().Background(Colors.Grey.Lighten3).Padding(8).AlignRight()
                        .Text(Money(invoice.RemainingBalance)).FontSize(12).Bold().FontColor(balanceColor);
                }
            });

            // Payment history
            if (invoice.Payments.Any())
            {
                column.Item().PaddingTop(20).Column(col =>
                {
                    col.Item().Text("LỊCH SỬ THANH TOÁN").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
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
                                .Text("Ngày").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Hình thức").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5)
                                .Text("Tham chiếu").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                            header.Cell().Background(Colors.Grey.Lighten2).Padding(5).AlignRight()
                                .Text("Số tiền").FontSize(8).Bold().FontColor(Colors.Grey.Darken2);
                        });

                        foreach (var payment in invoice.Payments.OrderBy(p => p.PaymentDate))
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(Day(payment.PaymentDate)).FontSize(8);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(MethodLabel(payment.Method)).FontSize(8);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5)
                                .Text(payment.ReferenceNumber ?? "-").FontSize(8);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).AlignRight()
                                .Text(Money(payment.Amount)).FontSize(8).Bold();
                        }
                    });
                });
            }

            // Notes
            if (!string.IsNullOrWhiteSpace(invoice.Notes))
            {
                column.Item().PaddingTop(15).Column(col =>
                {
                    col.Item().Text("GHI CHÚ").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(5).Text(invoice.Notes).FontSize(9).FontColor(Colors.Grey.Darken1);
                });
            }

            // Payment instructions
            column.Item().PaddingTop(15).Border(1).BorderColor(Colors.Grey.Lighten1).Background(Colors.Grey.Lighten4).Padding(10).Column(col =>
            {
                col.Item().Text("HƯỚNG DẪN THANH TOÁN").FontSize(10).Bold().FontColor(Colors.Grey.Darken2);
                col.Item().PaddingTop(5).Text("Vui lòng thanh toán trước hạn ghi trên hoá đơn để tránh phí trễ hạn.").FontSize(9);
                col.Item().Text("Hình thức nhận: tiền mặt, chuyển khoản, thẻ tín dụng/ghi nợ, séc.").FontSize(9);

                col.Item().PaddingTop(8).Border(1).BorderColor(Colors.Blue.Lighten1).Background(Colors.Blue.Lighten4).Padding(8).Column(bankCol =>
                {
                    bankCol.Item().Text("Thông tin chuyển khoản:").FontSize(9).Bold().FontColor(Colors.Blue.Darken2);
                    bankCol.Item().PaddingTop(3).Text(txt =>
                    {
                        txt.Span("Chủ tài khoản: ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        txt.Span("Vo Thai Dung").FontSize(8).Bold();
                        txt.Span(" | Số tài khoản: ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        txt.Span("50966332942 TPBank").FontSize(8).Bold();
                        txt.Span(" | Momo: ").FontSize(8).FontColor(Colors.Grey.Darken2);
                        txt.Span("0966332942").FontSize(8).Bold();
                    });
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.AlignBottom().Column(column =>
        {
            column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
            column.Item().PaddingTop(5).AlignCenter().Text("Cảm ơn đã thuê phòng!").FontSize(8).FontColor(Colors.Grey.Darken1);
            column.Item().AlignCenter().Text(txt =>
            {
                txt.Span("Xuất ngày ").FontSize(8).FontColor(Colors.Grey.Darken1);
                txt.Span(Day(DateTime.UtcNow)).FontSize(8).FontColor(Colors.Grey.Darken1);
            });
        });
    }

    private static string StatusLabel(Models.Entities.InvoiceStatus status) => status switch
    {
        Models.Entities.InvoiceStatus.Draft => "Nháp",
        Models.Entities.InvoiceStatus.Issued => "Đã phát hành",
        Models.Entities.InvoiceStatus.Unpaid => "Chưa thanh toán",
        Models.Entities.InvoiceStatus.PartiallyPaid => "Thanh toán một phần",
        Models.Entities.InvoiceStatus.Paid => "Đã thanh toán",
        Models.Entities.InvoiceStatus.Overdue => "Quá hạn",
        Models.Entities.InvoiceStatus.Cancelled => "Đã huỷ",
        _ => status.ToString()
    };

    private static string MethodLabel(Models.Entities.PaymentMethod method) => method switch
    {
        Models.Entities.PaymentMethod.Cash => "Tiền mặt",
        Models.Entities.PaymentMethod.BankTransfer => "Chuyển khoản",
        Models.Entities.PaymentMethod.Check => "Séc",
        Models.Entities.PaymentMethod.CreditCard => "Thẻ tín dụng",
        _ => method.ToString()
    };

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
