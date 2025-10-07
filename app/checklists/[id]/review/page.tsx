'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Calendar, 
  Star, 
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react';
import Link from 'next/link';
import { apiService, Checklist } from '@/lib/api';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5, 'Rating must be between 1 and 5'),
  notes: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export default function ReviewChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);

  const checklistId = params.id as string;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
  });

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        setLoading(true);
        const response = await apiService.getChecklist(checklistId);
        setChecklist(response.data);
        
        // If already reviewed, populate form
        if (response.data.rating) {
          setSelectedRating(response.data.rating);
          setValue('rating', response.data.rating);
          setValue('notes', response.data.notes || '');
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
  }, [checklistId, setValue]);

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    setValue('rating', rating);
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!checklist) return;

    try {
      setSubmitting(true);
      setError(null);

      await apiService.reviewChecklist(checklist.id, {
        rating: data.rating,
        notes: data.notes,
      });

      setSuccess('Review submitted successfully! Redirecting...');
      
      setTimeout(() => {
        router.push(`/checklists/${checklist.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'reviewed':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'reviewed':
        return 'Reviewed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const completedTasks = checklist?.items?.filter(item => item.completed).length || 0;
  const totalTasks = checklist?.items?.length || 0;

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

  if (error && !checklist) {
    return (
      <ProtectedRoute roles={['admin', 'property_owner']}>
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

  if (!checklist || checklist.status !== 'completed') {
    return (
      <ProtectedRoute roles={['admin', 'property_owner']}>
        <DashboardLayout>
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {!checklist ? 'Checklist not found' : 'Checklist is not ready for review'}
            </h3>
            <p className="text-gray-600 mb-4">
              {!checklist ? 'The checklist you are looking for does not exist.' : 'Only completed checklists can be reviewed.'}
            </p>
            <Link href="/checklists">
              <ArrowLeft className="h-10 w-10 mr-2" />
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
              <Link href={`/checklists/${checklist.id}`}>
                <ArrowLeft className="h-10 w-10 mr-2" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Review Checklist</h1>
                <p className="text-gray-600">{checklist.property?.name}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Review Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-yellow-500" />
                    {checklist.rating ? 'Update Review' : 'Submit Review'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Success Message */}
                  {success && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
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

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Rating */}
                    <div className="space-y-3">
                      <Label>Rating *</Label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleRatingClick(rating)}
                            className={`p-2 rounded-full transition-colors ${
                              rating <= selectedRating
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-300 hover:text-gray-400'
                            }`}
                          >
                            <Star 
                              className={`h-8 w-8 ${rating <= selectedRating ? 'fill-current' : ''}`} 
                            />
                          </button>
                        ))}
                        <span className="ml-4 text-sm text-gray-600">
                          {selectedRating > 0 ? `${selectedRating}/5` : 'Select a rating'}
                        </span>
                      </div>
                      {errors.rating && (
                        <p className="text-sm text-red-600">{errors.rating.message}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Review Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any feedback or comments about the cleaning service..."
                        rows={4}
                        className="transition-all duration-200 focus:ring-1 focus:ring-blue-500"
                        {...register('notes')}
                      />
                      <p className="text-xs text-gray-500">
                        Share your thoughts about the quality of work, areas for improvement, or positive feedback.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={submitting || selectedRating === 0}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {submitting ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Submitting Review...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            {checklist.rating ? 'Update Review' : 'Submit Review'}
                          </>
                        )}
                      </Button>
                      <Link href={`/checklists/${checklist.id}`}>
                        <Button variant="outline" type="button">
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Checklist Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Checklist Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <Badge className={getStatusColor(checklist.status)}>
                      {getStatusText(checklist.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Progress:</span>
                    <span className="text-sm text-gray-900">{completedTasks}/{totalTasks} tasks</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Property:</span>
                      <span className="text-sm text-gray-900">{checklist.property?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Housekeeper:</span>
                      <span className="text-sm text-gray-900">{checklist.housekeeper?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Scheduled:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(checklist.scheduled_date).toLocaleDateString()}
                        {checklist.scheduled_time && (
                          <span className="ml-2 text-gray-500">
                            at {new Date(checklist.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Review */}
              {checklist.rating && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                  </CardContent>
                </Card>
              )}

              {/* Rating Guide */}
              <Card>
                <CardHeader>
                  <CardTitle>Rating Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm">Excellent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3, 4].map((star) => (
                        <Star key={star} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                      <Star className="h-4 w-4 text-gray-300" />
                    </div>
                    <span className="text-sm">Good</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3].map((star) => (
                        <Star key={star} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                      {[4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 text-gray-300" />
                      ))}
                    </div>
                    <span className="text-sm">Average</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2].map((star) => (
                        <Star key={star} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                      {[3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 text-gray-300" />
                      ))}
                    </div>
                    <span className="text-sm">Poor</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      {[2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 text-gray-300" />
                      ))}
                    </div>
                    <span className="text-sm">Very Poor</span>
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