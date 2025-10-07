'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { CheckSquare2, AlertCircle, Trash2 } from 'lucide-react';
import { apiService, Task } from '@/lib/api';

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSuccess: () => void;
}

export function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: DeleteTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!task) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiService.deleteTask(task.id);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomNames = (task: Task) => {
    return task.rooms?.map(room => room.name).join(', ') || 'No rooms assigned';
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete Task
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                This action cannot be undone. This will permanently delete the task.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Task Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center space-x-2">
              <CheckSquare2 className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-gray-900">{task.title}</h3>
            </div>
            
            {task.description && (
              <p className="text-sm text-gray-600">{task.description}</p>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estimated Time:</span>
              <span className="font-medium">{task.estimated_time} minutes</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Photo Required:</span>
              <span className="font-medium">{task.requires_photo ? 'Yes' : 'No'}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Assigned Rooms:</span>
              <span className="font-medium">{getRoomNames(task)}</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Deleting this task will remove it from all checklists and cannot be undone. 
                  Make sure this task is no longer needed before proceeding.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
