'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CheckSquare2, AlertCircle, CheckCircle, Clock, Camera } from 'lucide-react';
import { apiService, Task, Room } from '@/lib/api';

const taskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  estimated_time: z.number().min(1, 'Estimated time must be at least 1 minute'),
  requires_photo: z.boolean(),
  room_ids: z.array(z.string()).min(1, 'Please select at least one room'),
  property_id: z.string().min(1, 'Please select a property'),
  description: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  task: Task | null;
  rooms: Room[];
  propertyId: string | number;
  onSuccess: () => void;
}

export function TaskManagementDialog({
                                       open,
                                       onOpenChange,
                                       mode,
                                       task,
                                       rooms,
                                       propertyId,
                                       onSuccess,
                                     }: TaskManagementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresPhoto, setRequiresPhoto] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      requires_photo: false,
      property_id: propertyId?.toString() || '',
      room_ids: [],
      estimated_time: 15,
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      if (task && (mode === 'edit' || mode === 'view')) {
        setValue('title', task.title);
        setValue('estimated_time', task.estimated_time);
        setValue('requires_photo', task.requires_photo);
        setValue('room_ids', task.rooms?.map(room => room.id) || []);
        setValue('property_id', propertyId?.toString() || '');
        setValue('description', task.description || '');
        setRequiresPhoto(task.requires_photo);
      } else if (mode === 'create') {
        reset({
          title: '',
          estimated_time: 15,
          requires_photo: false,
          room_ids: [],
          property_id: propertyId?.toString() || '',
          description: '',
        });
        setRequiresPhoto(false);
      }
    }
  }, [open, task, mode, setValue, reset, propertyId]);

  const selectedRoomIds = watch('room_ids') || [];
  const selectedRooms = rooms.filter(room => selectedRoomIds.includes(room.id));

  const onSubmit = async (data: TaskFormData) => {
    if (mode === 'view') return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...data,
        requires_photo: requiresPhoto,
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
        return 'Create a new cleaning task for this property.';
      case 'edit':
        return 'Update task information and requirements.';
      case 'view':
        return 'View task details and requirements.';
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
                <DialogTitle className="text-lg font-semibold text-gray-900">{getTitle()}</DialogTitle>
                <DialogDescription className="text-gray-600">{getDescription()}</DialogDescription>
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <Label>Rooms *</Label>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`room-${room.id}`}
                        checked={selectedRoomIds.includes(room.id)}
                        onCheckedChange={(checked) => {
                          const currentIds = watch('room_ids') || [];
                          if (checked) {
                            setValue('room_ids', [...currentIds, room.id]);
                          } else {
                            setValue('room_ids', currentIds.filter(id => id !== room.id));
                          }
                        }}
                        disabled={mode === 'view'}
                      />
                      <Label htmlFor={`room-${room.id}`} className="text-sm cursor-pointer">
                        {room.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.room_ids && <p className="text-sm text-red-600">{errors.room_ids.message}</p>}
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
                    {selectedRooms.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Rooms:</span>
                          <span className="text-sm text-gray-900">
                            {selectedRooms.map(room => room.name).join(', ')}
                          </span>
                        </div>
                    )}
                  </div>
              )}
            </form>
          </div>

          <DialogFooter className="flex gap-2">
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
