'use client';

import {useEffect, useState} from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, MapPin, Users, Calendar, Image as ImageIcon } from 'lucide-react';
import { DeletePropertyDialog } from '@/components/properties/delete-property-dialog';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';
import Link from 'next/link';
import { Property, PaginatedResponse } from '@/lib/api';
import { apiService } from '@/lib/api';
import { getAmenities } from '@/lib/utils';


export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  const {
    pagination,
    updatePagination,
    changePage,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = usePagination({ perPage: 20 });

  const fetchProperties = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const response = await apiService.getProperties(page, pagination.perPage);
      setProperties(response.data);
      updatePagination(response);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(currentPage);
  }, [currentPage]);

  const handleDeleteClick = (property: any) => {
    setPropertyToDelete(property);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    // Refresh properties list or remove from state
    // In a real app, you'd refetch the data or update the state
    setPropertyToDelete(null);
    fetchProperties(currentPage);
  };

  return (
    <ProtectedRoute roles={['admin', 'property_owner']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
              <p className="text-gray-600">Manage your property portfolio</p>
            </div>
            <Link href="/properties/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>

          {/* Properties Grid */}
          {!loading && properties && properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property:any) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative">
                  {property.image_url ? (
                    <img
                      src={property.image_url}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="h-12 w-12 mb-2" />
                      <span className="text-sm font-medium">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={property.status === 'active' ? 'default' : 'secondary'}
                      className={property.status === 'active' ? 'bg-green-600' : 'bg-yellow-600'}
                    >
                      {property.status}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        {property.housekeepers} Housekeepers
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        {property.lastCleaning}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {getAmenities(property.amenities).slice(0, 3).map((amenity: string) => (
                        <Badge key={amenity} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {getAmenities(property.amenities).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{getAmenities(property.amenities).length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link href={`/properties/${property.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/properties/${property.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(property)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-gray-200 animate-pulse flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && (!properties || properties.length === 0) && (
            <Card className="text-center  py-12">
              <CardContent>
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first property</p>
                <Link href="/properties/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Property
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {!loading && properties && properties.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
                isLoading={loading}
              />
            </div>
          )}
        </div>

        {/* Delete Dialog */}
        {propertyToDelete && (
          <DeletePropertyDialog
            property={propertyToDelete}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onSuccess={handleDeleteSuccess}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
