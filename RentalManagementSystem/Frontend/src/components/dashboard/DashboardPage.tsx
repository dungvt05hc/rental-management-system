import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../ui';
import { 
  Building, 
  Users, 
  FileText, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Calendar,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { reportService, roomService } from '../../services';
import { formatCurrency, formatPercentage } from '../../utils';
import type { OccupancyReport, RevenueReport, Room } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  occupancyRate: number;
  collectionRate: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    totalRevenue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    occupancyRate: 0,
    collectionRate: 0,
  });
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading dashboard data...');

      // Load dashboard summary which includes both occupancy and revenue data
      const [occupancyResponse, dashboardResponse, roomsResponse] = await Promise.all([
        reportService.getOccupancyReport(),
        reportService.getDashboardSummary(),
        roomService.getRooms({ page: 1, pageSize: 5 }),
      ]);

      console.log('Occupancy Response:', occupancyResponse);
      console.log('Dashboard Response:', dashboardResponse);
      console.log('Rooms Response:', roomsResponse);

      // Check if responses are successful
      if (!occupancyResponse.success) {
        console.error('Occupancy report failed:', occupancyResponse);
        throw new Error(occupancyResponse.message || 'Failed to load occupancy data');
      }

      if (!dashboardResponse.success) {
        console.error('Dashboard summary failed:', dashboardResponse);
        throw new Error(dashboardResponse.message || 'Failed to load dashboard data');
      }

      if (!roomsResponse.success) {
        console.warn('Rooms failed to load:', roomsResponse);
        // Don't throw error for rooms, just log it
      }

      const occupancy = occupancyResponse.data as OccupancyReport;
      const dashboard = dashboardResponse.data as any;

      console.log('Parsed occupancy:', occupancy);
      console.log('Parsed dashboard:', dashboard);

      // Extract financial data from dashboard.Financials (note the capital F)
      const financials = dashboard?.Financials || dashboard?.financials || {};
      const occupancyData = dashboard?.Occupancy || dashboard?.occupancy || {};
      
      console.log('Financials:', financials);
      console.log('Occupancy Data:', occupancyData);

      setStats({
        totalRooms: occupancy?.totalRooms || occupancyData?.TotalRooms || occupancyData?.totalRooms || 0,
        occupiedRooms: occupancy?.occupiedRooms || occupancyData?.OccupiedRooms || occupancyData?.occupiedRooms || 0,
        availableRooms: occupancy?.availableRooms || occupancyData?.VacantRooms || occupancyData?.vacantRooms || 0,
        totalRevenue: financials?.MonthlyRevenue || financials?.monthlyRevenue || 0,
        paidAmount: financials?.MonthlyRevenue || financials?.monthlyRevenue || 0,
        pendingAmount: financials?.PendingPayments || financials?.pendingPayments || 0,
        overdueAmount: financials?.OverdueInvoices || financials?.overdueInvoices || 0,
        occupancyRate: occupancy?.occupancyRate || occupancyData?.OccupancyRate || occupancyData?.occupancyRate || 0,
        collectionRate: financials?.MonthlyRevenue && (financials?.MonthlyRevenue + (financials?.PendingPayments || 0)) > 0
          ? Math.round((financials.MonthlyRevenue / (financials.MonthlyRevenue + (financials?.PendingPayments || 0))) * 100)
          : 0,
      });

      // Set recent rooms
      if (roomsResponse.success && roomsResponse.data) {
        const paginatedData = roomsResponse.data as any;
        setRecentRooms(paginatedData.items || []);
      }

      // Generate system alerts based on data
      if (occupancy && dashboard) {
        generateSystemAlerts(occupancy, {
          totalRevenue: financials?.MonthlyRevenue || 0,
          paidAmount: financials?.MonthlyRevenue || 0,
          pendingAmount: financials?.PendingPayments || 0,
          overdueAmount: financials?.OverdueInvoices || 0,
          collectionRate: financials?.MonthlyRevenue && (financials?.MonthlyRevenue + (financials?.PendingPayments || 0)) > 0
            ? Math.round((financials.MonthlyRevenue / (financials.MonthlyRevenue + (financials?.PendingPayments || 0))) * 100)
            : 0,
        } as RevenueReport);
      }
      
      setLastUpdated(new Date());
      console.log('Dashboard data loaded successfully');
    } catch (err) {
      console.error('Dashboard error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSystemAlerts = (occupancy: OccupancyReport, revenue: RevenueReport) => {
    const newAlerts: SystemAlert[] = [];

    // Low occupancy alert
    if (occupancy.occupancyRate < 70) {
      newAlerts.push({
        id: 'low-occupancy',
        type: 'warning',
        title: t('dashboard.lowOccupancy', 'Low Occupancy Rate'),
        message: `${t('dashboard.currentOccupancyRate', 'Current occupancy rate is')} ${formatPercentage(occupancy.occupancyRate)}. ${t('dashboard.considerMarketing', 'Consider marketing strategies.')}.`,
        timestamp: new Date(),
      });
    }

    // High overdue amount alert
    if (revenue.overdueAmount > revenue.totalRevenue * 0.1) {
      newAlerts.push({
        id: 'high-overdue',
        type: 'error',
        title: t('dashboard.highOverdue', 'High Overdue Amount'),
        message: `${formatCurrency(revenue.overdueAmount)} ${t('dashboard.overdueRequiresAttention', 'in overdue payments requires immediate attention')}.`,
        timestamp: new Date(),
      });
    }

    // Good collection rate alert
    if (revenue.collectionRate > 90) {
      newAlerts.push({
        id: 'good-collection',
        type: 'success',
        title: t('dashboard.excellentCollection', 'Excellent Collection Rate'),
        message: `${t('dashboard.currentCollectionRate', 'Current collection rate is')} ${formatPercentage(revenue.collectionRate)}. ${t('dashboard.keepUpGoodWork', 'Keep up the good work!')}`,
        timestamp: new Date(),
      });
    }

    // High occupancy alert
    if (occupancy.occupancyRate > 95) {
      newAlerts.push({
        id: 'high-occupancy',
        type: 'info',
        title: t('dashboard.highOccupancyTitle', 'High Occupancy Rate'),
        message: `${t('dashboard.occupancyRateIs', 'Occupancy rate is')} ${formatPercentage(occupancy.occupancyRate)}. ${t('dashboard.considerExpanding', 'Consider expanding capacity.')}.`,
        timestamp: new Date(),
      });
    }

    setAlerts(newAlerts);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return XCircle;
      case 'warning':
        return AlertCircle;
      case 'info':
        return Bell;
      default:
        return AlertCircle;
    }
  };

  const getAlertColors = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const handleQuickAction = (action: 'rooms' | 'tenants' | 'invoices') => {
    navigate(`/${action}`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'vacant':
        return 'bg-green-100 text-green-800';
      case 'rented':
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const mainStatCards = [
    {
      title: t('dashboard.totalRooms', 'Total Rooms'),
      value: stats.totalRooms.toString(),
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: t('dashboard.totalPropertiesAvailable', 'Total properties available'),
      trend: null,
    },
    {
      title: t('dashboard.occupiedRooms', 'Occupied Rooms'),
      value: stats.occupiedRooms.toString(),
      subtitle: `${stats.availableRooms} ${t('rooms.available', 'available')}`,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: t('dashboard.currentlyOccupiedRooms', 'Currently occupied rooms'),
      trend: `${formatPercentage(stats.occupancyRate)} ${t('dashboard.occupancy', 'occupancy')}`,
    },
    {
      title: t('dashboard.totalRevenue', 'Total Revenue'),
      value: formatCurrency(stats.totalRevenue),
      subtitle: formatCurrency(stats.paidAmount) + ' ' + t('dashboard.collected', 'collected'),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: t('dashboard.totalRevenueThisMonth', 'Total revenue this month'),
      trend: `${formatPercentage(stats.collectionRate)} ${t('dashboard.collectionRate', 'collection rate')}`,
    },
    {
      title: t('dashboard.pendingAmount', 'Pending Amount'),
      value: formatCurrency(stats.pendingAmount),
      subtitle: formatCurrency(stats.overdueAmount) + ' ' + t('dashboard.overdue', 'overdue'),
      icon: FileText,
      color: stats.overdueAmount > 0 ? 'text-red-600' : 'text-yellow-600',
      bgColor: stats.overdueAmount > 0 ? 'bg-red-100' : 'bg-yellow-100',
      description: t('dashboard.outstandingPayments', 'Outstanding payments'),
      trend: stats.overdueAmount > 0 ? t('dashboard.attentionNeeded', 'Attention needed') : t('dashboard.onTrack', 'On track'),
    },
  ];

  if (isLoading && stats.totalRooms === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title', 'Dashboard')}</h1>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title', 'Dashboard')}</h1>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <Clock className="h-4 w-4 mr-1" />
            {t('dashboard.lastUpdated', 'Last updated')}: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-500">
            {t('dashboard.welcomeMessage', 'Welcome to the Rental Management System')}
          </p>
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title={t('common.refresh', 'Refresh data')}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{t('common.error', 'Error loading dashboard data')}: {error}</p>
              <button
                onClick={loadDashboardData}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                {t('common.refresh', 'Retry')}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            {t('dashboard.systemAlerts', 'System Alerts')} ({alerts.length})
          </h2>
          <div className="grid gap-3">
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <Card key={alert.id} className={`border ${getAlertColors(alert.type)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 mt-0.5" />
                        <div>
                          <h3 className="font-medium">{alert.title}</h3>
                          <p className="text-sm mt-1">{alert.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-gray-400 hover:text-gray-600 ml-4"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStatCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">
                        {stat.subtitle}
                      </p>
                    )}
                    {stat.trend && (
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        <p className="text-xs text-gray-500">{stat.trend}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              {t('dashboard.occupancyMetrics', 'Occupancy Metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('dashboard.currentOccupancyRate', 'Current Occupancy Rate')}</span>
                <span className="font-semibold">{formatPercentage(stats.occupancyRate)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.occupancyRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.occupiedRooms}</p>
                  <p className="text-sm text-gray-500">{t('rooms.occupied', 'Occupied')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.availableRooms}</p>
                  <p className="text-sm text-gray-500">{t('rooms.available', 'Available')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              {t('dashboard.revenueMetrics', 'Revenue Metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('dashboard.collectionRate', 'Collection Rate')}</span>
                <span className="font-semibold">{formatPercentage(stats.collectionRate)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.collectionRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
                  <p className="text-xs text-gray-500">{t('dashboard.collected', 'Collected')}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
                  <p className="text-xs text-gray-500">{t('invoices.unpaid', 'Pending')}</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</p>
                  <p className="text-xs text-gray-500">{t('dashboard.overdue', 'Overdue')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {t('dashboard.quickActions', 'Quick Actions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleQuickAction('rooms')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-blue-300 group"
            >
              <div className="flex items-center space-x-3">
                <Building className="h-8 w-8 text-blue-600 group-hover:text-blue-700 transition-colors" />
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800">{t('dashboard.manageRooms', 'Manage Rooms')}</h3>
                  <p className="text-sm text-gray-500">{t('dashboard.addEditViewRooms', 'Add, edit, or view room details')}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction('tenants')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-green-300 group"
            >
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-green-600 group-hover:text-green-700 transition-colors" />
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800">{t('dashboard.manageTenants', 'Manage Tenants')}</h3>
                  <p className="text-sm text-gray-500">{t('dashboard.addEditViewTenants', 'Add, edit, or view tenant information')}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction('invoices')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-purple-300 group"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-purple-600 group-hover:text-purple-700 transition-colors" />
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800">{t('dashboard.manageInvoices', 'Manage Invoices')}</h3>
                  <p className="text-sm text-gray-500">{t('dashboard.createTrackInvoices', 'Create and track invoice payments')}</p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
