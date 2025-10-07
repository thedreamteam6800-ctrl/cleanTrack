'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Calendar, Clock, MapPin, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { apiService, Checklist } from '@/lib/api';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';

export default function TodayTasksPage() {
  const [todayTasks, setTodayTasks] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    pagination,
    updatePagination,
    changePage,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = usePagination({ perPage: 20 });

  const fetchTodayTasks = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTodayTasks(page, pagination.perPage);
      setTodayTasks(Array.isArray(response.data) ? response.data : []);
      updatePagination(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load today\'s tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks(currentPage);
  }, [currentPage]);

  const handleStartChecklist = async (checklistId: string) => {
    try {
      if (!navigator.geolocation) {
        setError('Location permission is required to start a checklist.');
        return;
      }

      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }).catch(() => {
        setError('Unable to get your location. Please enable location services and try again.');
        return undefined;
      });

      if (!coords) return;

      await apiService.startChecklist(checklistId, coords);
      // Refresh the tasks
      fetchTodayTasks(currentPage);
    } catch (err: any) {
      const extra = err?.data?.distance_meters !== undefined
        ? ` (You are ~${Math.round(err.data.distance_meters)}m away; allowed ${err.data.allowed_meters}m)`
        : '';
      setError((err.message || 'Failed to start checklist.') + extra);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'in_progress':
        return 'bg-blue-600';
      case 'pending':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const completedTasksToday = todayTasks.reduce((total, checklist) =>
    total + (checklist.items?.filter(item => item.completed).length || 0), 0
  );

  const totalTasksToday = todayTasks.reduce((total, checklist) =>
    total + (checklist.items?.length || 0), 0
  );

  if (loading) {
    return (
      <ProtectedRoute roles={['housekeeper']}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['housekeeper']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Today's Tasks</h1>
            <p className="text-blue-100 mb-4">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span>{completedTasksToday}/{totalTasksToday} Tasks Completed</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <span>{todayTasks.length} Properties Scheduled</span>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round((completedTasksToday / totalTasksToday) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(completedTasksToday / totalTasksToday) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task Lists */}
          <div className="space-y-6">
            {todayTasks.map((checklist) => {
              const completedTasks = checklist.items?.filter(item => item.completed).length || 0;
              const totalTasks = checklist.items?.length || 0;
              const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

              return (
                <Card key={checklist.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{checklist.property?.name}</CardTitle>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {checklist.property?.address}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          Scheduled: {new Date(checklist.scheduled_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(checklist.status)}>
                          {getStatusText(checklist.status)}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-2">
                          {completedTasks}/{totalTasks} completed
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-200">
                      {checklist.items?.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={item.completed}
                                disabled={checklist.status !== 'in_progress'}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <span className={`${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {item.task?.title}
                              </span>
                              {item.task?.requires_photo && (
                                <div className="flex items-center">
                                  <Camera className="h-4 w-4 text-blue-600 mr-1" />
                                  <span className="text-xs text-blue-600">Photo required</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              {item.task?.requires_photo && !item.completed && checklist.status === 'in_progress' && (
                                <Link href={`/checklists/${checklist.id}`}>
                                  <Button size="sm" variant="outline">
                                    <Camera className="h-4 w-4 mr-1" />
                                    Photo
                                  </Button>
                                </Link>
                              )}
                              {item.completed && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-gray-50 border-t">
                      <div className="flex gap-2">
                        {checklist.status === 'pending' && (
                          <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleStartChecklist(checklist.id)}
                          >
                            Start Checklist
                          </Button>
                        )}
                        {checklist.status === 'in_progress' && completedTasks === totalTasks && totalTasks > 0 && (
                          <Button className="bg-green-600 hover:bg-green-700">
                            Complete Checklist
                          </Button>
                        )}
                        <Link href={`/checklists/${checklist.id}`}>
                          <Button variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {!loading && todayTasks.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks scheduled for today</h3>
                <p className="text-gray-600">Check back later or contact your supervisor for assignments</p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {!loading && todayTasks && todayTasks.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
                isLoading={loading}
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
