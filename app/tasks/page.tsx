'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckSquare2,
  Plus,
  Search,
  MoreVertical,
  AlertCircle,
  Filter,
  Clock,
  Camera,
  DoorOpen
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiService, Task } from '@/lib/api';
import { TaskManagementDialog } from '@/components/tasks/task-management-dialog';
import { DeleteTaskDialog } from '@/components/tasks/delete-task-dialog';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';

interface TaskFilters {
  room_id?: string;
  search?: string;
  requires_photo?: boolean;
  sort_by?: 'title' | 'estimated_time' | 'created_at';
  sort_direction?: 'asc' | 'desc';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    sort_by: 'title',
    sort_direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogMode, setTaskDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const {
    pagination,
    updatePagination,
    changePage,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = usePagination({ perPage: 20 });

  const fetchData = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks data
      const tasksResponse = await apiService.getAllTasks(filters, page, pagination.perPage);
      setTasks(Array.isArray(tasksResponse.data) ? tasksResponse.data : []);
      updatePagination(tasksResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [filters, currentPage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: value || undefined
      }));
    }, 800);

    setSearchTimeout(timeout);
  };

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTaskAction = (action: 'create' | 'edit' | 'view', task?: Task) => {
    setTaskDialogMode(action);
    setSelectedTask(task || null);
    setShowTaskDialog(true);
  };

  const handleTaskSuccess = () => {
    fetchData();
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    fetchData();
  };

  const getStatusColor = (requiresPhoto: boolean) => {
    return requiresPhoto ? 'bg-blue-600' : 'bg-gray-600';
  };

  const getStatusText = (requiresPhoto: boolean) => {
    return requiresPhoto ? 'Photo Required' : 'No Photo';
  };

  const getRoomNames = (task: Task) => {
    return task.rooms?.map(room => room.name).join(', ') || 'No rooms assigned';
  };



  return (
    <ProtectedRoute roles={['admin', 'property_owner']}>
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600">Manage cleaning tasks and assign them to rooms</p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleTaskAction('create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Photo Requirement</label>
                  <Select
                    value={filters.requires_photo === undefined ? 'all' : filters.requires_photo ? 'required' : 'not_required'}
                    onValueChange={(value) => handleFilterChange('requires_photo', value === 'all' ? undefined : value === 'required')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks</SelectItem>
                      <SelectItem value="required">Photo required</SelectItem>
                      <SelectItem value="not_required">No photo required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Grid */}
          {loading ? (
            <Card className="text-center py-12">
              <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner size="lg" />
              </div>
            </Card>
          ) : tasks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <CheckSquare2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filters.requires_photo !== undefined
                    ? 'Try adjusting your filters to see more results'
                    : 'Create your first task to get started'
                  }
                </p>
                {!searchTerm && filters.requires_photo === undefined && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleTaskAction('create')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          <CheckSquare2 className="h-5 w-5 mr-2 text-green-600" />
                          {task.title}
                          {task.is_created_by_admin && (
                            <Badge variant="outline" className="ml-2 text-xs border-purple-300 text-purple-700 bg-purple-50">
                              Admin
                            </Badge>
                          )}
                        </CardTitle>

                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <DoorOpen className="h-4 w-4 mr-1" />
                          {getRoomNames(task)}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTaskAction('view', task)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTaskAction('edit', task)}>
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteClick(task)}
                          >
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {task.description && (
                        <p className="text-sm text-gray-600">{task.description}</p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-gray-600">Estimated Time:</span>
                          </div>
                          <span className="font-medium">{task.estimated_time} min</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Camera className="h-4 w-4 mr-1 text-gray-500" />
                            <span className="text-gray-600">Photo Required:</span>
                          </div>
                          <Badge className={getStatusColor(task.requires_photo)}>
                            {getStatusText(task.requires_photo)}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        Created: {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && tasks && tasks.length > 0 && (
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

        {/* Task Management Dialog */}
        <TaskManagementDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          mode={taskDialogMode}
          task={selectedTask}
          onSuccess={handleTaskSuccess}
        />

        {/* Delete Task Dialog */}
        <DeleteTaskDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          task={taskToDelete}
          onSuccess={handleDeleteSuccess}
        />

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg bg-green-600 hover:bg-green-700"
            onClick={() => handleTaskAction('create')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
