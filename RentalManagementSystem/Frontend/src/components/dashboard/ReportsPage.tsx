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

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('occupancy');
  const [dateRange, setDateRange] = useState<string>('current');

  const { data: occupancyResponse, isLoading: occupancyLoading } = useQuery({
    queryKey: ['occupancy-report'],
    queryFn: () => reportService.getOccupancyReport(),
    enabled: selectedReport === 'occupancy'
  });

  const { data: revenueResponse, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-report'],
    queryFn: () => reportService.getMonthlyRevenueReport(new Date().getFullYear()),
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
  const revenueData = revenueResponse?.data as RevenueReport;
  const monthlyData = monthlyResponse?.data; // Use generic data type since we don't have MonthlyReport[] from service

  const reportTypes = [
    {
      id: 'occupancy',
      name: 'Occupancy Report',
      description: 'Room occupancy rates and availability',
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'revenue',
      name: 'Revenue Report',
      description: 'Financial performance and collections',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'monthly',
      name: 'Monthly Summary',
      description: 'Month-by-month performance overview',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const isLoading = occupancyLoading || revenueLoading || monthlyLoading;

  const handleExportReport = (format: 'pdf' | 'excel') => {
    // Placeholder for export functionality
    console.log(`Exporting ${selectedReport} report as ${format}`);
  };

  const renderOccupancyReport = () => {
    if (!occupancyData) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Occupancy Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">Total Rooms</h3>
                <p className="text-3xl font-bold text-blue-600">{occupancyData.totalRooms}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">Occupied</h3>
                <p className="text-3xl font-bold text-green-600">{occupancyData.occupiedRooms}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900">Available</h3>
                <p className="text-3xl font-bold text-yellow-600">{occupancyData.availableRooms}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900">Occupancy Rate</h3>
                <p className="text-3xl font-bold text-purple-600">{formatPercentage(occupancyData.occupancyRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Room Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Occupied Rooms</span>
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
                <span>Available Rooms</span>
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
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900">Total Revenue</h3>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueData.totalRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900">Paid Amount</h3>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueData.paidAmount)}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900">Pending</h3>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(revenueData.pendingAmount)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <h3 className="text-lg font-semibold text-red-900">Overdue</h3>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(revenueData.overdueAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Collection Rate</span>
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
                  <p className="text-sm text-gray-500">Collected</p>
                  <p className="font-semibold text-green-600">
                    {formatPercentage((revenueData.paidAmount / revenueData.totalRevenue) * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="font-semibold text-yellow-600">
                    {formatPercentage((revenueData.pendingAmount / revenueData.totalRevenue) * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
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

    // Since the financial summary doesn't return MonthlyReport[], 
    // let's render a different view for the financial summary data
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(monthlyData).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {typeof value === 'number' ? 
                      (key.toLowerCase().includes('amount') || key.toLowerCase().includes('revenue') ? 
                        formatCurrency(value) : 
                        key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage') ?
                          formatPercentage(value) :
                          value.toLocaleString()
                      ) : 
                      String(value)
                    }
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Generate and view detailed business reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => handleExportReport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
          <button 
            onClick={() => handleExportReport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Select Report Type
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
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current">Current Month</option>
              <option value="last3">Last 3 Months</option>
              <option value="last6">Last 6 Months</option>
              <option value="year">Current Year</option>
              <option value="custom">Custom Range</option>
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
