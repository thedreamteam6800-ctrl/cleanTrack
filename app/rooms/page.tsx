'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DoorOpen, Plus, CheckSquare, MoreVertical, AlertCircle, Filter, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { apiService, Room, RoomStats, RoomFilters, Property } from '@/lib/api';
import { RoomManagementDialog } from '@/components/rooms/room-management-dialog';
import { DeleteRoomDialog } from '@/components/rooms/delete-room-dialog';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [systemDefaultRooms, setSystemDefaultRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomFilters>({
    is_active: true,
    sort_by: 'name',
    sort_direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomDialogMode, setRoomDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'system-defaults'>('all');

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

      // Fetch all data in parallel
      const [roomsResponse, statsResponse, propertiesResponse, systemDefaultsResponse] = await Promise.all([
        apiService.getRooms(filters, page, pagination.perPage),
        apiService.getRoomStats(),
        apiService.getProperties(page, 20),
        apiService.getSystemDefaultRooms()
      ]);

      setRooms(Array.isArray(roomsResponse.data) ? roomsResponse.data : []);
      setStats(statsResponse.data || null);
      setProperties(Array.isArray(propertiesResponse.data) ? propertiesResponse.data : []);
      setSystemDefaultRooms(Array.isArray(systemDefaultsResponse.data) ? systemDefaultsResponse.data : []);
      updatePagination(roomsResponse);

    } catch (err: any) {
      setError(err.message || 'Failed to load rooms data.');
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

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined
    }));
  };

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

  const handleFilterChange = (key: keyof RoomFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getTasksByRoom = (room: Room) => {
    return room.tasks || [];
  };

  const handleRoomAction = (action: 'create' | 'edit' | 'view', room?: Room) => {
    setRoomDialogMode(action);
    setSelectedRoom(room || null);
    setShowRoomDialog(true);
  };

  const handleRoomSuccess = () => {
    fetchData();
  };

  const handleDeleteClick = (room: Room) => {
    setRoomToDelete(room);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    fetchData();
  };

  const handleToggleSystemDefault = async (room: Room) => {
    try {
      const response = await apiService.toggleSystemDefault(room.id);
      if (response.data) {
        const updatedRoom = response.data;

        // Update the room in the rooms array
        setRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));

        // Handle systemDefaultRooms array properly to avoid duplicates
        if (updatedRoom.is_system_default) {
          // Room is now a system default - add it if not already there
          setSystemDefaultRooms(prev => {
            const filtered = prev.filter(r => r.id !== updatedRoom.id); // Remove any existing
            return [...filtered, updatedRoom]; // Add the updated room
          });
        } else {
          // Room is no longer a system default - remove it
          setSystemDefaultRooms(prev => prev.filter(r => r.id !== updatedRoom.id));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle system default status.');
    }
  };



  return (
    <ProtectedRoute roles={['admin']}>
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
              <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
              <p className="text-gray-600">Manage rooms across all properties</p>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => handleRoomAction('create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Rooms
              </button>
              <button
                onClick={() => setActiveTab('system-defaults')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'system-defaults'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System Defaults ({systemDefaultRooms.length})
              </button>
            </nav>
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
              <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="max-w-md"
                  />
                </div>






              </div>
            </CardContent>
          </Card>

          {
            loading ? (
                <Card className="text-center py-12">
                  <div className="flex items-center justify-center min-h-96">
                    <LoadingSpinner size="lg" />
                  </div>
                </Card>
            ) : (
                <>
                  {/* Rooms Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeTab === 'all' ? rooms : systemDefaultRooms).map((room) => {
                      const roomTasks = getTasksByRoom(room);

                      return (
                          <Card key={room.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg flex items-center">
                                    <DoorOpen className="h-5 w-5 mr-2 text-blue-600" />
                                    {room.name}
                                    {room.is_system_default && (
                                      <Badge className="ml-2 bg-green-100 text-green-800">
                                        System Default
                                      </Badge>
                                    )}
                                  </CardTitle>

                                </div>
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
                                    {/*<DropdownMenuItem onClick={() => handleToggleSystemDefault(room)}>*/}
                                    {/*  {room.is_system_default ? 'Remove from System Defaults' : 'Make System Default'}*/}
                                    {/*</DropdownMenuItem>*/}
                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => handleDeleteClick(room)}
                                    >
                                      Delete Room
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>

                            <CardContent>
                              <div className="space-y-4">
                                {room.description && (
                                    <p className="text-sm text-gray-600">{room.description}</p>
                                )}

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Tasks:</span>
                                    <span className="font-medium">{roomTasks.length}</span>
                                  </div>

                                  {roomTasks.length > 0 && (
                                      <div className="text-xs text-gray-500 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span>Photo Required:</span>
                                          <span>{roomTasks.filter(task => task.requires_photo).length}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Avg Time:</span>
                                          <span>
                                {Math.round(roomTasks.reduce((sum, task) => sum + task.estimated_time, 0) / roomTasks.length)} min
                              </span>
                                        </div>
                                      </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Created: {(() => {
                                    try {
                                      const date = new Date(room.created_at);
                                      return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
                                    } catch {
                                      return 'Unknown';
                                    }
                                  })()}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {(activeTab === 'all' ? rooms : systemDefaultRooms).length === 0 && (
                      <Card className="text-center py-12">
                        <CardContent>
                          <DoorOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {activeTab === 'system-defaults' ? 'No system default rooms' : 'No rooms found'}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {activeTab === 'system-defaults'
                              ? 'System default rooms will be automatically added to every property. Mark rooms as system defaults to make them available everywhere.'
                              : filters.search || filters.is_active === false
                                ? 'Try adjusting your filters to see more results'
                                : 'Create your first room to get started'
                            }
                          </p>
                          {activeTab === 'all' && !filters.search && filters.is_active !== false && (
                              <Button
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => handleRoomAction('create')}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Room
                              </Button>
                          )}
                        </CardContent>
                      </Card>
                  )}
                </>
            )
          }


          {/* Pagination */}
          {!loading && rooms && rooms.length > 0 && (
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

        {/* Room Management Dialog */}
        <RoomManagementDialog
          open={showRoomDialog}
          onOpenChange={setShowRoomDialog}
          mode={roomDialogMode}
          room={selectedRoom}
          properties={properties}
          onSuccess={handleRoomSuccess}
        />

        {/* Delete Room Dialog */}
        <DeleteRoomDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          room={roomToDelete}
          onSuccess={handleDeleteSuccess}
        />

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
            onClick={() => handleRoomAction('create')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
