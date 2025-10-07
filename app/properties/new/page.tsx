'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PropertyFormWithRooms } from '@/components/properties/property-form-with-rooms';

export default function NewPropertyPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    setSuccess('Property created successfully! Redirecting...');
    setTimeout(() => {
      router.push('/properties');
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <ProtectedRoute roles={['admin', 'property_owner']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/properties">
                <ArrowLeft className="h-10 w-10 mr-2" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
                <p className="text-gray-600">Create a new property in your portfolio</p>
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
          <PropertyFormWithRooms
            mode="create"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}