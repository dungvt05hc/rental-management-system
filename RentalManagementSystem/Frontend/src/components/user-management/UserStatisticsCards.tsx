import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import type { UserStatisticsDto } from '../../types';
import { Users, UserCheck, UserX, UserPlus, TrendingUp } from 'lucide-react';

interface UserStatisticsCardsProps {
  statistics: UserStatisticsDto;
}

/**
 * User Statistics Dashboard Cards
 * Displays key metrics about users in the system
 */
export function UserStatisticsCards({ statistics }: UserStatisticsCardsProps) {
  const stats = [
    {
      title: 'Total Users',
      value: statistics.totalUsers,
      icon: Users,
      description: 'All registered users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Users',
      value: statistics.activeUsers,
      icon: UserCheck,
      description: 'Currently active',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Inactive Users',
      value: statistics.inactiveUsers,
      icon: UserX,
      description: 'Deactivated accounts',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'New Users (30 days)',
      value: statistics.newUsersLast30Days,
      icon: UserPlus,
      description: 'Recently joined',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
