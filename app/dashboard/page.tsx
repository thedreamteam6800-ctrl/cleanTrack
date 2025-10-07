'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { Building2, CheckSquare, Users, Calendar, TrendingUp, AlertCircle, Plus, DoorOpen, UserPlus, Star, ListTodo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiService, DashboardStats, ActivityItem } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [statsResponse, activityResponse] = await Promise.all([
          apiService.getDashboardOverview(),
          apiService.getRecentActivity()
        ]);
        
        setStats(statsResponse.data);
        setRecentActivity(activityResponse.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatsCards = () => {
    if (!stats) return [];
    
    const cards = [
      {
        title: 'Total Properties',
        value: stats.total_properties?.toString() || '0',
        icon: Building2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        title: 'Active Checklists',
        value: stats.active_checklists?.toString() || '0',
        icon: CheckSquare,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      {
        title: 'Team Members',
        value: stats.team_members?.toString() || '0',
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      {
        title: 'This Month',
        value: stats.this_month?.toString() || '0',
        icon: Calendar,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      },
    ];

    // Add role-specific stats
    if (user?.role === 'admin') {
      cards.push({
        title: 'Completion Rate',
        value: `${stats.completion_rate || 0}%`,
        icon: TrendingUp,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
      });
    } else if (user?.role === 'housekeeper') {
      cards.push({
        title: 'Tasks Today',
        value: stats.tasks_today?.toString() || '0',
        icon: Calendar,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
      });
    }

    return cards;
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-blue-100">
              Here's what's happening with your properties today.
            </p>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center h-20">
                      <LoadingSpinner size="lg" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getStatsCards().map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="transition-all duration-200 hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <div className={`${stat.bgColor} p-3 rounded-full`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={activity.avatar} alt={activity.user} />
                          <AvatarFallback className="text-xs">
                            {activity.user.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Create Property - Admin and Property Owner only */}
                  {(user?.role === 'admin' || user?.role === 'property_owner') && (
                    <button 
                      onClick={() => router.push('/properties/new')}
                      className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <Plus className="h-4 w-4 mr-2 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Create Property</p>
                          <p className="text-sm text-green-600">Register a new property</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Create Room - Admin and Property Owner only */}
                  {(user?.role === 'admin' || user?.role === 'property_owner') && (
                    <button 
                      onClick={() => router.push('/rooms')}
                      className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <DoorOpen className="h-4 w-4 mr-2 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">Create Room</p>
                          <p className="text-sm text-blue-600">Add a new room</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Create Task - Admin and Property Owner only */}
                  {(user?.role === 'admin' || user?.role === 'property_owner') && (
                    <button 
                      onClick={() => router.push('/tasks')}
                      className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <ListTodo className="h-4 w-4 mr-2 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Create Task</p>
                          <p className="text-sm text-green-600">Add a new cleaning task</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Create Checklist - All users */}
                  <button 
                    onClick={() => router.push('/checklists/new')}
                    className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <CheckSquare className="h-4 w-4 mr-2 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-900">Create Checklist</p>
                        <p className="text-sm text-purple-600">Schedule a cleaning task</p>
                      </div>
                    </div>
                  </button>

                  {/* Create User - Admin only */}
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => router.push('/users')}
                      className="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2 text-orange-600" />
                        <div>
                          <p className="font-medium text-orange-900">Create User</p>
                          <p className="text-sm text-orange-600">Add a new team member</p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}