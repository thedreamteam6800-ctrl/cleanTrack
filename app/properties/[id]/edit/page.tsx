'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiService, Property } from '@/lib/api';
import { PropertyFormWithRooms } from '@/components/properties/property-form-with-rooms';
import { Button } from '@/components/ui/button';

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const propertyId = params.id as string;

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setPageLoading(true);
        const response = await apiService.getProperty(propertyId);
        const propertyData = response.data;
        
        setProperty(propertyData);
      } catch (err: any) {
        setError(err.message || 'Failed to load property details.');
      } finally {
        setPageLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const handleSuccess = () => {
    setSuccess('Property updated successfully! Redirecting...');
    setTimeout(() => {
      router.push(`/properties/${propertyId}`);
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (pageLoading) {
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

  if (error && !property) {
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
              <Link href={`/properties/${propertyId}`}>
                <ArrowLeft className="h-10 w-10 mr-2" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
                <p className="text-gray-600">Update property information and settings</p>
              </div>
            </div>
          </div>

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

          {/* Property Form */}
          {property && (
            <PropertyFormWithRooms
              mode="edit"
              initialData={{
                ...property,
                room_ids: property.rooms?.map(room => room.id) || [],
              }}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}