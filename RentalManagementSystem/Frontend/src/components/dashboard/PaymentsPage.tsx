import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Receipt
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentService } from '../../services';
import { formatCurrency, formatDate } from '../../utils';
import type { Payment } from '../../types';

export function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: paymentsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['payments', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: () => paymentService.getPayments({
      search: searchTerm || undefined,
      page: currentPage,
      pageSize: pageSize
    }),
  });

  const payments = paymentsResponse?.data?.data || [];

  // Filter payments based on search and payment method
  const filteredPayments = payments.filter((payment: Payment) => {
    const matchesSearch = 
      payment.invoice?.tenant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.tenant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.tenant?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      payment.paymentMethod.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0),
    cashPayments: payments.filter((p: Payment) => p.paymentMethod === 'Cash').length,
    cashAmount: payments.filter((p: Payment) => p.paymentMethod === 'Cash').reduce((sum: number, p: Payment) => sum + p.amount, 0),
    bankPayments: payments.filter((p: Payment) => p.paymentMethod === 'BankTransfer').length,
    bankAmount: payments.filter((p: Payment) => p.paymentMethod === 'BankTransfer').reduce((sum: number, p: Payment) => sum + p.amount, 0),
    checkPayments: payments.filter((p: Payment) => p.paymentMethod === 'Check').length,
    avgPaymentAmount: payments.length > 0 ? payments.reduce((sum: number, p: Payment) => sum + p.amount, 0) / payments.length : 0,
  };

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'banktransfer':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'cash':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'check':
        return <Receipt className="h-4 w-4 text-purple-500" />;
      case 'creditcard':
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Payments</h3>
          <p className="text-gray-500 mb-4">There was an error loading payment data.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500">Manage and track all payment transactions</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Payments</p>
                <p className="text-2xl font-bold text-green-600">{stats.cashPayments}</p>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(stats.cashAmount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bank Transfers</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.bankPayments}</p>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(stats.bankAmount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <CreditCard className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Amount</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.avgPaymentAmount)}</p>
                <p className="text-sm text-gray-500 mt-1">{stats.checkPayments} checks</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by tenant name, email, method, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="banktransfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="creditcard">Credit Card</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Tenant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Invoice</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment: Payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {payment.invoice?.tenant?.firstName} {payment.invoice?.tenant?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{payment.invoice?.tenant?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">#{payment.invoice?.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">
                            Due: {payment.invoice?.dueDate ? formatDate(payment.invoice.dueDate) : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getMethodIcon(payment.paymentMethod)}
                          <span className="text-gray-900">{payment.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-gray-900">{formatDate(payment.paymentDate)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.paymentDate).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="px-2 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                            Completed
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-500 font-mono text-sm">
                          {payment.reference || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-500">No payments match your current search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredPayments.length)} of{' '}
            {filteredPayments.length} payments
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
