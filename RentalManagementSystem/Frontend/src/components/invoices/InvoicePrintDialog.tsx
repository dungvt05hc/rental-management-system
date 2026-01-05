import { Button } from '../ui';
import { formatCurrency, formatDate } from '../../utils';
import { Printer, Download, ArrowLeft, X } from 'lucide-react';
import type { Invoice } from '../../types';

interface InvoicePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onExportPdf: () => void;
}

export function InvoicePrintDialog({ open, onOpenChange, invoice, onExportPdf }: InvoicePrintDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!open || !invoice) return null;

  const invoiceData = invoice as any;
  const status = invoiceData.statusName || invoice.status;
  
  // Calculate total amount by summing all line items
  const monthlyRentAmount = invoiceData.monthlyRent || 0;
  const additionalChargesAmount = invoiceData.additionalCharges || 0;
  const invoiceItemsTotal = (invoiceData.invoiceItems || []).reduce(
    (sum: number, item: any) => sum + (item.lineTotalWithTax || item.lineTotal || 0), 
    0
  );
  const discountAmount = invoiceData.discount || 0;
  
  const totalAmount = monthlyRentAmount + additionalChargesAmount + invoiceItemsTotal - discountAmount;
  const paidAmount = invoiceData.paidAmount || 0;
  const remainingBalance = totalAmount - paidAmount;

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-content,
          #invoice-print-content * {
            visibility: visible;
          }
          #invoice-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            max-width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          /* Prevent page breaks inside important elements */
          .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Ensure tables don't break badly */
          table {
            page-break-inside: auto;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }
          /* Optimize spacing for print */
          .print-compact {
            margin-bottom: 6px !important;
          }
          /* Better font rendering for print */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Ensure borders and backgrounds print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Table styling for print */
          table {
            width: 100% !important;
          }
          table, th, td {
            border-color: #d1d5db !important;
          }
          /* Status badge colors */
          .status-badge {
            border: 1px solid currentColor !important;
          }
        }
      `}</style>

      {/* Full Page Layout */}
      <div className="fixed inset-0 z-50 bg-gray-100 overflow-hidden flex flex-col">
        {/* Header - Hide on print */}
        <div className="no-print bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">Invoice Preview</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onExportPdf}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
                <Button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="h-10 w-10 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Content - Scrollable and Printable */}
        <div className="flex-1 overflow-y-auto bg-gray-100 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white shadow-xl rounded-lg p-8 print:shadow-none print:rounded-none print:p-0" id="invoice-print-content">
              {/* Invoice Header */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-blue-600 no-break print:mb-3 print:pb-2">
                <div>
                  <h1 className="text-3xl font-bold text-blue-600 mb-1 print:text-2xl">INVOICE</h1>
                  <p className="text-xs text-gray-600 print:text-[9px] print:leading-tight">Rental Management System</p>
                  <p className="text-xs text-gray-600 print:text-[9px] print:leading-tight">2/47 Phạm Văn Bạch, Phường Tân Sơn, TP. Hồ Chí Minh</p>
                  <p className="text-xs text-gray-600 print:text-[9px] print:leading-tight">Phone: (555) 123-4567</p>
                  <p className="text-xs text-gray-600 print:text-[9px] print:leading-tight">Email: info@rental.com</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-2 print:text-xl print:mb-1">
                    #{invoiceData.invoiceNumber || invoice.invoiceNumber}
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold print:text-[10px] print:px-2 print:py-0.5 status-badge ${
                    status?.toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' :
                    status?.toLowerCase() === 'overdue' ? 'bg-red-100 text-red-800' :
                    status?.toLowerCase() === 'partiallypaid' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {status}
                  </div>
                </div>
              </div>

              {/* Bill To & Invoice Details */}
              <div className="grid grid-cols-2 gap-6 mb-4 no-break print:gap-4 print:mb-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase print:text-[9px] print:mb-1">Bill To</h3>
                  <div className="text-gray-900">
                    <p className="font-semibold text-base print:text-sm print:leading-tight">
                      {invoiceData.tenant?.fullName || `${invoice.tenant?.firstName} ${invoice.tenant?.lastName}`}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 print:text-[9px] print:mt-0.5 print:leading-tight">
                      Room: {invoiceData.room?.roomNumber || invoice.room?.roomNumber}
                    </p>
                    <p className="text-xs text-gray-600 print:text-[9px] print:leading-tight">
                      Email: {invoiceData.tenant?.email || invoice.tenant?.email}
                    </p>
                    <p className="text-xs text-gray-600 print:text-[9px] print:leading-tight">
                      Phone: {invoiceData.tenant?.phoneNumber || invoice.tenant?.phoneNumber}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase print:text-[9px] print:mb-1">Invoice Details</h3>
                  <div className="space-y-1 text-xs print:text-[9px] print:space-y-0.5">
                    <div className="flex justify-between print:leading-tight">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="font-medium">{formatDate(invoiceData.issueDate || invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between print:leading-tight">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium text-red-600">{formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between print:leading-tight">
                      <span className="text-gray-600">Billing Period:</span>
                      <span className="font-medium">
                        {invoiceData.billingPeriod ? new Date(invoiceData.billingPeriod).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                      </span>
                    </div>
                    {invoiceData.paidDate && (
                      <div className="flex justify-between print:leading-tight">
                        <span className="text-gray-600">Paid Date:</span>
                        <span className="font-medium text-green-600">{formatDate(invoiceData.paidDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="mb-4 print:mb-3">
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="px-2 py-2 text-left text-xs font-semibold border-r border-blue-500 print:px-1.5 print:py-1 print:text-[9px]">Description</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold border-r border-blue-500 print:px-1.5 print:py-1 print:text-[9px]">Qty</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold border-r border-blue-500 print:px-1.5 print:py-1 print:text-[9px]">Unit</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold border-r border-blue-500 print:px-1.5 print:py-1 print:text-[9px]">Unit Price</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold print:px-1.5 print:py-1 print:text-[9px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="no-break hover:bg-gray-50">
                      <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                        <div className="font-medium">Monthly Rent</div>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">1</td>
                      <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">month</td>
                      <td className="px-2 py-2 text-xs text-gray-900 text-right border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                        {formatCurrency(invoiceData.monthlyRent || 0)}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-900 text-right font-medium print:px-1.5 print:py-1 print:text-[9px]">
                        {formatCurrency(invoiceData.monthlyRent || 0)}
                      </td>
                    </tr>
                    
                    {invoiceData.additionalCharges > 0 && (
                      <tr className="no-break hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                          <div className="font-medium">Additional Charges</div>
                          {invoiceData.additionalChargesDescription && (
                            <div className="text-[10px] text-gray-500 italic mt-0.5 print:text-[8px]">
                              {invoiceData.additionalChargesDescription}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">1</td>
                        <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">item</td>
                        <td className="px-2 py-2 text-xs text-gray-900 text-right border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                          {formatCurrency(invoiceData.additionalCharges)}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-900 text-right font-medium print:px-1.5 print:py-1 print:text-[9px]">
                          {formatCurrency(invoiceData.additionalCharges)}
                        </td>
                      </tr>
                    )}

                    {invoiceData.invoiceItems && invoiceData.invoiceItems.length > 0 && (
                      invoiceData.invoiceItems.map((item: any, index: number) => (
                        <tr key={index} className="no-break hover:bg-gray-50">
                          <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                            <div className="font-medium">{item.itemName}</div>
                            {item.description && (
                              <div className="text-[10px] text-gray-500 italic mt-0.5 print:text-[8px]">{item.description}</div>
                            )}
                            {item.taxRate > 0 && (
                              <div className="text-[10px] text-gray-500 mt-0.5 print:text-[8px]">
                                Tax: {item.taxRate}%
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                            {item.quantity}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 text-center border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                            {item.unitOfMeasure}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 text-right border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900 text-right font-medium print:px-1.5 print:py-1 print:text-[9px]">
                            {formatCurrency(item.lineTotalWithTax || item.lineTotal)}
                          </td>
                        </tr>
                      ))
                    )}

                    {invoiceData.discount > 0 && (
                      <tr className="no-break bg-green-50">
                        <td colSpan={4} className="px-2 py-2 text-xs text-green-600 text-right font-medium border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                          Discount
                        </td>
                        <td className="px-2 py-2 text-xs text-green-600 text-right font-medium print:px-1.5 print:py-1 print:text-[9px]">
                          -{formatCurrency(invoiceData.discount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 no-break">
                      <td colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-900 text-right border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                        Subtotal:
                      </td>
                      <td className="px-2 py-2 text-xs font-bold text-gray-900 text-right print:px-1.5 print:py-1 print:text-[9px]">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50 no-break">
                      <td colSpan={4} className="px-2 py-2 text-sm font-bold text-gray-900 text-right border-r border-gray-200 print:px-1.5 print:py-1.5 print:text-[10px]">
                        TOTAL AMOUNT DUE:
                      </td>
                      <td className="px-2 py-2 text-lg font-bold text-blue-600 text-right print:px-1.5 print:py-1.5 print:text-sm">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                    {paidAmount > 0 && (
                      <>
                        <tr className="bg-green-50 no-break">
                          <td colSpan={4} className="px-2 py-2 text-xs font-semibold text-green-700 text-right border-r border-gray-200 print:px-1.5 print:py-1 print:text-[9px]">
                            Amount Paid:
                          </td>
                          <td className="px-2 py-2 text-xs font-bold text-green-700 text-right print:px-1.5 print:py-1 print:text-[9px]">
                            {formatCurrency(paidAmount)}
                          </td>
                        </tr>
                        <tr className="bg-gray-100 no-break">
                          <td colSpan={4} className="px-2 py-2 text-sm font-bold text-gray-900 text-right border-r border-gray-200 print:px-1.5 print:py-1.5 print:text-[10px]">
                            REMAINING BALANCE:
                          </td>
                          <td className="px-2 py-2 text-lg font-bold text-right print:px-1.5 print:py-1.5 print:text-sm" style={{ color: remainingBalance > 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(remainingBalance)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Payment History */}
              {invoiceData.payments && invoiceData.payments.length > 0 && (
                <div className="mb-4 no-break print:mb-3">
                  <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase print:text-[9px] print:mb-1">Payment History</h3>
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 border-r border-gray-300 print:px-1.5 print:py-1 print:text-[8px]">Date</th>
                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 border-r border-gray-300 print:px-1.5 print:py-1 print:text-[8px]">Method</th>
                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-700 border-r border-gray-300 print:px-1.5 print:py-1 print:text-[8px]">Reference</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-700 print:px-1.5 print:py-1 print:text-[8px]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceData.payments.map((payment: any, index: number) => (
                        <tr key={index} className="no-break">
                          <td className="px-2 py-1.5 text-[10px] text-gray-900 border-r border-gray-200 print:px-1.5 print:py-1 print:text-[8px]">
                            {formatDate(payment.paymentDate)}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-gray-900 border-r border-gray-200 print:px-1.5 print:py-1 print:text-[8px]">
                            {payment.methodName || payment.method}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-gray-900 border-r border-gray-200 print:px-1.5 print:py-1 print:text-[8px]">
                            {payment.referenceNumber || '-'}
                          </td>
                          <td className="px-2 py-1.5 text-[10px] text-gray-900 text-right font-medium print:px-1.5 print:py-1 print:text-[8px]">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              {invoiceData.notes && (
                <div className="mb-4 no-break print:mb-3">
                  <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase print:text-[9px] print:mb-1">Notes</h3>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap print:text-[9px] print:leading-tight">{invoiceData.notes}</p>
                </div>
              )}

              {/* Payment Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 no-break print:p-2 print:mb-2">
                <h3 className="text-xs font-bold text-gray-700 mb-1.5 uppercase print:text-[9px] print:mb-1">Payment Instructions</h3>
                <p className="text-xs text-gray-600 mb-1 print:text-[9px] print:leading-tight print:mb-0.5">Please make payment by the due date to avoid late fees.</p>
                <p className="text-xs text-gray-600 mb-1 print:text-[9px] print:leading-tight print:mb-0.5">Accepted payment methods: Cash, Bank Transfer, Credit/Debit Card, Check</p>
                <div className="mt-2 text-[10px] text-gray-600 print:mt-1 print:text-[8px] print:leading-tight">
                  <p className="font-semibold">Bank Details:</p>
                  <p>Bank Name: First National Bank | Account: 1234567890 | Routing: 987654321</p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-3 text-center text-[10px] text-gray-500 no-break print:pt-2 print:text-[8px]">
                <p>Thank you for your business!</p>
                <p className="mt-0.5">Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
