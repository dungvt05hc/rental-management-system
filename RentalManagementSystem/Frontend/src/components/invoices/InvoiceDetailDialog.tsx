import { FileText, Calendar, DollarSign, User, Home, Package, Mail, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Badge } from '../ui';
import { formatCurrency, formatDate } from '../../utils';
import type { Invoice } from '../../types';

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
  onEdit,
  onPrint,
  onExport,
}: InvoiceDetailDialogProps) {
  if (!invoice) return null;

  const invoiceData = invoice as any;
  const status = invoiceData.statusName || invoice.status;
  const tenant = invoiceData.tenant || invoice.tenant;
  const room = invoiceData.room || invoice.room;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'partiallypaid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-xl">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-bold text-gray-900">
                  Invoice Details
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Complete invoice information and breakdown</p>
              </div>
            </div>
            <Badge className={`${getStatusColor(status)} border-2 font-semibold px-4 py-2 text-base`}>
              {status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Main Invoice Header - Similar to the image */}
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 rounded-2xl p-8 border-2 border-blue-200 shadow-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="col-span-2 md:col-span-1">
                <div className="text-sm text-blue-700 font-semibold mb-2 uppercase tracking-wide">Invoice Number</div>
                <div className="text-3xl font-bold text-blue-900">
                  {invoiceData.invoiceNumber || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-700 font-semibold mb-2 uppercase tracking-wide">Billing Period</div>
                <div className="text-xl font-bold text-blue-900">
                  {invoiceData.billingPeriod ? formatDate(invoiceData.billingPeriod) : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-700 font-semibold mb-2 uppercase tracking-wide">Issue Date</div>
                <div className="text-lg font-semibold text-blue-900">
                  {formatDate(invoiceData.issueDate || invoiceData.issuedDate || invoice.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-700 font-semibold mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </div>
                <div className="text-lg font-semibold text-blue-900">
                  {formatDate(invoice.dueDate)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tenant Information Card */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-100">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tenant Information</h3>
              </div>
              {tenant ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Name</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {tenant.fullName || `${tenant.firstName} ${tenant.lastName}`}
                      </div>
                    </div>
                  </div>
                  {tenant.email && (
                    <div className="flex items-start gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Mail className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</div>
                        <div className="font-medium text-gray-900">{tenant.email}</div>
                      </div>
                    </div>
                  )}
                  {tenant.phoneNumber && (
                    <div className="flex items-start gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Phone className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                        <div className="font-medium text-gray-900">{tenant.phoneNumber}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">No tenant information available</div>
              )}
            </div>

            {/* Room Information Card */}
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-100">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Home className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Room Information</h3>
              </div>
              {room ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <Home className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Room Number</div>
                      <div className="font-bold text-gray-900 text-2xl">{room.roomNumber}</div>
                    </div>
                  </div>
                  {room.monthlyRent !== undefined && (
                    <div className="flex items-start gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <DollarSign className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monthly Rent</div>
                        <div className="font-bold text-gray-900 text-lg">
                          {formatCurrency(room.monthlyRent)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">No room information available</div>
              )}
            </div>
          </div>

          {/* Amount Breakdown - Matching the image design */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-gray-200 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Amount Breakdown</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Monthly Rent Line */}
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-base font-medium text-gray-700">Monthly Rent</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(room?.monthlyRent || invoiceData.monthlyRent || 0)}
                </span>
              </div>
              
              {invoiceData.additionalCharges !== undefined && invoiceData.additionalCharges > 0 && (
                <div className="flex justify-between items-start py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <span className="text-base font-medium text-gray-700">Additional Charges</span>
                    {invoiceData.additionalChargesDescription && (
                      <div className="text-sm text-gray-500 mt-1">
                        {invoiceData.additionalChargesDescription}
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(invoiceData.additionalCharges)}
                  </span>
                </div>
              )}

              {invoiceData.discount !== undefined && invoiceData.discount > 0 && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-base font-medium text-green-600">Discount</span>
                  <span className="text-lg font-bold text-green-600">-{formatCurrency(invoiceData.discount)}</span>
                </div>
              )}

              {/* Total Amount - Using invoice's totalAmount */}
              <div className="bg-blue-50 rounded-xl p-5 border-2 border-blue-200 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-blue-900">Total Amount</span>
                  <span className="text-4xl font-bold text-blue-600">
                    {formatCurrency(invoiceData.totalAmount || invoice.amount)}
                  </span>
                </div>
              </div>

              {/* Payment Status Information */}
              {invoiceData.paidAmount !== undefined && invoiceData.paidAmount > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200 flex justify-between items-center">
                  <span className="text-base font-semibold text-green-700">Paid Amount</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(invoiceData.paidAmount)}
                  </span>
                </div>
              )}

              {invoiceData.remainingBalance !== undefined && invoiceData.remainingBalance > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200 flex justify-between items-center">
                  <span className="text-base font-semibold text-orange-700">Remaining Balance</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {formatCurrency(invoiceData.remainingBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items (Line Items) */}
          {invoiceData.invoiceItems && invoiceData.invoiceItems.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b-2 border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-200 p-2 rounded-lg">
                    <Package className="h-6 w-6 text-indigo-700" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Invoice Line Items</h3>
                  <Badge className="ml-2 bg-indigo-200 text-indigo-800 border-indigo-300 font-semibold">
                    {invoiceData.invoiceItems.length} items
                  </Badge>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Discount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Tax
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoiceData.invoiceItems.map((item: any, index: number) => (
                      <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{item.itemName}</div>
                          <div className="text-xs text-gray-500">{item.itemCode}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.description || '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          {item.quantity} {item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-green-600 font-medium">
                          {item.discountAmount > 0 ? `-${formatCurrency(item.discountAmount)}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          {item.taxAmount > 0 ? formatCurrency(item.taxAmount) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-base font-bold text-blue-600">
                          {formatCurrency(item.lineTotalWithTax || item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments History */}
          {invoiceData.payments && invoiceData.payments.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b-2 border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-200 p-2 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-700" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Payment History</h3>
                  <Badge className="ml-2 bg-green-200 text-green-800 border-green-300 font-semibold">
                    {invoiceData.payments.length} payments
                  </Badge>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {invoiceData.payments.map((payment: any, index: number) => (
                  <div
                    key={payment.id || index}
                    className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="font-bold text-gray-900 text-lg">
                        {formatDate(payment.paymentDate)}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {payment.methodName || payment.method}
                        {payment.referenceNumber && ` • Ref: ${payment.referenceNumber}`}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoiceData.notes && (
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Notes</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{invoiceData.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t-2">
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onEdit();
                  onOpenChange(false);
                }}
                className="px-6 py-2 h-11 font-medium"
              >
                Edit Invoice
              </Button>
            )}
            {onPrint && (
              <Button
                variant="outline"
                onClick={() => {
                  onPrint();
                  onOpenChange(false);
                }}
                className="px-6 py-2 h-11 font-medium"
              >
                Print Invoice
              </Button>
            )}
            {onExport && (
              <Button
                onClick={() => {
                  onExport();
                  onOpenChange(false);
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2 h-11 font-medium"
              >
                Export PDF
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6 py-2 h-11 font-medium"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
