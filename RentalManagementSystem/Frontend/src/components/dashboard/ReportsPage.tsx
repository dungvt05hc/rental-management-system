import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3,
  Building,
  DollarSign,
  Eye,
  Printer
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services';
import { formatCurrency, formatPercentage } from '../../utils';
import type { OccupancyReport, RevenueReport } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

export function ReportsPage() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<string>('occupancy');
  const [dateRange, setDateRange] = useState<string>('current');

  const { data: occupancyResponse, isLoading: occupancyLoading } = useQuery({
    queryKey: ['occupancy-report'],
    queryFn: () => reportService.getOccupancyReport(),
    enabled: selectedReport === 'occupancy'
  });

  const { data: revenueResponse, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-report'],
    queryFn: () => {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      return reportService.getFinancialSummary(startOfYear, today);
    },
    enabled: selectedReport === 'revenue'
  });

  const { data: monthlyResponse, isLoading: monthlyLoading } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => reportService.getFinancialSummary(
      new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
      new Date().toISOString().split('T')[0] // Today
    ),
    enabled: selectedReport === 'monthly'
  });

  const occupancyData = occupancyResponse?.data as OccupancyReport;
  
  // Map the financial summary response to the RevenueReport structure
  const revenueData: RevenueReport | undefined = revenueResponse?.data ? {
    totalRevenue: revenueResponse.data.revenue?.totalRevenue || 0,
    paidAmount: revenueResponse.data.revenue?.totalPayments || 0,
    pendingAmount: revenueResponse.data.revenue?.totalOutstanding || 0,
    overdueAmount: 0, // Calculate from pending if needed
    collectionRate: revenueResponse.data.revenue?.collectionRate || 0
  } : undefined;
  
  const monthlyData = monthlyResponse?.data; // Use generic data type since we don't have MonthlyReport[] from service

  const reportTypes = [
    {
      id: 'occupancy',
      name: t('reports.occupancyReport', 'Occupancy Report'),
      description: t('reports.occupancyReportHint', 'How full the rooms are and what is still free'),
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'revenue',
      name: t('reports.revenueReport', 'Revenue Report'),
      description: t('reports.revenueReportHint', 'Money coming in and how much is collected'),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'monthly',
      name: t('reports.monthlySummary', 'Monthly Summary'),
      description: t('reports.monthlySummaryHint', 'How each month went, side by side'),
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const isLoading = occupancyLoading || revenueLoading || monthlyLoading;

  const handleExportReport = (format: 'pdf' | 'excel') => {
    // Placeholder: report export is not wired to a backend endpoint yet.
    void format;
  };

  const renderOccupancyReport = () => {
    if (!occupancyData) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              {t('reports.occupancyOverview', 'Occupancy Overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">{t('dashboard.totalRooms', 'Total Rooms')}</h3>
                <p className="text-3xl font-bold text-blue-600">{occupancyData.totalRooms}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">{t('rooms.occupied', 'Occupied')}</h3>
                <p className="text-3xl font-bold text-green-600">{occupancyData.occupiedRooms}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900">{t('rooms.available', 'Available')}</h3>
                <p className="text-3xl font-bold text-yellow-600">{occupancyData.availableRooms}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900">{t('reports.occupancyRate', 'Occupancy Rate')}</h3>
                <p className="text-3xl font-bold text-purple-600">{formatPercentage(occupancyData.occupancyRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.roomDistribution', 'Room Distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>{t('dashboard.occupiedRooms', 'Occupied Rooms')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${occupancyData.occupancyRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{formatPercentage(occupancyData.occupancyRate)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('reports.availableRooms', 'Available Rooms')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(occupancyData.availableRooms / occupancyData.totalRooms) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {formatPercentage((occupancyData.availableRooms / occupancyData.totalRooms) * 100)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRevenueReport = () => {
    if (!revenueData) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              {t('reports.revenueOverview', 'Revenue Overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">{t('dashboard.totalRevenue', 'Total Revenue')}</h3>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueData.totalRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">{t('invoices.paidAmount', 'Paid Amount')}</h3>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueData.paidAmount)}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900">{t('invoices.pending', 'Pending')}</h3>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(revenueData.pendingAmount)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <h3 className="text-lg font-semibold text-red-900">{t('invoices.overdue', 'Overdue')}</h3>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(revenueData.overdueAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.collectionPerformance', 'Collection Performance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{t('dashboard.collectionRate', 'Collection Rate')}</span>
                <span className="text-2xl font-bold text-green-600">{formatPercentage(revenueData.collectionRate)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${revenueData.collectionRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">{t('dashboard.collected', 'Collected')}</p>
                  <p className="font-semibold text-green-600">
                    {formatPercentage((revenueData.paidAmount / revenueData.totalRevenue) * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('invoices.pending', 'Pending')}</p>
                  <p className="font-semibold text-yellow-600">
                    {formatPercentage((revenueData.pendingAmount / revenueData.totalRevenue) * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('invoices.overdue', 'Overdue')}</p>
                  <p className="font-semibold text-red-600">
                    {formatPercentage((revenueData.overdueAmount / revenueData.totalRevenue) * 100)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMonthlyReport = () => {
    if (!monthlyData) return null;

    // Extract the nested structure from the financial summary response
    const reportPeriod = monthlyData.reportPeriod;
    const revenue = monthlyData.revenue;
    const deposits = monthlyData.deposits;
    const summary = monthlyData.summary;
    const monthlyBreakdown = monthlyData.monthlyBreakdown || [];

    return (
      <div className="space-y-6">
        {/* Report Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              {t('reports.reportPeriod', 'Report Period')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">{t('reports.fromDate', 'From Date')}</h3>
                <p className="text-xl font-bold text-blue-600">
                  {reportPeriod.fromDate ? new Date(reportPeriod.fromDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">{t('reports.toDate', 'To Date')}</h3>
                <p className="text-xl font-bold text-blue-600">
                  {reportPeriod.toDate ? new Date(reportPeriod.toDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              {t('reports.revenueSummary', 'Revenue Summary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">{t('dashboard.totalRevenue', 'Total Revenue')}</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenue.totalRevenue || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">{t('reports.totalPayments', 'Total Payments')}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(revenue.totalPayments || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900">{t('reports.outstanding', 'Outstanding')}</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(revenue.totalOutstanding || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900">{t('dashboard.collectionRate', 'Collection Rate')}</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(revenue.collectionRate || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              {t('reports.securityDeposits', 'Security Deposits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">{t('reports.totalSecurityDeposits', 'Total Security Deposits')}</h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(deposits.totalSecurityDeposits || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              {t('reports.financialSummary', 'Financial Summary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900">{t('reports.averageMonthlyRevenue', 'Average Monthly Revenue')}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.averageMonthlyRevenue || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900">{t('reports.totalInvoices', 'Total Invoices')}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {(summary.totalInvoices || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900">{t('reports.netIncome', 'Net Income')}</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.netIncome || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        {monthlyBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.monthlyBreakdown', 'Monthly Breakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('reports.period', 'Period')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('reports.totalInvoiced', 'Total Invoiced')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('invoices.paidAmount', 'Paid Amount')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('reports.outstanding', 'Outstanding')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('dashboard.collectionRate', 'Collection Rate')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('invoices.title', 'Invoices')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyBreakdown.map((month, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {month.period || `${month.year}-${String(month.month).padStart(2, '0')}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatCurrency(month.totalInvoiced || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                          {formatCurrency(month.paidAmount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                          {formatCurrency(month.outstandingAmount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-semibold">
                          {formatPercentage(month.collectionRate || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {(month.invoiceCount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports.title', 'Reports')}</h1>
          <p className="text-gray-500">{t('reports.subtitle', 'Build and read detailed business reports')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => handleExportReport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{t('reports.exportPdf', 'Export PDF')}</span>
          </button>
          <button 
            onClick={() => handleExportReport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{t('reports.exportExcel', 'Export Excel')}</span>
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t('reports.selectReportType', 'Choose a report')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReport === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${report.bgColor}`}>
                      <Icon className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <div className="text-left">
                      <h3 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {report.name}
                      </h3>
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{t('reports.dateRange', 'Date range')}</span>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current">{t('reports.currentMonth', 'Current Month')}</option>
              <option value="last3">{t('reports.last3Months', 'Last 3 Months')}</option>
              <option value="last6">{t('reports.last6Months', 'Last 6 Months')}</option>
              <option value="year">{t('reports.currentYear', 'Current Year')}</option>
              <option value="custom">{t('reports.customRange', 'Custom Range')}</option>
            </select>
            <div className="flex items-center space-x-2 ml-auto">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Eye className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div>
          {selectedReport === 'occupancy' && renderOccupancyReport()}
          {selectedReport === 'revenue' && renderRevenueReport()}
          {selectedReport === 'monthly' && renderMonthlyReport()}
        </div>
      )}
    </div>
  );
}
