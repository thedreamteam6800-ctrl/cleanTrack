'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { apiService } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { DoorOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Room, RoomFilters } from '@/lib/api';

interface RoomSelectionCardProps {
  selectedRoomIds: string[];
  onRoomSelectionChange: (roomIds: string[]) => void;
  title?: string;
  description?: string;
  lockDefaultRooms?: boolean;
  showPhotoRequirements?: boolean;
  ownerId?: string; // Filter rooms by property owner
}

export function RoomSelectionCard({
  selectedRoomIds,
  onRoomSelectionChange,
  title = "Select Rooms",
  description = "Choose rooms to assign to this property",
  lockDefaultRooms = false,
  showPhotoRequirements = true,
  ownerId,
}: RoomSelectionCardProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRooms, setTotalRooms] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasAutoSelectedDefaults, setHasAutoSelectedDefaults] = useState(false);

  const fetchRooms = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);

      const filters: RoomFilters = {
        is_active: true,
        search: search || undefined,
        sort_by: 'name',
        sort_direction: 'asc',
        per_page: 10,
        owner_id: ownerId // Add owner filter
      };

      const response = await apiService.getRooms(filters, page, 10);

      if (response.data && Array.isArray(response.data)) {
        setRooms(response.data);

        // Auto-select default rooms on first load
        if (!hasAutoSelectedDefaults && selectedRoomIds.length === 0) {
          const defaultRoomIds = response.data
            .filter(room => room.is_default || room.is_system_default)
            .map(room => room.id);

          if (defaultRoomIds.length > 0) {
            onRoomSelectionChange(defaultRoomIds);
            setHasAutoSelectedDefaults(true);
          }
        }

        // Set pagination data from API response
        setTotalPages(response.last_page || 1);
        setTotalRooms(response.total || 0);
        setCurrentPage(response.current_page || 1);
      } else {
        setRooms([]);
        setTotalPages(1);
        setTotalRooms(0);
        setCurrentPage(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms.');
      setRooms([]);
      setTotalPages(1);
      setTotalRooms(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch rooms if ownerId is provided
    if (ownerId) {
      fetchRooms(1, searchTerm);
    } else {
      // Clear rooms if no owner selected
      setRooms([]);
      setLoading(false);
    }
  }, [ownerId, searchTerm]); // Refetch when owner changes

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
    setCurrentPage(1); // Reset to first page when searching

    // Don't search if no owner selected
    if (!ownerId) return;

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchRooms(1, value);
    }, 800);

    setSearchTimeout(timeout);
  };

  const handlePageChange = (page: number) => {
    if (!ownerId) return; // Don't change page if no owner selected
    setCurrentPage(page);
    fetchRooms(page, searchTerm);
  };

  const handleRoomToggle = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (lockDefaultRooms && (room?.is_default || room?.is_system_default)) {
      return; // prevent toggling default rooms
    }
    const newSelectedIds = selectedRoomIds.includes(roomId)
      ? selectedRoomIds.filter(id => id !== roomId)
      : [...selectedRoomIds, roomId];

    onRoomSelectionChange(newSelectedIds);
  };

  const handleSelectAll = () => {
    const allRoomIds = rooms.map(room => room.id);
    const newSelectedIds = selectedRoomIds.length === allRoomIds.length ? [] : allRoomIds;
    onRoomSelectionChange(newSelectedIds);
  };

  const isAllSelected = rooms.length > 0 && selectedRoomIds.length === rooms.length;
  const isIndeterminate = selectedRoomIds.length > 0 && selectedRoomIds.length < rooms.length;

  return (
    <div>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DoorOpen className="h-5 w-5 mr-2 text-blue-600" />
            {title}
          </h3>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      )}
      <div className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Rooms</label>
          <Input
            placeholder={ownerId ? "Search rooms..." : "Select a property owner first"}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-md"
            disabled={!ownerId}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Select All */}
        {rooms.length > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              disabled={lockDefaultRooms}
            />
            <label className="text-sm font-medium">
              Select All ({selectedRoomIds.length} of {totalRooms} selected){lockDefaultRooms ? ' (defaults locked)' : ''}
            </label>
          </div>
        )}

        {/* Rooms List */}
        {!ownerId ? (
          <div className="text-center py-8 text-gray-500">
            Please select a property owner to view available rooms
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No rooms found matching your search.' : 'No rooms available for this property owner.'}
          </div>
        ) : (
          <div className="relative">
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedRoomIds.includes(room.id)}
                    onCheckedChange={() => handleRoomToggle(room.id)}
                    disabled={lockDefaultRooms && (room.is_default || room.is_system_default)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <DoorOpen className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{room.name}</span>
                      {(room.is_default || room.is_system_default) && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          {room.is_system_default ? 'System Default' : 'Default'}
                        </Badge>
                      )}
                      {room.is_created_by_admin && (
                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                          Admin
                        </Badge>
                      )}
                      {room.tasks && room.tasks.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {room.tasks.length} tasks
                        </Badge>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-600 mt-1">{room.description}</p>
                    )}
                  </div>

                  {/* Per-room photo requirements controls */}
                  {showPhotoRequirements && !lockDefaultRooms && selectedRoomIds.includes(room.id) && (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">Requires photo</label>
                        <Switch
                          checked={(room as any).pivot?.requires_photo ?? false}
                          onCheckedChange={async (checked) => {
                            try {
                              await apiService.updateRoomRequirements(
                                (room as any).pivot?.property_id,
                                room.id,
                                !!checked,
                                (room as any).pivot?.photos_required_count ?? 0,
                              );
                              (room as any).pivot = {
                                ...((room as any).pivot || {}),
                                requires_photo: !!checked,
                              };
                            } catch (e) {
                              console.error('Failed updating room requirements', e);
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <label className="text-xs text-gray-600">Count</label>
                        {(() => {
                          const requires = !!((room as any).pivot?.requires_photo);
                          const rawCount = (room as any).pivot?.photos_required_count;
                          const inputValue = '';
                          return (
                            <Input
                          type="text"
                          className="w-16 h-8"
                          value={inputValue}
                          placeholder=""
                          disabled={!requires}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          onKeyDown={(e) => {
                            const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
                            if (e.ctrlKey || e.metaKey) return;
                            if (allowed.includes(e.key)) return;
                            if (/^[0-9]$/.test(e.key)) return;
                            e.preventDefault();
                          }}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (!/^\d*$/.test(txt)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={async (e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              // treat empty as null/no requirement
                              try {
                                await apiService.updateRoomRequirements(
                                  (room as any).pivot?.property_id,
                                  room.id,
                                  (room as any).pivot?.requires_photo ?? false,
                                  0
                                );
                                (room as any).pivot = {
                                  ...((room as any).pivot || {}),
                                  photos_required_count: undefined,
                                };
                              } catch (e) {
                                console.error('Failed clearing room photo count', e);
                              }
                              return;
                            }

                            const count = Math.max(0, Math.min(10, parseInt(raw, 10)));
                            try {
                              await apiService.updateRoomRequirements(
                                (room as any).pivot?.property_id,
                                room.id,
                                (room as any).pivot?.requires_photo ?? false,
                                count,
                              );
                              (room as any).pivot = {
                                ...((room as any).pivot || {}),
                                photos_required_count: count,
                              };
                            } catch (e) {
                              console.error('Failed updating room photo count', e);
                            }
                          }}
                        />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="text-center py-2 text-xs text-gray-500 bg-blue-50 border-t">
                Page {currentPage} of {totalPages} • {totalRooms} total rooms
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {ownerId && totalRooms > 0 && (
          <div className="flex items-center justify-between pt-4 border-t bg-gray-50 px-4 py-3 rounded-b-md">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalRooms)} of {totalRooms} rooms
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || !ownerId}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || !ownerId}
                  className="h-8"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
