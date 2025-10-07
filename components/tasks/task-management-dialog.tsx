'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckSquare2, AlertCircle, CheckCircle, Clock, Camera, DoorOpen, Search, X } from 'lucide-react';
import { apiService, Task, Room } from '@/lib/api';

const taskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional(),
  estimated_time: z.number().min(1, 'Estimated time must be at least 1 minute'),
  requires_photo: z.boolean(),
  // Removed room_ids from schema since we handle it separately
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  task: Task | null;
  onSuccess: () => void;
}

// Custom Room Selection Component
interface RoomSelectionProps {
  options: Room[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  disabled?: boolean;
}

function RoomSelection({ options, selectedValues, onSelectionChange, disabled = false }: RoomSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Room[]>(options);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);


  // Search rooms via API
  const searchRooms = useCallback(async (search: string) => {
    if (!search.trim()) {
      setFilteredOptions(options);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    try {
      const response = await apiService.getRooms({ search }, 1, 100);
      const rooms = Array.isArray(response.data) ? response.data : [];
      setFilteredOptions(rooms);
    } catch (error) {
      console.error('Failed to search rooms:', error);
      setSearchError('Failed to search rooms. Please try again.');
      // Fallback to client-side filtering
      const filtered = options.filter(option =>
        option.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredOptions(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [options]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRooms(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchRooms]);

  const handleToggleOption = (optionId: string) => {
    const newSelection = selectedValues.includes(optionId)
      ? selectedValues.filter(id => id !== optionId)
      : [...selectedValues, optionId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredOptions.map(option => option.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
          disabled={disabled || isSearching}
        />
        {isSearching ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        ) : searchTerm ? (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleClearSearch}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Search Error */}
      {searchError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {searchError}
        </div>
      )}

      {/* Select All / Clear All Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled || filteredOptions.length === 0}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={disabled}
          className="text-xs text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
      </div>

      {/* Rooms List */}
      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
        {isSearching ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" className="mr-2" />
            <span className="text-sm text-gray-600">Searching rooms...</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            {searchTerm ? `No rooms match "${searchTerm}"` : 'No rooms available'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOptions.map(option => (
                <div
                    key={option.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Checkbox
                      checked={selectedValues.includes(option.id)}
                      onCheckedChange={() => !disabled && handleToggleOption(option.id)}
                      disabled={disabled}
                      className="flex-shrink-0"
                  />
                  <div className="flex items-center flex-1">
                    <DoorOpen className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{option.name}</span>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedValues.length > 0 && (
        <div className="text-xs text-gray-600">
          {selectedValues.length} of {options.length} rooms selected
          {searchTerm && filteredOptions.length !== options.length && (
            <span className="ml-2 text-gray-500">
              ({filteredOptions.length} shown)
            </span>
          )}
        </div>
      )}

      {/* Search Results Count */}
      {searchTerm && !isSearching && (
        <div className="text-xs text-gray-500">
          {filteredOptions.length} room{filteredOptions.length !== 1 ? 's' : ''} found for "{searchTerm}"
        </div>
      )}
    </div>
  );
}

export function TaskManagementDialog({
  open,
  onOpenChange,
  mode,
  task,
  onSuccess,
}: TaskManagementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const initializedRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      requires_photo: true,
      estimated_time: 15,
      title: '',
      description: '',
    },
  });

  // Fetch all rooms when dialog opens
  useEffect(() => {
    const fetchAllRooms = async () => {
      if (open && !initializedRef.current) {
        setLoadingRooms(true);
        try {
          // Fetch all rooms by making multiple API calls if needed
          let allRooms: Room[] = [];
          let currentPage = 1;
          let hasMorePages = true;

          while (hasMorePages) {
            const response = await apiService.getRooms({}, currentPage, 100);
            const rooms = Array.isArray(response.data) ? response.data : [];
            allRooms = [...allRooms, ...rooms];
            
            // Check if there are more pages
            hasMorePages = currentPage < response.last_page;
            currentPage++;
          }

          setAllRooms(allRooms);
          // Never auto-select rooms - let user choose manually
          setSelectedRoomIds([]);
        } catch (error) {
          console.error('Failed to fetch rooms:', error);
          setError('Failed to load rooms. Please try again.');
        } finally {
          setLoadingRooms(false);
        }
        initializedRef.current = true;
      }
    };

    fetchAllRooms();
  }, [open]); // Removed mode dependency to prevent re-fetching

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      initializedRef.current = false;
      
      if (task && (mode === 'edit' || mode === 'view')) {
        setValue('title', task.title);
        setValue('description', task.description || '');
        setValue('estimated_time', task.estimated_time);
        setValue('requires_photo', task.requires_photo);
        setRequiresPhoto(task.requires_photo);
        
        // Set selected room IDs from task's assigned rooms
        const taskRoomIds = task.rooms?.map(room => room.id) || [];
        setSelectedRoomIds(taskRoomIds);
      } else if (mode === 'create') {
        reset({
          title: '',
          description: '',
          estimated_time: 15,
          requires_photo: true,
        });
        setRequiresPhoto(true);
        setSelectedRoomIds([]); // Start with no rooms selected for create mode
      }
    } else {
      // Reset initialization flag when dialog closes
      initializedRef.current = false;
    }
  }, [open, task, mode, setValue, reset]);

  // Re-set selected room IDs when allRooms are loaded and we're in edit mode
  useEffect(() => {
    if (open && task && (mode === 'edit' || mode === 'view') && allRooms.length > 0) {
      const taskRoomIds = task.rooms?.map(room => room.id) || [];
      setSelectedRoomIds(taskRoomIds);
    }
  }, [open, task, mode, allRooms]);

  const handleRoomSelectionChange = useCallback((roomIds: string[]) => {
    setSelectedRoomIds(roomIds);
    // Don't call setValue here - let the form handle it through the register
  }, []); // Empty dependencies since we don't need any dependencies

  const onSubmit = async (data: TaskFormData) => {
    if (mode === 'view') return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...data,
        requires_photo: requiresPhoto,
        room_ids: selectedRoomIds, // Use selected room IDs for both create and edit
      };

      if (mode === 'create') {
        await apiService.createTask(payload);
        setSuccess('Task created successfully!');
      } else if (mode === 'edit' && task) {
        await apiService.updateTask(task.id, payload);
        setSuccess('Task updated successfully!');
      }

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} task. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Add New Task';
      case 'edit':
        return 'Edit Task';
      case 'view':
        return 'Task Details';
      default:
        return 'Task';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create':
        return 'Create a new cleaning task. You can assign rooms later when editing.';
      case 'edit':
        return 'Update task information and room assignments.';
      case 'view':
        return 'View task details and room assignments.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
              <CheckSquare2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {getTitle()}
                {task?.is_created_by_admin && (
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                    Admin Created
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {getDescription()}
                {task?.is_created_by_admin && (
                  <div className="mt-2 text-sm text-purple-600">
                    This task was created by an admin and is available to all property owners.
                  </div>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-4">
            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                disabled={mode === 'view'}
                className="transition-all duration-200 focus:ring-1 focus:ring-blue-500"
                {...register('title')}
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
            </div>

            {/* Room Selection */}
            <div className="space-y-2">
              <Label>Assign to Rooms {mode === 'create' ? '(Optional)' : '*'}</Label>
                             {mode === 'create' && (
                 <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-200">
                   💡 Choose the rooms you want to assign this task to, or leave empty to assign later.
                 </p>
               )}
              {loadingRooms ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm text-gray-600">Loading rooms...</span>
                </div>
              ) : (
                <RoomSelection
                  options={allRooms}
                  selectedValues={selectedRoomIds}
                  onSelectionChange={handleRoomSelectionChange}
                  disabled={mode === 'view'}
                />
              )}
              {/* Custom room selection validation - only for edit mode */}
              {selectedRoomIds.length === 0 && mode === 'edit' && (
                <p className="text-sm text-red-600">Please select at least one room</p>
              )}
              {mode === 'create' && selectedRoomIds.length === 0 && (
                <p className="text-sm text-gray-500">No rooms selected. You can assign rooms later when editing.</p>
              )}
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
              <Label htmlFor="estimated_time">Estimated Time (minutes) *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="estimated_time"
                  type="number"
                  min="1"
                  placeholder="15"
                  disabled={mode === 'view'}
                  className="pl-10 transition-all duration-200 focus:ring-1 focus:ring-blue-500"
                  {...register('estimated_time', { valueAsNumber: true })}
                />
              </div>
              {errors.estimated_time && (
                <p className="text-sm text-red-600">{errors.estimated_time.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add task description or special instructions..."
                disabled={mode === 'view'}
                rows={3}
                className="transition-all duration-200 focus:ring-1 focus:ring-blue-500"
                {...register('description')}
              />
            </div>

            {/* Photo Requirement */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_photo"
                checked={requiresPhoto}
                onCheckedChange={(checked) => {
                  setRequiresPhoto(checked as boolean);
                  setValue('requires_photo', checked as boolean);
                }}
                disabled={mode === 'view'}
              />
              <Label htmlFor="requires_photo" className="flex items-center cursor-pointer">
                <Camera className="h-4 w-4 mr-2 text-blue-600" />
                Photo verification required
              </Label>
            </div>

            {mode === 'view' && task && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Created:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(task.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Assigned Rooms:</span>
                  <span className="text-sm text-gray-900">
                    {task.rooms?.map(room => room.name).join(', ') || 'None'}
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode !== 'view' && (
                         <Button
               onClick={handleSubmit(onSubmit)}
               disabled={isLoading}
               className="bg-green-600 hover:bg-green-700"
             >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : mode === 'create' ? (
                'Create Task'
              ) : (
                'Update Task'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
