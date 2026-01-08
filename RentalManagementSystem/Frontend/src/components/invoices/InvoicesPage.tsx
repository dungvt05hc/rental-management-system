import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, FileText, DollarSign, Calendar, AlertCircle, Clock, CheckCircle, XCircle, TrendingUp, Download, Printer, Eye, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge, Tooltip, AlertDialog } from '../ui';
import { invoiceService } from '../../services';
import { formatCurrency, formatDate } from '../../utils';
import type { Invoice, InvoiceSearchRequest, InvoiceStatus } from '../../types';
import { InvoicePrintDialog } from './InvoicePrintDialog';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

export function InvoicesPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    invoiceId: string | null;
    invoiceNumber: string;
  }>({
    open: false,
    invoiceId: null,
    invoiceNumber: '',
  });

  useEffect(() => {
    loadInvoices();
  }, [searchQuery, statusFilter, pagination.page]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: InvoiceSearchRequest = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      };

      const response = await invoiceService.getInvoices(searchParams);

      if (response.success && response.data) {
        const paginatedData = response.data as any;
        // API returns items, page, pageSize, totalItems, totalPages
        setInvoices(paginatedData.items || []);
        setPagination({
          page: paginatedData.page || 1,
          pageSize: paginatedData.pageSize || 10,
          totalCount: paginatedData.totalItems || 0,
          totalPages: paginatedData.totalPages || 1,
        });
      } else {
        throw new Error(response.message || 'Failed to load invoices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    navigate('/invoices/new');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}/edit`);
  };

  const handleDeleteInvoice = (invoiceId: string, invoiceNumber: string) => {
    setConfirmDialog({
      open: true,
      invoiceId,
      invoiceNumber,
    });
  };

  const confirmDeleteInvoice = async () => {
    if (!confirmDialog.invoiceId) return;

    try {
      const response = await invoiceService.deleteInvoice(confirmDialog.invoiceId);
      if (response.success) {
        showSuccess(t('common.success', 'Success'), t('invoices.deleteSuccess', 'Invoice deleted successfully'));
        await loadInvoices();
      } else {
        showError(t('common.error', 'Error'), response.message || t('invoices.deleteError', 'Failed to delete invoice'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const handleExportPdf = async (invoice: Invoice) => {
    try {
      // Ensure we have a valid invoice ID
      const invoiceId = typeof invoice.id === 'number' ? invoice.id : parseInt(String(invoice.id), 10);
      
      if (isNaN(invoiceId)) {
        throw new Error('Invalid invoice ID');
      }
      
      await invoiceService.exportInvoicePdf(invoiceId.toString());
      
      // Show success message
      showSuccess(t('common.success', 'Success'), t('invoices.exportSuccess', 'Invoice exported successfully'));
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('invoices.exportError', 'Failed to export invoice')
      );
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPrintDialogOpen(true);
  };

  const handleViewDetails = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'partiallypaid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'paid':
        return <CheckCircle className="h-3 w-3" />;
      case 'overdue':
        return <AlertCircle className="h-3 w-3" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3" />;
      case 'partiallypaid':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status.toLowerCase() !== 'paid' && status.toLowerCase() !== 'cancelled';
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Calculate statistics
  const totalAmount = (invoices || []).reduce((sum, invoice) => {
    const invoiceData = invoice as any;
    return sum + (invoiceData.totalAmount || invoice.amount || 0);
  }, 0);
  
  const paidAmount = (invoices || []).filter(i => {
    const statusName = (i as any).statusName?.toLowerCase() || String(i.status)?.toLowerCase();
    return statusName === 'paid';
  }).reduce((sum, invoice) => {
    const invoiceData = invoice as any;
    return sum + (invoiceData.paidAmount || invoiceData.totalAmount || invoice.amount || 0);
  }, 0);
  
  const pendingAmount = (invoices || []).filter(i => {
    const statusName = (i as any).statusName?.toLowerCase() || String(i.status)?.toLowerCase();
    return statusName === 'pending';
  }).reduce((sum, invoice) => {
    const invoiceData = invoice as any;
    return sum + (invoiceData.remainingBalance || invoiceData.totalAmount || invoice.amount || 0);
  }, 0);
  
  const overdueInvoices = (invoices || []).filter(i => (i as any).isOverdue || isOverdue(i.dueDate, (i as any).statusName || i.status));
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => {
    const invoiceData = invoice as any;
    return sum + (invoiceData.remainingBalance || invoiceData.totalAmount || invoice.amount || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('invoices.title', 'Invoices Management')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('invoices.manageTrackInvoices', 'Manage and track all rental invoices')}</p>
        </div>
        <Button onClick={handleCreateInvoice} className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          <Plus className="h-4 w-4" />
          <span>{t('invoices.createInvoice', 'Create Invoice')}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder={t('invoices.searchPlaceholder', 'Search by invoice number, tenant name, or room...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="w-full md:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
                className="w-full h-11 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">{t('common.filter', 'All Status')}</option>
                <option value="Pending">{t('invoices.pending', 'Pending')}</option>
                <option value="Paid">{t('invoices.paid', 'Paid')}</option>
                <option value="Overdue">{t('invoices.overdue', 'Overdue')}</option>
                <option value="PartiallyPaid">{t('invoices.partiallyPaid', 'Partially Paid')}</option>
                <option value="Cancelled">{t('invoices.cancelled', 'Cancelled')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-blue-900">{t('invoices.totalAmount', 'Total Amount')}</p>
                  <Tooltip
                    content={
                      <div className="space-y-1">
                        <p className="font-semibold">{t('invoices.totalInvoiceAmount', 'Total Invoice Amount')}</p>
                        <p>{t('invoices.totalAmountDesc', 'The sum of all invoice amounts across all statuses (Paid, Pending, Overdue, etc.)')}</p>
                        <p className="text-blue-200 mt-2">{t('invoices.includesPaidUnpaid', 'This includes both paid and unpaid invoices.')}</p>
                      </div>
                    }
                    position="bottom"
                  >
                    <Info className="h-4 w-4 text-blue-600 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-blue-900 truncate">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-blue-700 mt-2">{pagination.totalCount} {t('invoices.totalInvoices', 'total invoices')}</p>
              </div>
              <div className="flex-shrink-0 p-4 rounded-2xl bg-blue-200">
                <DollarSign className="h-8 w-8 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-green-900">{t('invoices.paidAmount', 'Paid Amount')}</p>
                  <Tooltip
                    content={
                      <div className="space-y-1">
                        <p className="font-semibold">{t('invoices.totalPaidAmount', 'Total Paid Amount')}</p>
                        <p>{t('invoices.paidAmountDesc', 'The sum of all amounts that have been fully paid by tenants.')}</p>
                        <p className="text-green-200 mt-2">{t('invoices.revenueCollected', 'This represents the revenue successfully collected.')}</p>
                      </div>
                    }
                    position="bottom"
                  >
                    <Info className="h-4 w-4 text-green-600 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-green-900 truncate">{formatCurrency(paidAmount)}</p>
                <p className="text-xs text-green-700 mt-2">
                  {totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0}% {t('invoices.collected', 'collected')}
                </p>
              </div>
              <div className="flex-shrink-0 p-4 rounded-2xl bg-green-200">
                <CheckCircle className="h-8 w-8 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-yellow-900">{t('invoices.pendingAmount', 'Pending Amount')}</p>
                  <Tooltip
                    content={
                      <div className="space-y-1">
                        <p className="font-semibold">{t('invoices.pendingPaymentAmount', 'Pending Payment Amount')}</p>
                        <p>{t('invoices.pendingAmountDesc', 'The sum of all invoice amounts with "Pending" status.')}</p>
                        <p className="text-yellow-200 mt-2">{t('invoices.awaitingPayment', 'These invoices are awaiting payment and are not yet overdue.')}</p>
                      </div>
                    }
                    position="bottom"
                  >
                    <Info className="h-4 w-4 text-yellow-600 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-yellow-900 truncate">{formatCurrency(pendingAmount)}</p>
                <p className="text-xs text-yellow-700 mt-2">
                  {(invoices || []).filter(i => (i as any).statusName?.toLowerCase() === 'pending' || String(i.status) === 'Pending').length} {t('invoices.pending', 'pending')}
                </p>
              </div>
              <div className="flex-shrink-0 p-4 rounded-2xl bg-yellow-200">
                <Clock className="h-8 w-8 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-red-900">{t('invoices.overdueAmount', 'Overdue Amount')}</p>
                  <Tooltip
                    content={
                      <div className="space-y-1">
                        <p className="font-semibold">{t('invoices.overduePaymentAmount', 'Overdue Payment Amount')}</p>
                        <p>{t('invoices.overdueAmountDesc', 'The sum of all outstanding amounts from invoices that have passed their due date.')}</p>
                        <p className="text-red-200 mt-2">⚠️ {t('invoices.requiresAttention', 'These require immediate attention and follow-up.')}</p>
                      </div>
                    }
                    position="bottom"
                  >
                    <Info className="h-4 w-4 text-red-600 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-red-900 truncate">{formatCurrency(overdueAmount)}</p>
                <p className="text-xs text-red-700 mt-2">{overdueInvoices.length} {t('invoices.overdueInvoices', 'overdue invoices')}</p>
              </div>
              <div className="flex-shrink-0 p-4 rounded-2xl bg-red-200">
                <AlertCircle className="h-8 w-8 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">{t('invoices.invoiceList', 'Invoice List')}</CardTitle>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
              {pagination.totalCount} {t('invoices.total', 'Total')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">{t('common.loading', 'Loading invoices...')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={loadInvoices} className="mt-4">
                {t('common.refresh', 'Try Again')}
              </Button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('invoices.noInvoicesFound', 'No invoices found')}</h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery || statusFilter 
                  ? t('invoices.adjustSearchFilter', 'Try adjusting your search or filter criteria.') 
                  : t('invoices.getStartedMessage', 'Get started by creating your first invoice for your tenants.')
                }
              </p>
              {!searchQuery && !statusFilter && (
                <Button onClick={handleCreateInvoice} className="bg-gradient-to-r from-blue-600 to-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('invoices.createFirstInvoice', 'Create First Invoice')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('invoices.invoiceDetails', 'Invoice Details')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('invoices.tenantRoom', 'Tenant & Room')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('invoices.amount', 'Amount')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('rooms.status', 'Status')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('invoices.dueDate', 'Due Date')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('common.edit', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => {
                    const invoiceData = invoice as any;
                    const status = invoiceData.statusName || invoice.status;
                    const overdue = invoiceData.isOverdue || isOverdue(invoice.dueDate, status);
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {invoiceData.invoiceNumber || invoice.invoiceNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                {invoiceData.billingPeriod ? formatDate(invoiceData.billingPeriod) : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {invoiceData.tenant || invoice.tenant ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {invoiceData.tenant?.fullName || `${invoice.tenant?.firstName} ${invoice.tenant?.lastName}`}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {t('tenants.room', 'Room')} {invoiceData.room?.roomNumber || invoice.room?.roomNumber || 'N/A'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">{t('invoices.noTenantInfo', 'No tenant info')}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {formatCurrency(invoiceData.totalAmount || invoice.amount)}
                            </div>
                            {invoiceData.remainingBalance !== undefined && invoiceData.remainingBalance > 0 && (
                              <div className="text-xs text-orange-600 font-medium mt-1">
                                {formatCurrency(invoiceData.remainingBalance)} {t('invoices.due', 'due')}
                              </div>
                            )}
                            {invoiceData.paidAmount !== undefined && invoiceData.paidAmount > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                {formatCurrency(invoiceData.paidAmount)} {t('invoices.paid', 'paid')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusBadgeColor(status)} border font-medium flex items-center gap-1.5 px-2.5 py-1`}>
                              {getStatusIcon(status)}
                              <span>{status}</span>
                            </Badge>
                            {overdue && (
                              <div className="flex items-center text-red-600">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <div>
                              <div className={`font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatDate(invoice.dueDate)}
                              </div>
                              {overdue && (
                                <div className="text-xs text-red-600 font-medium">
                                  {t('invoices.overdue', 'Overdue')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(invoice)}
                              className="h-9 w-9 p-0 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                              title={t('invoices.viewDetails', 'View Details')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportPdf(invoice)}
                              className="h-9 w-9 p-0 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                              title={t('invoices.exportPdf', 'Export PDF')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintInvoice(invoice)}
                              className="h-9 w-9 p-0 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300"
                              title={t('invoices.print', 'Print Invoice')}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditInvoice(invoice)}
                              className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                              title={t('common.edit', 'Edit Invoice')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInvoice(String(invoice.id), invoice.invoiceNumber || '')}
                              className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                              title={t('common.delete', 'Delete Invoice')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}</span> of{' '}
                <span className="font-medium">{pagination.totalCount}</span> results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="h-9"
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const startPage = Math.max(1, pagination.page - 2);
                  const pageNum = startPage + i;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-9 min-w-[36px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="h-9"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Dialog */}
      <InvoicePrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        invoice={selectedInvoice}
        onExportPdf={() => selectedInvoice && handleExportPdf(selectedInvoice)}
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, invoiceId: null, invoiceNumber: '' })
        }
        title={t('invoices.deleteConfirmTitle', 'Delete Invoice')}
        description={t(
          'invoices.deleteConfirmMessage',
          `Are you sure you want to delete invoice ${confirmDialog.invoiceNumber}? This action cannot be undone and will remove all associated payment records.`
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteInvoice}
        variant="destructive"
      />
    </div>
  );
}
