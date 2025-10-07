'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DeletePropertyDialog } from '@/components/properties/delete-property-dialog';
import { RoomManagementDialog } from '@/components/properties/room-management-dialog';
import { TaskManagementDialog } from '@/components/tasks/task-management-dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  MapPin,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  AlertCircle,
  Clock,
  Camera,
  MoreVertical,
  DoorOpen,
  CheckSquare2,
  Image as ImageIcon,
  Search,
  X
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';
import Link from 'next/link';
import { apiService, Property, Room, Task } from '@/lib/api';
import { getAmenities } from '@/lib/utils';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  // Check permissions - only property owners can manage rooms and tasks
  const canManageRooms = user?.role === 'property_owner';
  const canManageTasks = user?.role === 'property_owner';
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showRoomDeleteDialog, setShowRoomDeleteDialog] = useState(false);
  const [showTaskDeleteDialog, setShowTaskDeleteDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [roomDialogMode, setRoomDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [taskDialogMode, setTaskDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [propertyLoaded, setPropertyLoaded] = useState(false);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  const propertyId = params.id as string;



  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setPropertyLoaded(false); // Reset property loaded state
        const propertyResponse = await apiService.getProperty(propertyId);

        setProperty(propertyResponse.data);
        
        // Use rooms from property object directly (these are the assigned rooms)
        if (propertyResponse.data?.rooms) {
          setRooms(propertyResponse.data.rooms);
          setFilteredRooms(propertyResponse.data.rooms);
          
          // Extract tasks from rooms (these are the assigned tasks)
          const allTasks: Task[] = [];
          propertyResponse.data.rooms.forEach((room: any) => {
            if (room.tasks && Array.isArray(room.tasks)) {
              room.tasks.forEach((task: any) => {
                // Add room context to task for display
                allTasks.push({
                  ...task,
                  room_name: room.name,
                  room_id: room.id
                });
              });
            }
          });
          
          setTasks(allTasks);
          setFilteredTasks(allTasks);
        }
        
        setPropertyLoaded(true); // Mark property as loaded
      } catch (err: any) {
        setError(err.message || 'Failed to load property details.');
        setPropertyLoaded(false); // Mark as not loaded on error
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchData();
    }
  }, [propertyId]);

  // Filter rooms locally (no need for separate API call since rooms are loaded with property)
  const filterRooms = useCallback((search: string = roomSearchTerm) => {
    if (!rooms.length) return;
    
    if (!search.trim()) {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter(room => 
        room.name.toLowerCase().includes(search.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredRooms(filtered);
    }
  }, [rooms, roomSearchTerm]);

  // Filter rooms when search term changes
  useEffect(() => {
    if (!propertyLoaded || !rooms.length) return;
    
    const timeoutId = setTimeout(() => {
      filterRooms(roomSearchTerm);
    }, roomSearchTerm ? 300 : 0); // Debounce search

    return () => {
      clearTimeout(timeoutId);
    };
  }, [roomSearchTerm, propertyLoaded, rooms, filterRooms]);

  // Filter tasks locally (no need for separate API call since tasks are loaded with property)
  const filterTasks = useCallback((search: string = taskSearchTerm) => {
    if (!tasks.length) return;
    
    if (!search.trim()) {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter(task => 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(search.toLowerCase())) ||
        (task.room_name && task.room_name.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredTasks(filtered);
    }
  }, [tasks, taskSearchTerm]);

  // Filter tasks when search term changes
  useEffect(() => {
    if (!propertyLoaded || !tasks.length) return;
    
    const timeoutId = setTimeout(() => {
      filterTasks(taskSearchTerm);
    }, taskSearchTerm ? 300 : 0); // Debounce search

    return () => {
      clearTimeout(timeoutId);
    };
  }, [taskSearchTerm, propertyLoaded, tasks, filterTasks]);

  const handleDeleteSuccess = () => {
    router.push('/properties');
  };

  const handleRoomAction = (action: 'create' | 'edit' | 'view', room?: Room) => {
    setRoomDialogMode(action);
    setSelectedRoom(room || null);
    setShowRoomDialog(true);
  };

  const handleTaskAction = (action: 'create' | 'edit' | 'view', task?: Task) => {
    setTaskDialogMode(action);
    setSelectedTask(task || null);
    setShowTaskDialog(true);
  };

  const handleRoomSuccess = () => {
    // Refresh rooms data by reloading the property
    window.location.reload();
  };

  const handleCreateAndAddNew = () => {
    // Keep dialog open and reset for new room creation
    setSelectedRoom(null);
    setRoomDialogMode('create');
    // Dialog stays open, form gets reset
  };

  const handleTaskSuccess = () => {
    // Refresh tasks data by reloading the property
    window.location.reload();
  };

  const handleTaskSearch = (value: string) => {
    setTaskSearchTerm(value);
  };

  const clearTaskSearch = () => {
    setTaskSearchTerm('');
  };

  const handleDeleteRoom = (room: Room) => {
    setRoomToDelete(room);
    setShowRoomDeleteDialog(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    
    try {
      await apiService.deleteRoom(roomToDelete.id);
      // Refresh rooms data by reloading the property
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to delete room:', err);
      setError(err.message || 'Failed to delete room.');
    }
  };

  const handleRoomSearch = (value: string) => {
    setRoomSearchTerm(value);
  };

  const clearRoomSearch = () => {
    setRoomSearchTerm('');
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setShowTaskDeleteDialog(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await apiService.deleteTask(taskToDelete.id);
      // Refresh tasks data by reloading the property
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      setError(err.message || 'Failed to delete task.');
    }
  };

  const getTasksByRoom = (roomId: string) => {
    // Use filteredTasks if available, otherwise fall back to tasks
    const tasksToSearch = filteredTasks.length > 0 ? filteredTasks : tasks;
    return tasksToSearch.filter(task => task.rooms?.some(room => room.id === roomId));
  };


  if (loading) {
    return (
      <ProtectedRoute roles={['admin', 'property_owner']}>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !property) {
    return (
      <ProtectedRoute roles={['admin', 'property_owner']}>
        <DashboardLayout>
          <div className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error || 'Property not found.'}
              </AlertDescription>
            </Alert>
            <Link href="/properties">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['admin', 'property_owner']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/properties">
                <ArrowLeft className="h-10 w-10 mr-2" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                <div className="flex items-center text-gray-600 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}, {property.city}, {property.state}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/properties/${property.id}/edit`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Property
                </Button>
              </Link>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              {/* Role indicator */}
              <div className="flex items-center px-3 py-2 bg-muted rounded-md">
                <span className="text-xs text-muted-foreground">
                  {user?.role === 'admin' ? 'Admin View' : 'Property Owner'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Image and Basic Info */}
              <Card className="overflow-hidden">
                <div className="aspect-video relative">
                  {property.image_url ? (
                    <img
                      src={property.image_url}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="h-16 w-16 mb-3" />
                      <span className="text-lg font-medium">No Image Available</span>
                      <span className="text-sm">Property image not uploaded</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-600">Active</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-600 leading-relaxed">{property.description}</p>
                    </div>

                    {getAmenities(property.amenities).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {getAmenities(property.amenities).map((amenity) => (
                            <Badge key={amenity} variant="outline" className="text-sm">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Property Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{property?.rooms_count ?? 0}</p>
                      <p className="text-sm text-gray-600">Rooms</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{property?.tasks_count ?? 0}</p>
                      <p className="text-sm text-gray-600">Tasks</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="text-sm font-medium">{new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Updated:</span>
                      <span className="text-sm font-medium">{new Date(property.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-gray-900">{property.address}</p>
                  <p className="text-gray-600">{property.city}, {property.state} {property.zip_code}</p>
                  <p className="text-gray-600">{property.country}</p>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="space-y-6">

            {/* Rooms Management */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <DoorOpen className="h-5 w-5 mr-2" />
                    Rooms ({property?.rooms_count || 0})
                  </CardTitle>
                  {canManageRooms ? (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleRoomAction('create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {user?.role === 'admin'
                        ? 'Admins cannot create rooms'
                        : 'Room creation restricted to property owners'
                      }
                    </div>
                  )}
                </div>

                {/* Search Bar */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search rooms..."
                      value={roomSearchTerm}
                      onChange={(e) => handleRoomSearch(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {roomSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={clearRoomSearch}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="lg" />
                    <span className="ml-2 text-gray-600">Loading rooms...</span>
                  </div>
                ) : filteredRooms.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRooms.map((room) => {
                        const roomTasks = getTasksByRoom(room.id);
                        return (
                          <div key={room.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center">
                                <DoorOpen className="h-5 w-5 text-blue-600 mr-2" />
                                <h4 className="font-medium text-gray-900">{room.name}</h4>
                              </div>
                              {canManageRooms && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleRoomAction('edit', room)}>
                                      Edit Room
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteRoom(room)}
                                    >
                                      Delete Room
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>

                            {room.description && (
                              <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-sm text-gray-600">
                                <CheckSquare2 className="h-4 w-4 mr-1" />
                                {roomTasks.length} tasks
                              </div>
                              {!canManageRooms && (
                                <div className="text-xs text-muted-foreground px-2">
                                  {user?.role === 'admin'
                                    ? 'Admin view only'
                                    : 'Property owner only'
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </>
                ) : (
                  <div className="text-center py-8">
                    <DoorOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {roomSearchTerm ? 'No rooms found' : 'No rooms yet'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {roomSearchTerm
                        ? `No rooms match "${roomSearchTerm}". Try a different search term.`
                        : 'Add rooms to organize your property'
                      }
                    </p>
                    {canManageRooms && !roomSearchTerm && (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleRoomAction('create')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Room
                      </Button>
                    )}
                    {roomSearchTerm && (
                      <Button
                        variant="outline"
                        onClick={clearRoomSearch}
                      >
                        Clear Search
                      </Button>
                    )}
                    {!canManageRooms && !roomSearchTerm && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                          {user?.role === 'admin'
                            ? 'Admins cannot create rooms. Only property owners can manage rooms.'
                            : 'Room management is restricted to property owners only.'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks Management */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <CheckSquare2 className="h-5 w-5 mr-2" />
                    All Tasks ({filteredTasks.length})
                  </CardTitle>
                  {canManageTasks ? (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleTaskAction('create')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {user?.role === 'admin'
                        ? 'Admins cannot create tasks'
                        : 'Task creation restricted to property owners'
                      }
                    </div>
                  )}
                </div>

                {/* Search Bar */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks..."
                      value={taskSearchTerm}
                      onChange={(e) => handleTaskSearch(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {taskSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={clearTaskSearch}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="lg" />
                    <span className="ml-2 text-gray-600">Loading tasks...</span>
                  </div>
                ) : filteredTasks.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              <CheckSquare2 className="h-5 w-5 text-blue-600 mr-2" />
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                            </div>
                            {canManageTasks && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleTaskAction('edit', task)}>
                                    Edit Task
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteTask(task)}
                                  >
                                    Delete Task
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="h-4 w-4 mr-1" />
                              {task.estimated_time} min
                              {task.requires_photo && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Camera className="h-4 w-4 mr-1" />
                                  Photo required
                                </>
                              )}
                            </div>
                            {!canManageTasks && (
                              <div className="text-xs text-muted-foreground px-2">
                                {user?.role === 'admin'
                                  ? 'Admin view only'
                                  : 'Property owner only'
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CheckSquare2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {taskSearchTerm ? 'No tasks found' : 'No tasks yet'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {taskSearchTerm
                        ? `No tasks match "${taskSearchTerm}". Try a different search term.`
                        : 'Add tasks to define cleaning procedures'
                      }
                    </p>
                    {canManageTasks && !taskSearchTerm && (
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleTaskAction('create')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Task
                      </Button>
                    )}
                    {taskSearchTerm && (
                      <Button
                        variant="outline"
                        onClick={clearTaskSearch}
                      >
                        Clear Search
                      </Button>
                    )}
                    {!canManageTasks && !taskSearchTerm && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                          {user?.role === 'admin'
                            ? 'Admins cannot create tasks. Only property owners can manage tasks.'
                            : 'Task creation is restricted to property owners only.'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        {property && (
          <>
            <DeletePropertyDialog
              property={property}
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onSuccess={handleDeleteSuccess}
            />

            <RoomManagementDialog
              open={showRoomDialog}
              onOpenChange={setShowRoomDialog}
              mode={roomDialogMode}
              room={selectedRoom}
              propertyId={propertyId}
              onSuccess={handleRoomSuccess}
              onCreateAndAddNew={handleCreateAndAddNew}
            />

            <TaskManagementDialog
              open={showTaskDialog}
              onOpenChange={setShowTaskDialog}
              mode={taskDialogMode}
              task={selectedTask}
              onSuccess={handleTaskSuccess}
            />

            {/* Room Delete Confirmation Dialog */}
            <ConfirmationDialog
              open={showRoomDeleteDialog}
              onOpenChange={setShowRoomDeleteDialog}
              onConfirm={confirmDeleteRoom}
              title="Delete Room"
              description={`Are you sure you want to delete the room "${roomToDelete?.name}"? This action cannot be undone and will also delete all associated tasks.`}
              confirmText="Yes, delete room"
              cancelText="Cancel"
              variant="destructive"
            />

            {/* Task Delete Confirmation Dialog */}
            <ConfirmationDialog
              open={showTaskDeleteDialog}
              onOpenChange={setShowTaskDeleteDialog}
              onConfirm={confirmDeleteTask}
              title="Delete Task"
              description={`Are you sure you want to delete the task "${taskToDelete?.title}"? This action cannot be undone.`}
              confirmText="Yes, delete task"
              cancelText="Cancel"
              variant="destructive"
            />
          </>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
