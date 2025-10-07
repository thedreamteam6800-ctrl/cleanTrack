'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Star,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { apiService, Checklist, ChecklistItem, Room } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export default function ChecklistDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPhotosMap, setSelectedPhotosMap] = useState<Record<string, File[]>>({});
  const [photoPreviewsMap, setPhotoPreviewsMap] = useState<Record<string, string[]>>({});
  const [itemNotesMap, setItemNotesMap] = useState<Record<string, string>>({});
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomPhotoProgress, setRoomPhotoProgress] = useState<{ required: number; total: number }>({ required: 0, total: 0 });


  const checklistId = params.id as string;

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        setLoading(true);
        const response = await apiService.getChecklist(checklistId);
        const data = response.data as Checklist;
        setChecklist(data);
        // Determine current room by order: first room that is not complete by backend criteria
        const orderedRooms: Room[] = (data.property?.rooms || []) as any;
        const items = data.items || [];
        // Find the first room that has any incomplete items
        const firstPending = orderedRooms.find((r) => items.some(it => it.room_id === (r as any).id && !it.completed));
        setCurrentRoomId((firstPending as any)?.id || (orderedRooms[0] as any)?.id || null);

        // Compute room photo progress for current room
        const current = (firstPending as any) || (orderedRooms[0] as any);
        if (current) {
          const photos = items.filter(it => (it as any).room_id === current.id).flatMap(it => it.photos || []);
          const total = photos.length;
          const required = Math.max(0, Number((current as any).pivot?.photos_required_count || 0));
          setRoomPhotoProgress({ required, total });
        } else {
          setRoomPhotoProgress({ required: 0, total: 0 });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load checklist details.');
      } finally {
        setLoading(false);
      }
    };

    if (checklistId) {
      fetchChecklist();
    }
  }, [checklistId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const files = Array.from(e.target.files || []);

    setSelectedPhotosMap(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), ...files],
    }));

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewsMap(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
  };


  const handleSubmit = async (item: ChecklistItem) => {
    const photos = selectedPhotosMap[item.id] || [];
    const notes = itemNotesMap[item.id] || '';

    if (!checklist) return;
    
    // Prevent submission if task is already completed
    if (item.completed) {
      setError('Cannot modify a completed task.');
      return;
    }

    try {
      setUpdating(item.id);
      setError(null);

      await apiService.updateChecklistItem(checklist.id, item.id, {
        completed: true, // Set to true when submitting
        notes,
        photos,
      });

      // Refresh checklist
      const response = await apiService.getChecklist(checklistId);
      const data = response.data as Checklist;
      setChecklist(data);
      // Recalculate current room & photo progress
      const orderedRooms: Room[] = (data.property?.rooms || []) as any;
      const items = data.items || [];
      const firstPending = orderedRooms.find((r) => items.some(it => it.room_id === (r as any).id && !it.completed));
      const newCurrentId = (firstPending as any)?.id || (orderedRooms[0] as any)?.id || null;
      setCurrentRoomId(newCurrentId);
      if (newCurrentId) {
        const photos = items.filter(it => (it as any).room_id === newCurrentId).flatMap(it => it.photos || []);
        const total = photos.length;
        const required = Math.max(0, Number(((orderedRooms.find(r => (r as any).id === newCurrentId) as any)?.pivot?.photos_required_count || 0)));
        setRoomPhotoProgress({ required, total });
      } else {
        setRoomPhotoProgress({ required: 0, total: 0 });
      }

      // Clear form state for this item
      setSelectedPhotosMap(prev => ({ ...prev, [item.id]: [] }));
      setPhotoPreviewsMap(prev => ({ ...prev, [item.id]: [] }));
      setItemNotesMap(prev => ({ ...prev, [item.id]: '' }));
      
      setSuccess(`Task updated successfully for "${item.task?.title}"!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    } finally {
      setUpdating(null);
    }
  };





  const handleStartChecklist = async () => {
    if (!checklist) return;

    try {
      if (!navigator.geolocation) {
        setError('Location permission is required to start this checklist.');
        return;
      }

      const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }).catch(() => {
        setError('Unable to get your location. Please enable location services and try again.');
        return undefined;
      });

      if (!coords) return;

      await apiService.startChecklist(checklist.id, coords);
      const response = await apiService.getChecklist(checklistId);
      setChecklist(response.data);
    } catch (err: any) {
      const extra = err?.data?.distance_meters !== undefined
        ? ` (You are ~${Math.round(err.data.distance_meters)}m away; allowed ${err.data.allowed_meters}m)`
        : '';
      setError((err.message || 'Failed to start checklist.') + extra);
    }
  };

  const handleCompleteChecklist = async () => {
    if (!checklist) return;

    try {
      await apiService.completeChecklist(checklist.id);
      const response = await apiService.getChecklist(checklistId);
      setChecklist(response.data);
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
    if (!status) return 'Unknown';

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

  const completedTasks = checklist?.items?.filter(item => item.completed).length || 0;
  const totalTasks = checklist?.items?.length || 0;
  const canStart = checklist?.status === 'pending';
  const canComplete = checklist?.status === 'in_progress' && completedTasks === totalTasks;
  const canUpdate = checklist?.status === 'in_progress' && user?.role === 'housekeeper';

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

  if (error && !checklist) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
            <Link href="/checklists">
              <ArrowLeft className="h-10 w-10 mr-2" />
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!checklist) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Checklist not found</h3>
            <Link href="/checklists">
              <ArrowLeft className="h-10 w-10 mr-2" />
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/checklists">
                <ArrowLeft className="h-10 w-10 mr-2" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Checklist Details</h1>
                <p className="text-gray-600">{checklist.property?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {canStart && user?.role === 'housekeeper' && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleStartChecklist}
                >
                  Start Checklist
                </Button>
              )}
              {canComplete && user?.role === 'housekeeper' && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleCompleteChecklist}
                >
                  Complete Checklist
                </Button>
              )}
              {checklist.status === 'completed' && !checklist.rating &&
               (user?.role === 'admin' || user?.role === 'property_owner') && (
                <Link href={`/checklists/${checklist.id}/review`}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Review Checklist
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Checklist Info */}
              <Card>
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                        {checklist.property?.name}
                      </CardTitle>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <User className="h-4 w-4 mr-1" />
                        {checklist.housekeeper?.name}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(checklist.scheduled_date).toLocaleDateString()}
                        {checklist.scheduled_time && (
                          <span className="ml-2">
                            at {new Date(checklist.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(checklist.status)}>
                        {getStatusText(checklist.status)}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-2">
                        {completedTasks}/{totalTasks} completed
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Current Room & Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {currentRoomId
                      ? `Current Room: ${checklist.property?.rooms?.find((r: any) => r.id === currentRoomId)?.name || ''}`
                      : 'Tasks'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {currentRoomId && (
                    <div className="px-4 py-3 border-b text-sm text-gray-700 flex items-center gap-3">
                      <span>Photos: {roomPhotoProgress.total}/{roomPhotoProgress.required}</span>
                      {roomPhotoProgress.required > 0 && (
                        <div className="w-40 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (roomPhotoProgress.total / Math.max(1, roomPhotoProgress.required)) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="divide-y divide-gray-200">
                    {checklist.items?.filter(it => !currentRoomId || (it as any).room_id === currentRoomId).map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {item.task?.title}
                                </span>
                                {item.completed && (
                                  <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    <span className="text-xs font-medium">Completed</span>
                                  </div>
                                )}
                                {item.task?.requires_photo && !item.completed && (
                                  <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    <Camera className="h-4 w-4 mr-1" />
                                    <span className="text-xs font-medium">Photo required</span>
                                  </div>
                                )}
                              </div>

                              {item.task?.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.task.description}</p>
                              )}

                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.task?.estimated_time} minutes
                                {item.task?.rooms && item.task.rooms.length > 0 && (
                                  <>
                                    <span className="mx-2">•</span>
                                    {item.task.rooms[0].name}
                                  </>
                                )}
                              </div>

                              {item.notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                  <strong>Notes:</strong> {item.notes}
                                </div>
                              )}

                              {item.photo && (
                                <div className="mt-2">
                                  <img
                                    src={item.photo_url}
                                    alt="Task completion photo"
                                    className="w-32 h-32 object-cover rounded border"
                                  />
                                </div>
                              )}
                              {item.photo_urls && item.photo_urls.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <Camera className="h-4 w-4 mr-1" />
                                    Completed Photos ({item.photo_urls.length})
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {item.photo_urls.map((photoUrl, index) => {
                                      const photoData = item.photos?.[index];
                                      const uploadTime = photoData?.uploaded_at 
                                        ? new Date(photoData.uploaded_at).toLocaleString()
                                        : 'Upload time unavailable';
                                      
                                      return (
                                        <div key={index} className="space-y-1">
                                          <div className="relative group">
                                            <img
                                              src={photoUrl}
                                              alt={`Task completion photo ${index + 1}`}
                                              className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded border flex items-center justify-center">
                                              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100">
                                                Photo {index + 1}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="text-xs text-gray-500 text-center">
                                            {uploadTime}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Completed Task Indicator */}
                              {item.completed && (
                                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center text-green-700">
                                    <Lock className="h-5 w-5 mr-2" />
                                    <span className="text-sm font-medium">Task Completed & Locked</span>
                                  </div>
                                  <p className="text-xs text-green-600 mt-1">
                                    This task has been completed and cannot be modified.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {updating === item.id && <LoadingSpinner size="sm" />}
                            {item.completed && (
                              <div className="flex items-center text-green-600">
                                <CheckCircle2 className="h-5 w-5 mr-1" />
                                <span className="text-sm font-medium">Completed</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Task Update Form */}
                        {canUpdate && !item.completed && (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-3 flex items-center">
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Update Task
                            </h4>

                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`photo-${item.id}`}>Photos </Label>
                                <div className="mt-1">
                                  <input
                                    id={`photo-${item.id}`}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handlePhotoChange(e, item.id)}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Select one or more photos 
                                  </p>
                                </div>

                                {photoPreviewsMap[item.id]?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-600 mb-2">
                                      {photoPreviewsMap[item.id]?.length} photo(s) selected
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {photoPreviewsMap[item.id]?.map((preview, index) => (
                                        <div key={index} className="relative group">
                                          <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-24 object-cover rounded border"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedPhotosMap(prev => ({
                                                ...prev,
                                                [item.id]: prev[item.id]?.filter((_, i) => i !== index) || []
                                              }));
                                              setPhotoPreviewsMap(prev => ({
                                                ...prev,
                                                [item.id]: prev[item.id]?.filter((_, i) => i !== index) || []
                                              }));
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div>
                                <Label htmlFor={`notes-${item.id}`}>Notes</Label>
                                <Textarea
                                    id={`notes-${item.id}`}
                                    value={itemNotesMap[item.id] || ''}
                                    onChange={(e) =>
                                        setItemNotesMap(prev => ({ ...prev, [item.id]: e.target.value }))
                                    }
                                    placeholder="Add any notes about this task..."
                                    rows={3}
                                    className="focus:ring-green-500 focus:border-green-500"
                                />
                              </div>
                            </div>
                            {roomPhotoProgress.required > 0 && (
                              <Alert className="mt-2 border-blue-200 bg-blue-50">
                                <AlertDescription className="text-blue-800 text-xs">
                                  This room requires at least {roomPhotoProgress.required} photo(s). You have {roomPhotoProgress.total} saved
                                  {photoPreviewsMap[item.id]?.length ? ` + ${photoPreviewsMap[item.id]?.length} selected` : ''}.
                                </AlertDescription>
                              </Alert>
                            )}
                            <Button
                                type="button"
                                onClick={() => handleSubmit(item)}
                                disabled={
                                  updating === item.id ||
                                  (roomPhotoProgress.required > 0 &&
                                    (roomPhotoProgress.total + (selectedPhotosMap[item.id]?.length || 0)) < roomPhotoProgress.required)
                                }
                                className="mt-4 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {updating === item.id ? (
                                <>
                                  <LoadingSpinner size="sm" className="mr-2" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Submit
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Room Stepper */}
              <Card>
                <CardHeader>
                  <CardTitle>Rooms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(checklist.property?.rooms || []).map((r: any, idx: number) => {
                      const isCurrent = r.id === currentRoomId;
                      return (
                        <div key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded border ${isCurrent ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
                          <span className="text-sm font-medium">{idx + 1}. {r.name}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                      );
                    })}
                    <div className="ml-auto text-sm text-gray-600">
                      Room {((checklist.property?.rooms || []).findIndex((r: any) => r.id === currentRoomId) + 1) || 0} of {(checklist.property?.rooms || []).length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progress Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                      </div>
                      <p className="text-sm text-gray-600">Complete</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">{completedTasks}</div>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xl font-bold text-gray-600">{totalTasks - completedTasks}</div>
                        <p className="text-xs text-gray-600">Remaining</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Review Info */}
              {checklist.rating && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 fill-current mr-2" />
                        <span className="font-medium">{checklist.rating}/5</span>
                      </div>
                      {checklist.notes && (
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Notes:</p>
                          <p className="text-sm text-gray-600">{checklist.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Checklist Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(checklist.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(checklist.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Property:</span>
                    <span className="text-sm text-gray-900">{checklist.property?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Housekeeper:</span>
                    <span className="text-sm text-gray-900">{checklist.housekeeper?.name}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}