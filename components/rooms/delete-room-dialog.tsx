'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { apiService, Room } from '@/lib/api';
import { useState } from 'react';

interface DeleteRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  onSuccess: () => void;
}

export function DeleteRoomDialog({
  open,
  onOpenChange,
  room,
  onSuccess,
}: DeleteRoomDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!room) return;

    setLoading(true);
    setError(null);

    try {
      await apiService.deleteRoom(room.id);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-600" />
            Delete Room
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this room? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {room && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Room Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Name:</strong> {room.name}</p>
                {room.description && (
                  <p><strong>Description:</strong> {room.description}</p>
                )}
                <p><strong>Created:</strong> {(() => {
                  try {
                    const date = new Date(room.created_at);
                    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
                  } catch {
                    return 'Unknown';
                  }
                })()}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Room
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 