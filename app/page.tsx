'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Shield } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        // Redirect based on user role
        switch (user.role) {
          case 'admin':
          case 'property_owner':
            router.push('/dashboard');
            break;
          case 'housekeeper':
            router.push('/today-tasks');
            break;
          default:
            router.push('/dashboard');
        }
      } else {
        // Redirect to login if not authenticated
        router.push('/login');
      }
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading spinner while determining where to redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-4 rounded-full animate-pulse">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">CleanTrack</h1>
        <div className={'text-center flex items-center justify-center'}>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    </div>
  );
}