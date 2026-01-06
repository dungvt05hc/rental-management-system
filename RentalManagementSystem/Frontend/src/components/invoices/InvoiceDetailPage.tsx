import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar, DollarSign, User, Home, Package, Mail, Phone, ArrowLeft, Edit, Printer, Download } from 'lucide-react';
import { Button, Badge, AlertDialog } from '../ui';
import { formatCurrency, formatDate } from '../../utils';
import { invoiceService } from '../../services/invoices';
import { InvoicePrintDialog } from './InvoicePrintDialog';
import { useState } from 'react';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>({
    open: false,
    type: 'info',
    message: '',
  });

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoice(id!).then(res => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/invoices')}>Back to Invoices</Button>
        </div>
      </div>
    );
  }

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

  const handleEdit = () => {
    navigate(`/invoices/${id}/edit`);
  };

  const handlePrint = () => {
    setIsPrintDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      // Ensure we have a valid invoice ID
      const invoiceId = typeof invoice.id === 'number' ? invoice.id : parseInt(String(invoice.id), 10);
      
      if (isNaN(invoiceId)) {
        throw new Error('Invalid invoice ID');
      }
      
      // Call the export service
      await invoiceService.exportInvoicePdf(invoiceId.toString());
      
      // Wait a bit to ensure download has started before showing success message
      // This gives the browser time to show the save dialog
      setTimeout(() => {
        setAlertConfig({
          open: true,
          type: 'success',
          title: 'Success',
          message: 'PDF export initiated successfully! Please check your downloads folder.',
        });
      }, 500);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setAlertConfig({
        open: true,
        type: 'error',
        title: 'Export Failed',
        message: err instanceof Error ? err.message : 'An unknown error occurred while exporting the PDF.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Actions */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/invoices')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                onClick={handleExport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-3 rounded-xl">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Invoice</h2>
                    <p className="text-sm text-gray-600 mt-1">Complete invoice information and breakdown</p>
                  </div>
                </div>
                <Badge className={`${getStatusColor(status)} border-2 font-semibold px-4 py-2 text-base`}>
                  {status}
                </Badge>
              </div>

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tenant Information Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
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
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
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

          {/* Amount Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-gray-600 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
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

              {/* Total Amount */}
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Invoice Line Items</h3>
                  <Badge className="ml-2 bg-indigo-200 text-indigo-800 border-indigo-300 font-semibold">
                    {invoiceData.invoiceItems.length} items
                  </Badge>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <DollarSign className="h-6 w-6 text-white" />
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
        </div>
      </div>

      {/* Print Dialog */}
      <InvoicePrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        invoice={invoice}
        onExportPdf={handleExport}
      />

      {/* Custom Alert Dialog */}
      <AlertDialog
        open={alertConfig.open}
        onOpenChange={(open) => setAlertConfig({ ...alertConfig, open })}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
      />
    </div>
  );
}
