'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, Save, X } from 'lucide-react';
import { apiService, Room, Property, PropertyOption, Task } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TagInput, TagInputOption } from '@/components/ui/tag-input';
import { useAuth } from '@/contexts/auth-context';

interface RoomManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  room?: Room | null;
  propertyId?: string; // optional context; if provided we'll use it for pivot updates
  properties?: Property[]; // deprecated: no longer used for selection
  onSuccess: () => void;
  showOwnerField?: boolean; // whether to show owner field for property owners
}

export function RoomManagementDialog({
  open,
  onOpenChange,
  mode,
  room,
  propertyId,
  properties = [],
  onSuccess,
  showOwnerField = false,
}: RoomManagementDialogProps) {
  const { user } = useAuth();
  
  // Check if user is property owner (only property owners can assign tasks)
  const canAssignTasks = user?.role === 'property_owner';
  const isAdmin = user?.role === 'admin';
  
  console.log('User role:', user?.role, 'canAssignTasks:', canAssignTasks);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false,
    is_system_default: false,
    property_id: '',
    task_ids: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Task states
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [taskSearchLoading, setTaskSearchLoading] = useState(false);
  // Room-level photo requirements
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [photosRequiredCount, setPhotosRequiredCount] = useState<number | undefined>(undefined);
  
  // Property states
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  
  // Owner selection states (admin only)
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [loadingOwners, setLoadingOwners] = useState(false);

  // Load all tasks initially - only for property owners
  useEffect(() => {
    const loadAllTasks = async () => {
      try {
        const response = await apiService.getAllTasks({ limit: 50 });
        setAvailableTasks(response.data || []);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setAvailableTasks([]);
      }
    };

    if (open && canAssignTasks) {
      loadAllTasks();
    } else if (open && !canAssignTasks) {
      // Clear tasks for non-property owners
      setAvailableTasks([]);
      setSelectedTasks([]);
    }
  }, [open, canAssignTasks]);

  // Load owners (admin only)
  useEffect(() => {
    const loadOwners = async () => {
      if (open && isAdmin) {
        setLoadingOwners(true);
        try {
          const response = await apiService.getOwners();
          setOwners(response.data || []);
        } catch (error) {
          console.error('Failed to load owners:', error);
          setError('Failed to load owners. Please try again.');
        } finally {
          setLoadingOwners(false);
        }
      }
    };

    loadOwners();
  }, [open, isAdmin]);

  // Load property options based on selected owner
  useEffect(() => {
    const loadPropertyOptions = async () => {
      if (open) {
        setLoadingProperties(true);
        try {
          let response;
          if (isAdmin && selectedOwnerId) {
            // Load properties for selected owner
            response = await apiService.getPropertiesByOwner(selectedOwnerId);
            setPropertyOptions(response.data || []);
          } else {
            // Load all properties (for non-admin or no owner selected)
            response = await apiService.getPropertyOptions();
            setPropertyOptions(response.data || []);
          }
        } catch (error) {
          console.error('Failed to load property options:', error);
          setError('Failed to load properties. Please try again.');
        } finally {
          setLoadingProperties(false);
        }
      }
    };

    loadPropertyOptions();
  }, [open, selectedOwnerId, isAdmin]);

  // Pre-populate owner for property owners when showOwnerField is true
  useEffect(() => {
    if (showOwnerField && user?.id && !selectedOwnerId) {
      setSelectedOwnerId(user.id.toString());
    }
  }, [showOwnerField, user?.id, selectedOwnerId]);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && room) {
        setFormData({
          name: room.name,
          description: room.description || '',
          is_default: room.is_default || false,
          is_system_default: room.is_system_default || false,
          property_id: room.property_id || '',
          task_ids: room.tasks?.map(task => task.id) || [],
        });
        setSelectedTasks(room.tasks || []);
        setRequiresPhoto(!!(room as any).pivot?.requires_photo);
        {
          const raw = (room as any).pivot?.photos_required_count;
          setPhotosRequiredCount(raw && Number(raw) > 0 ? Number(raw) : undefined);
        }
      } else if (mode === 'create') {
        setFormData({
          name: '',
          description: '',
          is_default: false,
          is_system_default: false,
          property_id: propertyId || '',
          task_ids: [],
        });
        setSelectedTasks([]);
        setRequiresPhoto(false);
        setPhotosRequiredCount(undefined);
        setSelectedOwnerId(''); // Reset to empty for new rooms
      } else if (mode === 'view' && room) {
        setFormData({
          name: room.name,
          description: room.description || '',
          is_default: room.is_default || false,
          is_system_default: room.is_system_default || false,
          property_id: room.property_id || '',
          task_ids: room.tasks?.map(task => task.id) || [],
        });
        setSelectedTasks(room.tasks || []);
        setRequiresPhoto(!!(room as any).pivot?.requires_photo);
        {
          const raw = (room as any).pivot?.photos_required_count;
          setPhotosRequiredCount(raw && Number(raw) > 0 ? Number(raw) : undefined);
        }
      }
    } else {
      // Reset form when dialog closes
      setFormData({
        name: '',
        description: '',
        is_default: false,
        is_system_default: false,
        property_id: propertyId || '',
        task_ids: [],
      });
      setSelectedTasks([]);
      setError(null);
      setRequiresPhoto(false);
      setPhotosRequiredCount(undefined);
    }
  }, [open, mode, room, propertyId, properties]);

  // Debounced task search - only for property owners
  const searchTasks = useCallback(async (searchTerm: string) => {
    console.log('searchTasks called with:', searchTerm);
    console.log('Current availableTasks before search:', availableTasks.length);
    
    if (!canAssignTasks) {
      setAvailableTasks([]);
      return;
    }

    setTaskSearchLoading(true);
    try {
      if (!searchTerm.trim()) {
        console.log('Loading all tasks (empty search)');
        const response = await apiService.getAllTasks({ limit: 50 });
        console.log('All tasks response:', response.data);
        setAvailableTasks(response.data || []);
      } else {
        console.log('Searching tasks with term:', searchTerm);
        const response = await apiService.searchTasks({
          search: searchTerm,
          limit: 20,
        });
        console.log('Search response:', response.data);
        setAvailableTasks(response.data || []);
      }
    } catch (error) {
      console.error('Error searching tasks:', error);
      try {
        const fallbackResponse = await apiService.getAllTasks({
          search: searchTerm,
          limit: 20,
        });
        setAvailableTasks(fallbackResponse.data || []);
      } catch (fallbackError) {
        console.error('Error with fallback task search:', fallbackError);
        setAvailableTasks([]);
      }
    } finally {
      setTaskSearchLoading(false);
    }
  }, [canAssignTasks]);

  // Update form data when selected tasks change - only for property owners
  useEffect(() => {
    console.log('selectedTasks changed:', selectedTasks);
    if (canAssignTasks) {
      const taskIds = selectedTasks.map(t => t.id);
      console.log('Updating formData with task_ids:', taskIds);
      setFormData(prev => ({
        ...prev,
        task_ids: taskIds,
      }));
    }
  }, [selectedTasks, canAssignTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('Room name is required.');
      setLoading(false);
      return;
    }

    // For system default rooms, property_id is not required
    if (!formData.is_system_default && !formData.property_id) {
      setError('Property selection is required.');
      setLoading(false);
      return;
    }

    const submissionData = {
      ...formData,
      // For admins creating system default rooms, automatically set is_default to true
      is_default: isAdmin && formData.is_system_default ? true : formData.is_default,
      task_ids: canAssignTasks ? selectedTasks.map(t => t.id) : [],
    };

    try {
      if (mode === 'create') {
        let created;
        if (formData.is_system_default) {
          // Use system default API for admin-created system default rooms
          const { property_id, ...systemDefaultData } = submissionData;
          created = await apiService.createSystemDefaultRoom(systemDefaultData);
        } else {
          // Use regular room creation API
          created = await apiService.createRoom(submissionData);
        }
        // Apply photo requirements only if we have a property context
        const contextPropertyId = propertyId || (room as any)?.pivot?.property_id;
        if (contextPropertyId) {
          try {
            await apiService.updateRoomRequirements(
              contextPropertyId.toString(),
              created.data.id,
              !!requiresPhoto,
              photosRequiredCount || 0,
            );
          } catch (e) {
            console.error('Failed to set room requirements after create', e);
          }
        }
      } else if (mode === 'edit' && room) {
        await apiService.updateRoom(room.id, submissionData);
        const contextPropertyId = propertyId || (room as any)?.pivot?.property_id;
        if (contextPropertyId) {
          try {
            await apiService.updateRoomRequirements(
              contextPropertyId.toString(),
              room.id,
              !!requiresPhoto,
              photosRequiredCount || 0,
            );
          } catch (e) {
            console.error('Failed to update room requirements', e);
          }
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving room:', err);
      setError(err.message || 'Failed to save room.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getDialogTitle = () => {
    const baseTitle = (() => {
      switch (mode) {
        case 'create':
          return 'Create New Room';
        case 'edit':
          return 'Edit Room';
        case 'view':
          return 'Room Details';
        default:
          return 'Room';
      }
    })();

    if (room?.is_created_by_admin) {
      return (
        <div className="flex items-center gap-2">
          {baseTitle}
          <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
            Admin Created
          </Badge>
        </div>
      );
    }

    return baseTitle;
  };

  const getDialogDescription = () => {
    const baseDescription = (() => {
      switch (mode) {
        case 'create':
          return 'Add a new room to your system';
        case 'edit':
          return 'Update room information';
        case 'view':
          return 'View room details';
        default:
          return '';
      }
    })();

    if (room?.is_created_by_admin) {
      return (
        <div>
          {baseDescription}
          <div className="mt-2 text-sm text-purple-600">
            This room was created by an admin and is available to all property owners.
          </div>
        </div>
      );
    }

    return baseDescription;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Room Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter room name"
              disabled={mode === 'view'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter room description"
              disabled={mode === 'view'}
              rows={3}
            />
          </div>

          {/* Owner Selection - Admin Only, or Property Owner when showOwnerField is true, but not for system default rooms */}
          {(isAdmin || showOwnerField) && !formData.is_system_default && (() => {
            return (
              <div className="space-y-2">
                <Label htmlFor="owner_id">Owner</Label>
              <Select
                key={`owner-select-${selectedOwnerId}`}
                value={selectedOwnerId}
                onValueChange={(value) => {
                  setSelectedOwnerId(value);
                  // Clear property selection when owner changes
                  handleInputChange('property_id', '');
                }}
                disabled={mode === 'view' || loadingOwners || (showOwnerField && !isAdmin)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOwners ? "Loading owners..." : "Select property owner"}>
                    {owners.find(owner => owner.id === selectedOwnerId)?.name || 'Select property owner'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            );
          })()}

          {!formData.is_system_default && (
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              <Select
                key={`property-select-${formData.property_id}`}
                value={formData.property_id}
                onValueChange={(value) => handleInputChange('property_id', value)}
                disabled={mode === 'view' || loadingProperties}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Select property..."}>
                    {propertyOptions.find(property => property.id === formData.property_id)?.name || 'Select property...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {propertyOptions.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.is_system_default && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>System Default Room:</strong> This room will be automatically created for <strong>ALL property owners</strong> as a default room. No owner selection needed.
              </p>
            </div>
          )}

          {/* Task Assignment with Tag Input - Only for Property Owners */}
          {canAssignTasks ? (
            <div className="space-y-2">
              <Label htmlFor="task-assignment">Task Assignment</Label>
              <TagInput
                value={selectedTasks as TagInputOption[]}
                onChange={(value) => {
                  console.log('TagInput onChange called with:', value);
                  console.log('Current selectedTasks before update:', selectedTasks);
                  console.log('Value type:', typeof value, 'Is array:', Array.isArray(value));
                  console.log('Value length:', value?.length);
                  setSelectedTasks(value as Task[]);
                  console.log('setSelectedTasks called');
                }}
                options={availableTasks as TagInputOption[]}
                onSearch={searchTasks}
                placeholder="Type task names or search existing tasks..."
                disabled={mode === 'view'}
                maxTags={50}
                disableDropdown
                showGhostSuggestion
                enableSort
                emptyMessage="No tasks available."
                loading={taskSearchLoading}
                renderOption={(task, isSelected) => (
                  <div className="flex items-center space-x-2 w-full">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Est. {task.estimated_time} min
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-xs text-blue-600 font-medium">Selected</div>
                    )}
                  </div>
                )}
              />
              {selectedTasks.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTasks([])}
                    className="h-auto p-1 text-xs"
                    aria-label="Clear all selected tasks"
                  >
                    Clear all tasks
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Task Assignment</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'admin' 
                    ? 'Admins cannot assign tasks to rooms. Only property owners can manage room tasks.'
                    : 'Task assignment is restricted to property owners only.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Photo Requirements per Room (optional: requires property context to persist) */}
          <div className="space-y-2">
            <Label>Photo Requirements</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={requiresPhoto}
                  onCheckedChange={(checked) => {
                    setRequiresPhoto(!!checked);
                    if (!checked) setPhotosRequiredCount(undefined);
                  }}
                  disabled={mode === 'view'}
                />
                <span className="text-sm">Requires photo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Count</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-20"
                  value={requiresPhoto && photosRequiredCount ? String(photosRequiredCount) : ''}
                  placeholder=""
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
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setPhotosRequiredCount(undefined);
                      return;
                    }
                    const num = Math.max(1, Math.min(10, parseInt(raw, 10)));
                    setPhotosRequiredCount(Number.isFinite(num) ? num : undefined);
                  }}
                  disabled={mode === 'view' || !requiresPhoto}
                />
              </div>
            </div>
            {!propertyId && !((room as any)?.pivot?.property_id) && (
              <p className="text-xs text-orange-600">Note: Photo requirements will only be saved when opened from a property context.</p>
            )}
          </div>

          {!isAdmin && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                disabled={mode === 'view'}
              />
              <Label htmlFor="is_default" className="text-sm font-normal">
                Set as default room
              </Label>
            </div>
          )}

          {isAdmin && mode === 'create' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_system_default"
                checked={formData.is_system_default}
                onCheckedChange={(checked) => {
                  handleInputChange('is_system_default', checked);
                  // Clear owner selection when creating system default room
                  if (checked) {
                    setSelectedOwnerId('');
                    handleInputChange('property_id', '');
                  }
                }}
                disabled={false}
              />
              <Label htmlFor="is_system_default" className="text-sm font-normal">
                <span className="font-medium text-blue-600">Create as system default room</span>
                <span className="text-xs text-gray-500 block">
                  This will create this room for all property owners as a default room
                </span>
              </Label>
            </div>
          )}

          {mode !== 'view' && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'create' ? 'Create Room' : 'Update Room'}
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
} 