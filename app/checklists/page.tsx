'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckSquare, Plus, Calendar, User, Building2, Star } from 'lucide-react';
import Link from 'next/link';
import { apiService, Checklist } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';

export default function ChecklistsPage() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const {
    pagination,
    updatePagination,
    changePage,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = usePagination({ perPage: 20 });

  const fetchChecklists = async (filter?: string, page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (filter && filter !== 'all') {
        response = await apiService.getChecklistsByStatus(filter, page, pagination.perPage);
      } else {
        response = await apiService.getChecklists(page, pagination.perPage);
      }

      setChecklists(response.data);
      updatePagination(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load checklists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists(activeFilter, currentPage);
  }, [activeFilter, currentPage]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const handleStartChecklist = async (checklistId: string) => {
    try {
      await apiService.startChecklist(checklistId);
      fetchChecklists(activeFilter); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to start checklist.');
    }
  };

  const handleCompleteChecklist = async (checklistId: string) => {
    try {
      await apiService.completeChecklist(checklistId);
      fetchChecklists(activeFilter); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to complete checklist.');
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
      case 'reviewed':
        return 'bg-purple-600';
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
      case 'reviewed':
        return 'Reviewed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getCompletedTasksCount = (checklist: Checklist) => {
    return checklist.items?.filter(item => item.completed).length || 0;
  };

  const getTotalTasksCount = (checklist: Checklist) => {
    return checklist.items?.length || 0;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
              <p className="text-gray-600">Manage cleaning schedules and tasks</p>
            </div>
            {(user?.role === 'admin' || user?.role === 'property_owner') && (
              <Link href="/checklists/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Checklist
                </Button>
              </Link>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {['all', 'pending', 'in_progress', 'completed', 'reviewed'].map((filter) => (
              <Button
                key={filter}
                variant="ghost"
                size="sm"
                className={activeFilter === filter ? 'bg-white shadow-sm' : ''}
                onClick={() => handleFilterChange(filter)}
              >
                {filter === 'all' ? 'All' :
                 filter === 'in_progress' ? 'In Progress' :
                 filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>

          {/* Checklists Grid */}
          {!loading && checklists && checklists.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {checklists.map((checklist) => (
              <Card key={checklist.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                        {checklist.property?.name || 'Unknown Property'}
                      </CardTitle>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <User className="h-4 w-4 mr-1" />
                        {checklist.housekeeper?.name || 'Unassigned'}
                      </div>
                    </div>
                    <Badge className={getStatusColor(checklist.status)}>
                      {getStatusText(checklist.status)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        {new Date(checklist.scheduled_date).toLocaleDateString()}
                        {checklist.scheduled_time && (
                          <span className="ml-2 text-gray-500">
                            at {new Date(checklist.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {checklist.rating && (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                          {checklist.rating}/5
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{getCompletedTasksCount(checklist)}/{getTotalTasksCount(checklist)} tasks</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${getTotalTasksCount(checklist) > 0 ?
                              (getCompletedTasksCount(checklist) / getTotalTasksCount(checklist)) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/checklists/${checklist.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      {checklist.status === 'pending' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <button onClick={() => handleStartChecklist(checklist.id)}>
                            Start
                          </button>
                        </Button>
                      )}
                      {checklist.status === 'in_progress' &&
                       getCompletedTasksCount(checklist) === getTotalTasksCount(checklist) && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleCompleteChecklist(checklist.id)}
                        >
                          Complete
                        </Button>
                      )}
                      {checklist.status === 'completed' && !checklist.rating &&
                       (user?.role === 'admin' || user?.role === 'property_owner') && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Link href={`/checklists/${checklist.id}/review`}>
                            Review
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                    <div className="mt-4 h-8 bg-gray-200 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && (!checklists || checklists.length === 0) && (
            <Card className="text-center py-12">
              <CardContent>
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No checklists yet</h3>
                <p className="text-gray-600 mb-4">Create your first cleaning checklist to get started</p>
                <Link href="/checklists/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Checklist
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {!loading && checklists && checklists.length > 0 && (
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
