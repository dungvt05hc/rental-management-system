import { useState, useEffect } from 'react';
import { Server, Users, Home, UserCheck, Database, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { systemManagementApi, type SystemInfo } from '../../services/systemManagementApi';

const SystemInfoTab: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemManagementApi.getSystemInfo();
      setSystemInfo(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
        No system information available
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const stats = [
    {
      title: 'Version',
      value: systemInfo.version,
      icon: Server,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Users',
      value: systemInfo.totalUsers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Rooms',
      value: systemInfo.totalRooms,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Tenants',
      value: `${systemInfo.activeTenants}/${systemInfo.totalTenants}`,
      icon: UserCheck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium text-gray-700">Environment</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  systemInfo.environment === 'Production'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {systemInfo.environment}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium text-gray-700">Server Time</span>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">{formatDateTime(systemInfo.serverTime)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium text-gray-700">Default Language</span>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                    {systemInfo.defaultLanguage.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium text-gray-700">Total Languages</span>
                <span className="text-gray-900">{systemInfo.totalLanguages}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(systemInfo.databaseInfo).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="font-medium text-gray-700">{key}</span>
                  {key === 'CanConnect' ? (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      value === 'True'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {value === 'True' ? 'Connected' : 'Disconnected'}
                    </span>
                  ) : (
                    <span className="text-gray-900">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemInfoTab;
