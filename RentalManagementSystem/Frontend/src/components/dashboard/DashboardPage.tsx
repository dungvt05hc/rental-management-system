import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
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
  XCircle
} from 'lucide-react';
import { reportService } from '../../services';
import { formatCurrency, formatPercentage } from '../../utils';
import type { OccupancyReport, RevenueReport } from '../../types';

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

      // Load occupancy and revenue reports
      const [occupancyResponse, revenueResponse] = await Promise.all([
        reportService.getOccupancyReport(),
        reportService.getRevenueReport(),
      ]);

      if (occupancyResponse.success && revenueResponse.success) {
        const occupancy = occupancyResponse.data as OccupancyReport;
        const revenue = revenueResponse.data as RevenueReport;

        setStats({
          totalRooms: occupancy.totalRooms,
          occupiedRooms: occupancy.occupiedRooms,
          availableRooms: occupancy.availableRooms,
          totalRevenue: revenue.totalRevenue,
          paidAmount: revenue.paidAmount,
          pendingAmount: revenue.pendingAmount,
          overdueAmount: revenue.overdueAmount,
          occupancyRate: occupancy.occupancyRate,
          collectionRate: revenue.collectionRate,
        });

        // Generate system alerts based on data
        generateSystemAlerts(occupancy, revenue);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        title: 'Low Occupancy Rate',
        message: `Current occupancy rate is ${formatPercentage(occupancy.occupancyRate)}. Consider marketing strategies.`,
        timestamp: new Date(),
      });
    }

    // High overdue amount alert
    if (revenue.overdueAmount > revenue.totalRevenue * 0.1) {
      newAlerts.push({
        id: 'high-overdue',
        type: 'error',
        title: 'High Overdue Amount',
        message: `${formatCurrency(revenue.overdueAmount)} in overdue payments requires immediate attention.`,
        timestamp: new Date(),
      });
    }

    // Good collection rate alert
    if (revenue.collectionRate > 90) {
      newAlerts.push({
        id: 'good-collection',
        type: 'success',
        title: 'Excellent Collection Rate',
        message: `Current collection rate is ${formatPercentage(revenue.collectionRate)}. Keep up the good work!`,
        timestamp: new Date(),
      });
    }

    // High occupancy alert
    if (occupancy.occupancyRate > 95) {
      newAlerts.push({
        id: 'high-occupancy',
        type: 'info',
        title: 'High Occupancy Rate',
        message: `Occupancy rate is ${formatPercentage(occupancy.occupancyRate)}. Consider expanding capacity.`,
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

  const mainStatCards = [
    {
      title: 'Total Rooms',
      value: stats.totalRooms.toString(),
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Total properties available',
      trend: null,
    },
    {
      title: 'Occupied Rooms',
      value: stats.occupiedRooms.toString(),
      subtitle: `${stats.availableRooms} available`,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Currently occupied rooms',
      trend: `${formatPercentage(stats.occupancyRate)} occupancy`,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      subtitle: formatCurrency(stats.paidAmount) + ' collected',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Total revenue this month',
      trend: `${formatPercentage(stats.collectionRate)} collection rate`,
    },
    {
      title: 'Pending Amount',
      value: formatCurrency(stats.pendingAmount),
      subtitle: formatCurrency(stats.overdueAmount) + ' overdue',
      icon: FileText,
      color: stats.overdueAmount > 0 ? 'text-red-600' : 'text-yellow-600',
      bgColor: stats.overdueAmount > 0 ? 'bg-red-100' : 'bg-yellow-100',
      description: 'Outstanding payments',
      trend: stats.overdueAmount > 0 ? 'Attention needed' : 'On track',
    },
  ];

  if (isLoading && stats.totalRooms === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <Clock className="h-4 w-4 mr-1" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-500">Welcome to the Rental Management System</p>
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            aria-label="Refresh dashboard data"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh data"
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
              <p>Error loading dashboard data: {error}</p>
              <button
                onClick={loadDashboardData}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Alerts */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          System Alerts {alerts.length > 0 && `(${alerts.length})`}
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500">No alerts at this time.</p>
        ) : (
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
                        aria-label="Dismiss alert"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
              Occupancy Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Occupancy Rate</span>
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
                  <p className="text-sm text-gray-500">Occupied</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.availableRooms}</p>
                  <p className="text-sm text-gray-500">Available</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Revenue Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Collection Rate</span>
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
                  <p className="text-xs text-gray-500">Collected</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</p>
                  <p className="text-xs text-gray-500">Overdue</p>
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
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/rooms"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-blue-300 group"
            >
              <div className="flex items-center space-x-3">
                <Building className="h-8 w-8 text-blue-600 group-hover:text-blue-700 transition-colors" />
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800">Manage Rooms</h3>
                  <p className="text-sm text-gray-500">Add, edit, or view room details</p>
                </div>
              </div>
            </a>

            <a
              href="/tenants"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-green-300 group"
            >
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-green-600 group-hover:text-green-700 transition-colors" />
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800">Manage Tenants</h3>
                  <p className="text-sm text-gray-500">Add, edit, or view tenant information</p>
                </div>
              </div>
            </a>

            <a
              href="/invoices"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-purple-300 group"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-purple-600 group-hover:text-purple-700 transition-colors" />
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800">Manage Invoices</h3>
                  <p className="text-sm text-gray-500">Create and track invoice payments</p>
                </div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
