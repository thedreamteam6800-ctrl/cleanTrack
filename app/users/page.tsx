'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  AlertCircle,
  UserPlus,
  Mail,
  Shield,
  Calendar
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiService, User } from '@/lib/api';
import { UserManagementDialog } from '@/components/users/user-management-dialog';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/use-pagination';

interface UserFilters {
  role?: string;
  search?: string;
  is_active?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDialogMode, setUserDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const {
    pagination,
    updatePagination,
    changePage,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage
  } = usePagination({ perPage: 20 });

  const fetchUsers = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getUsers(page, pagination.perPage, filters);
      setUsers(Array.isArray(response.data) ? response.data : []);
      updatePagination(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [filters, currentPage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: value || undefined
      }));
    }, 800);

    setSearchTimeout(timeout);
  };

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUserAction = (action: 'create' | 'edit' | 'view', user?: User) => {
    setUserDialogMode(action);
    setSelectedUser(user || null);
    setShowUserDialog(true);
  };

  const handleUserSuccess = () => {
    fetchUsers();
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await apiService.toggleUserStatus(userId);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to toggle user status.');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'property_owner':
        return 'default';
      case 'housekeeper':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'property_owner':
        return 'Property Owner';
      case 'housekeeper':
        return 'Housekeeper';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ProtectedRoute roles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600">Manage user accounts and permissions</p>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => handleUserAction('create')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={filters.role || 'all'}
                    onValueChange={(value) => handleFilterChange('role', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="property_owner">Property Owner</SelectItem>
                      <SelectItem value="housekeeper">Housekeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => handleFilterChange('is_active', value === 'all' ? undefined : value === 'active')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          {loading ? (
            <Card className="text-center py-12">
              <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner size="lg" />
              </div>
            </Card>
          ) : users.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                             <p className="text-gray-600 mb-4">
                 {searchTerm || filters.role || filters.is_active !== undefined
                   ? 'Try adjusting your search or filters.'
                   : 'Get started by adding your first user.'}
               </p>
               {!searchTerm && !filters.role && filters.is_active === undefined && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleUserAction('create')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First User
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUserAction('view', user)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUserAction('edit', user)}>
                            Edit User
                          </DropdownMenuItem>
                                                     <DropdownMenuItem
                             onClick={() => handleToggleStatus(user.id)}
                             className={user.is_active ? 'text-orange-600' : 'text-green-600'}
                           >
                             {user.is_active ? 'Deactivate' : 'Activate'}
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          <Shield className="h-3 w-3 mr-1" />
                          Role
                        </div>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          Status
                        </div>
                                                 <Badge variant={user.is_active ? 'default' : 'secondary'}>
                           {user.is_active ? 'Active' : 'Inactive'}
                         </Badge>
                      </div>

                      <div className="text-xs text-gray-500">
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && users && users.length > 0 && (
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

        {/* User Management Dialog */}
        <UserManagementDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          mode={userDialogMode}
          user={selectedUser}
          onSuccess={handleUserSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
