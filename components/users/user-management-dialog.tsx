'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Shield, 
  Calendar, 
  AlertCircle, 
  Save, 
  X, 
  Upload,
  Building2,
  CheckSquare2
} from 'lucide-react';
import { apiService, User as UserType, CreateUserData, UpdateUserData } from '@/lib/api';

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  user: UserType | null;
  onSuccess: () => void;
}

export function UserManagementDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSuccess,
}: UserManagementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'housekeeper' as 'property_owner' | 'housekeeper',
  });
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user && mode !== 'create') {
      // For admin users, default to housekeeper role since admin cannot be assigned via UI
      const editableRole = user.role === 'admin' ? 'housekeeper' : user.role;
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role: editableRole,
      });
      setAvatarPreview(user.avatar || null);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'housekeeper',
      });
      setAvatarPreview(null);
    }
    setSelectedAvatar(null);
    setError(null);
  }, [user, mode, open]);

     const handleInputChange = (field: string, value: string) => {
     setFormData(prev => ({
       ...prev,
       [field]: value
     }));
   };

   const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       // Validate file type
       if (!file.type.startsWith('image/')) {
         setError('Please select an image file (JPEG, PNG, GIF, etc.)');
         return;
       }
       
       // Validate file size (max 5MB)
       const maxSize = 5 * 1024 * 1024; // 5MB
       if (file.size > maxSize) {
         setError('Avatar file size must be less than 5MB');
         return;
       }
       
       setSelectedAvatar(file);
       setError(null); // Clear any previous errors
       
       const reader = new FileReader();
       reader.onloadend = () => {
         setAvatarPreview(reader.result as string);
       };
       reader.readAsDataURL(file);
     }
   };

   const handleRemoveAvatar = () => {
     setSelectedAvatar(null);
     setAvatarPreview(null);
     setError(null);
   };

     const handleSubmit = async () => {
     if (!formData.name || !formData.email || (mode === 'create' && !formData.password)) {
       setError('Please fill in all required fields.');
       return;
     }

     // Validate email format
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(formData.email)) {
       setError('Please enter a valid email address.');
       return;
     }

     // Validate password length for create mode
     if (mode === 'create' && formData.password && formData.password.length < 6) {
       setError('Password must be at least 6 characters long.');
       return;
     }

     // Validate password confirmation for create mode
     if (mode === 'create' && formData.password !== formData.password_confirmation) {
       setError('Password confirmation does not match.');
       return;
     }

     

     setLoading(true);
     setError(null);

     try {
       if (mode === 'create') {
         // Create user data with required fields
         const createData: CreateUserData = {
           name: formData.name.trim(),
           email: formData.email.trim().toLowerCase(),
           password: formData.password,
           password_confirmation: formData.password_confirmation,
           role: formData.role,
         };
         
         const response = await apiService.createUser(createData);
         
         // Upload avatar if selected (after user creation)
         if (selectedAvatar && response.data.id) {
           setAvatarUploading(true);
           try {
             const avatarResponse = await apiService.uploadAvatar(response.data.id, selectedAvatar);
             // Show success message for avatar upload
             setError(null);
           } catch (avatarError: any) {
             console.warn('Avatar upload failed:', avatarError.message);
             // Show warning but don't fail the entire operation
             setError(`User created successfully, but avatar upload failed: ${avatarError.message}`);
           } finally {
             setAvatarUploading(false);
           }
         }
       } else if (user) {
         // Update user data with optional fields
         const updateData: UpdateUserData = {
           name: formData.name.trim(),
           email: formData.email.trim().toLowerCase(),
           role: formData.role,
         };
         
         // Only include password if provided
         if (formData.password && formData.password.trim()) {
           updateData.password = formData.password;
         }
         
         const response = await apiService.updateUser(user.id, updateData);
         
         // Upload avatar if selected (after user update)
         if (selectedAvatar) {
           setAvatarUploading(true);
           try {
             const avatarResponse = await apiService.uploadAvatar(user.id, selectedAvatar);
             // Show success message for avatar upload
             setError(null);
           } catch (avatarError: any) {
             console.warn('Avatar upload failed:', avatarError.message);
             // Show warning but don't fail the entire operation
             setError(`User updated successfully, but avatar upload failed: ${avatarError.message}`);
           } finally {
             setAvatarUploading(false);
           }
         }
       }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || `Failed to ${mode} user.`);
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg sm:text-xl">
            <User className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" />
            <span className="truncate">
              {mode === 'create' ? 'Add New User' : mode === 'edit' ? 'Edit User' : 'User Details'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new user account with appropriate permissions.'
              : mode === 'edit' 
              ? 'Update user information and permissions.'
              : 'View user details and information.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
                     {/* Error/Success Message */}
           {error && (
             <Alert className={`border ${
               error.includes('successfully') 
                 ? 'border-green-200 bg-green-50' 
                 : 'border-red-200 bg-red-50'
             }`}>
               {error.includes('successfully') ? (
                 <div className="flex items-center">
                   <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                   <AlertDescription className="text-green-800">
                     {error}
                   </AlertDescription>
                 </div>
               ) : (
                 <>
                   <AlertCircle className="h-4 w-4 text-red-600" />
                   <AlertDescription className="text-red-800">
                     {error}
                   </AlertDescription>
                 </>
               )}
             </Alert>
           )}

                                                                 {/* Avatar Upload */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={avatarPreview || undefined} alt={formData.name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-base sm:text-lg">
                    {getInitials(formData.name)}
                  </AvatarFallback>
                </Avatar>
                {mode !== 'view' && (
                  <>
                    {/* Upload Button */}
                    <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2">
                      <label htmlFor="avatar" className="cursor-pointer">
                        <div className="bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700">
                          <Upload className="h-3 w-3" />
                        </div>
                        <input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {/* Remove Button (only show if avatar is selected) */}
                    {selectedAvatar && (
                      <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2">
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                          title="Remove avatar"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Avatar Upload Notice */}
            {mode !== 'view' && selectedAvatar && (
              <div className="text-center px-2">
                <div className={`text-xs border rounded-md p-2 ${
                  avatarUploading 
                    ? 'text-blue-600 bg-blue-50 border-blue-200' 
                    : 'text-green-600 bg-green-50 border-green-200'
                }`}>
                  {avatarUploading ? (
                    <>
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                        <span className="whitespace-nowrap">Uploading avatar...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <span>✅</span>
                          <span className="ml-1 truncate max-w-[200px] sm:max-w-none">
                            {selectedAvatar.name}
                          </span>
                        </div>
                        <div className="text-green-700">
                          Size: {(selectedAvatar.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <div className="text-green-700 text-center leading-tight">
                          Avatar will be uploaded after user data is saved.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

           {/* Form Fields */}
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={mode === 'view'}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={mode === 'view'}
                placeholder="Enter email address"
              />
            </div>

                         {(mode === 'create' || mode === 'edit') && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="password">
                     {mode === 'create' ? 'Password *' : 'Password (leave blank to keep current)'}
                   </Label>
                   <Input
                     id="password"
                     type="password"
                     value={formData.password}
                     onChange={(e) => handleInputChange('password', e.target.value)}
                     placeholder={mode === 'create' ? 'Enter password' : 'Enter new password'}
                   />
                 </div>
                 
                 {mode === 'create' && (
                   <div className="space-y-2">
                     <Label htmlFor="password_confirmation">Confirm Password *</Label>
                     <Input
                       id="password_confirmation"
                       type="password"
                       value={formData.password_confirmation}
                       onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
                       placeholder="Confirm your password"
                     />
                   </div>
                 )}
               </>
             )}

                         <div className="space-y-2">
               <Label htmlFor="role">Role *</Label>
               <div className="text-xs text-muted-foreground mb-2 px-1">
                 <div className="leading-relaxed">
                   Note: Admin role cannot be assigned through this interface. Only Property Owner and Housekeeper roles are available.
                 </div>
               </div>
               <Select
                 value={formData.role}
                 onValueChange={(value: 'property_owner' | 'housekeeper') => 
                   handleInputChange('role', value)
                 }
                 disabled={mode === 'view'}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="housekeeper">Housekeeper</SelectItem>
                   <SelectItem value="property_owner">Property Owner</SelectItem>
                 </SelectContent>
               </Select>
             </div>

            {/* User Details (View Mode) */}
            {mode === 'view' && user && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="h-4 w-4 mr-2" />
                    Role
                  </div>
                  <span className="text-sm font-medium">{getRoleDisplayName(user.role)}</span>
                </div>
                
                                 <div className="flex items-center justify-between">
                   <div className="flex items-center text-sm text-gray-600">
                     <Calendar className="h-4 w-4 mr-2" />
                     Status
                   </div>
                   <span className={`text-sm font-medium ${
                     user.is_active ? 'text-green-600' : 'text-red-600'
                   }`}>
                     {user.is_active ? 'Active' : 'Inactive'}
                   </span>
                 </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Created
                  </div>
                  <span className="text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>

                {user.ownedProperties && user.ownedProperties.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-2" />
                      Owned Properties
                    </div>
                    <span className="text-sm font-medium">{user.ownedProperties.length}</span>
                  </div>
                )}

                {user.assignedProperties && user.assignedProperties.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckSquare2 className="h-4 w-4 mr-2" />
                      Assigned Properties
                    </div>
                    <span className="text-sm font-medium">{user.assignedProperties.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {mode !== 'view' && (
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
                             <Button
                 onClick={handleSubmit}
                 disabled={loading || avatarUploading}
                 className="bg-blue-600 hover:bg-blue-700"
               >
                 {loading ? (
                   <>
                     <LoadingSpinner size="sm" className="mr-2" />
                     {mode === 'create' ? 'Creating...' : 'Updating...'}
                   </>
                 ) : avatarUploading ? (
                   <>
                     <LoadingSpinner size="sm" className="mr-2" />
                     Uploading Avatar...
                   </>
                 ) : (
                   <>
                     <Save className="h-4 w-4 mr-2" />
                     {mode === 'create' ? 'Create User' : 'Update User'}
                   </>
                 )}
               </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 