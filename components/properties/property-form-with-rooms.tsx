'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, X, Upload, AlertCircle, User } from 'lucide-react';
import { RoomSelectionCard } from '@/components/rooms/room-selection-card';
import { apiService, User as UserType } from '@/lib/api';
import { useDebounce } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const propertySchema = z.object({
  name: z.string().min(2, 'Property name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  zip_code: z.string().min(4, 'ZIP code must be at least 5 characters'),
  country: z.string().min(2, 'Country must be at least 2 characters'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  owner_id: z.number().optional(),
}).refine((data) => {
  // For admin users, owner_id is required
  // For non-admin users, owner_id is not needed (will be set to current user)
  return true; // We'll handle validation in the component
}, {
  message: "Property owner is required for admin users",
  path: ["owner_id"],
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormWithRoomsProps {
  mode: 'create' | 'edit';
  initialData?: any;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PropertyFormWithRooms({ 
  mode, 
  initialData, 
  onSuccess,
  onError
}: PropertyFormWithRoomsProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities || []);
  const [newAmenity, setNewAmenity] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(initialData?.room_ids || []);
  const [propertyOwners, setPropertyOwners] = useState<UserType[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(initialData?.owner_id || '');
  // New: inline tag input state for additional rooms
  const [roomChips, setRoomChips] = useState<string[]>([]);
  const [roomInput, setRoomInput] = useState('');
  const [roomSuggestion, setRoomSuggestion] = useState<string>('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debouncedQuery = useDebounce(roomInput, 300);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      ...initialData,
      owner_id: initialData?.owner_id || '',
      latitude: initialData?.latitude?.toString?.() || '',
      longitude: initialData?.longitude?.toString?.() || '',
    },
  });

  // Fetch property owners if user is admin
  useEffect(() => {
    const fetchPropertyOwners = async () => {
      if (user?.role === 'admin') {
        setLoadingOwners(true);
        try {
          const response = await apiService.getAllUsers();
          // Filter for property owners only
          const owners = response.data.filter((user: UserType) => user.role === 'property_owner' && user.is_active);
          setPropertyOwners(owners);
        } catch (err) {
          console.error('Failed to fetch property owners:', err);
        } finally {
          setLoadingOwners(false);
        }
      }
    };

    fetchPropertyOwners();
  }, [user?.role]);

  // Update form value when owner selection changes
  useEffect(() => {
    setValue('owner_id', selectedOwnerId ? parseInt(selectedOwnerId) : undefined);
  }, [selectedOwnerId, setValue]);

  // Clear selected rooms when owner changes
  useEffect(() => {
    if (user?.role === 'admin') {
      setSelectedRoomIds([]);
    }
  }, [selectedOwnerId, user?.role]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !amenities.includes(newAmenity.trim())) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setAmenities(amenities.filter(a => a !== amenity));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const onSubmit = async (data: PropertyFormData) => {
    setIsLoading(true);
    setError(null);

    // Validate owner selection for admin users only
    if (user?.role === 'admin' && !selectedOwnerId) {
      setError('Please select a property owner.');
      setIsLoading(false);
      return;
    }

    try {
      let imageBase64: string | null = null;
      if (selectedImage) {
        imageBase64 = await fileToBase64(selectedImage);
      }

      const payload = {
        ...data,
        image: imageBase64,
        amenities,
        room_ids: selectedRoomIds,
        // Include owner_id for all users
        owner_id: user?.role === 'admin' ? selectedOwnerId : user?.id,
      };

      if (mode === 'create') {
        const createRes = await apiService.createProperty(payload);
        // After create, optionally attach additional rooms from chips
        const createdProperty = createRes.data as any;
        if (createdProperty?.id && roomChips.length > 0) {
          const distinctNames = Array.from(new Set(roomChips.map(normalizeName)));
          await apiService.bulkAttachRooms(createdProperty.id, distinctNames);
        }
      } else {
        await apiService.updateProperty(initialData.id, payload);
      }

      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err.message || `Failed to ${mode} property.`;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize helper: trim, collapse spaces, Title Case for display
  const normalizeName = (name: string) => {
    const collapsed = name.replace(/\s+/g, ' ').trim();
    // Title Case simple
    return collapsed
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Debounce suggest fetch
  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      setSuggestLoading(true);
      try {
        const res = await apiService.suggestRooms(debouncedQuery);
        if (!isCancelled) {
          const list = res.data || [];
          const best = list[0]?.name || '';
          setRoomSuggestion(best);
        }
      } catch (e) {
        if (!isCancelled) setRoomSuggestion('');
      } finally {
        if (!isCancelled) setSuggestLoading(false);
      }
    };
    if (debouncedQuery) {
      run();
    } else {
      setRoomSuggestion('');
    }
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Property Details */}
      <div className="space-y-6">
        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                placeholder="Enter property name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your property..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Property Owner Selection - Admin Only */}
            {user?.role === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="owner_id">Property Owner *</Label>
                {loadingOwners ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-500">Loading property owners...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedOwnerId}
                    onValueChange={setSelectedOwnerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyOwners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{owner.name}</span>
                            <span className="text-gray-500">({owner.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.owner_id && (
                  <p className="text-sm text-red-600">{errors.owner_id.message}</p>
                )}
                {propertyOwners.length === 0 && !loadingOwners && (
                  <p className="text-sm text-yellow-600">
                    No active property owners found. Please create property owner accounts first.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                placeholder="Enter street address"
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  {...register('city')}
                />
                {errors.city && (
                  <p className="text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  placeholder="Enter state"
                  {...register('state')}
                />
                {errors.state && (
                  <p className="text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP/Postal Code *</Label>
                <Input
                  id="zip_code"
                  placeholder="Enter ZIP code"
                  {...register('zip_code')}
                />
                {errors.zip_code && (
                  <p className="text-sm text-red-600">{errors.zip_code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="Enter country"
                  {...register('country')}
                />
                {errors.country && (
                  <p className="text-sm text-red-600">{errors.country.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude (optional)</Label>
                <Input
                  id="latitude"
                  placeholder="e.g. 40.7128"
                  {...register('latitude')}
                />
                <p className="text-xs text-gray-500">Used to verify location when starting checklists.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude (optional)</Label>
                <Input
                  id="longitude"
                  placeholder="e.g. -74.0060"
                  {...register('longitude')}
                />
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setValue('latitude', pos.coords.latitude.toFixed(7));
                      setValue('longitude', pos.coords.longitude.toFixed(7));
                    },
                    () => {},
                    { enableHighAccuracy: true, timeout: 8000 }
                  );
                }}
              >
                Use my current location
              </Button>
            </div>

            {/* Map Preview */}
            {(() => {
              const lat = parseFloat((watch('latitude') as any) || '');
              const lng = parseFloat((watch('longitude') as any) || '');
              const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
              if (!hasCoords) return null;
              const mapSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
              const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
              return (
                <div className="space-y-2">
                  <Label>Location Preview</Label>
                  <div className="w-full h-64 border rounded-md overflow-hidden">
                    <iframe
                      src={mapSrc}
                      className="w-full h-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Property Image */}
        <Card>
          <CardHeader>
            <CardTitle>Property Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Upload an image or drag and drop
              </p>
              <p className="text-xs text-gray-500 mb-4">
                PNG, JPG, GIF up to 10MB
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="max-w-xs mx-auto"
              />
            </div>
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Property preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-4">
              <Input
                placeholder="Add amenity"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAmenity()}
              />
              <Button onClick={addAmenity} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="flex items-center">
                  {amenity}
                  <button
                    onClick={() => removeAmenity(amenity)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create Property' : 'Update Property'}
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Right Column - Room Selection */}
      <div>
        {/* Assign Rooms section */}
        <Card>
          <CardHeader>
            <CardTitle>Assign Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Select rooms to assign to this property. Default rooms will be automatically included.
            </p>
            <RoomSelectionCard
              selectedRoomIds={selectedRoomIds}
              onRoomSelectionChange={setSelectedRoomIds}
              title=""
              description=""
              showPhotoRequirements={true}
              lockDefaultRooms={false}
              ownerId={user?.role === 'admin' ? selectedOwnerId : user?.id?.toString()}
            />
          </CardContent>
        </Card>

        {/* Add Custom Rooms section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add Custom Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Add custom room names that will be created for this property. These are in addition to the selected rooms above.
            </p>
            <div
              className="flex flex-wrap gap-2 min-h-[40px] px-3 py-2 border border-input bg-background rounded-md text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              onClick={() => document.getElementById('room-inline-input')?.focus()}
            >
              {roomChips.map((chip, idx) => (
                <Badge key={`${chip}-${idx}`} variant="secondary" className="flex items-center gap-1">
                  {chip}
                  <button
                    type="button"
                    onClick={() => setRoomChips(prev => prev.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${chip}`}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="relative flex-1 min-w-[160px]">
                <input
                  id="room-inline-input"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' || e.key === 'ArrowRight') {
                      if (roomSuggestion && roomSuggestion.toLowerCase().startsWith(roomInput.toLowerCase())) {
                        e.preventDefault();
                        setRoomInput(roomSuggestion);
                      }
                    } else if (e.key === 'Enter' && roomInput.trim()) {
                      e.preventDefault();
                      // Use suggestion if available and input matches the beginning of suggestion
                      const valueToAdd = roomSuggestion && roomSuggestion.toLowerCase().startsWith(roomInput.toLowerCase()) 
                        ? roomSuggestion 
                        : roomInput;
                      const normalized = normalizeName(valueToAdd);
                      setRoomChips(prev => (prev.includes(normalized) ? prev : [...prev, normalized]));
                      setRoomInput('');
                      setRoomSuggestion('');
                    } else if (e.key === 'Backspace' && !roomInput && roomChips.length > 0) {
                      setRoomChips(prev => prev.slice(0, -1));
                    }
                  }}
                  placeholder={roomSuggestion ? "Press Enter to accept suggestion or keep typing…" : "Type a room and press Enter…"}
                  className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                  aria-describedby="room-inline-suggestion"
                />
                {/* Inline ghost suggestion */}
                {roomInput && roomSuggestion && roomSuggestion.toLowerCase().startsWith(roomInput.toLowerCase()) && (
                  <div id="room-inline-suggestion" aria-label="suggestion" className="pointer-events-none absolute inset-0 text-muted-foreground">
                    <span className="invisible">{roomInput}</span>
                    <span className="opacity-40">{roomSuggestion.slice(roomInput.length)}</span>
                  </div>
                )}
              </div>
            </div>
            {suggestLoading && <div className="text-xs text-gray-500 mt-1">Searching…</div>}
            {roomInput && roomSuggestion && roomSuggestion.toLowerCase().startsWith(roomInput.toLowerCase()) && !suggestLoading && (
              <div className="text-xs text-blue-600 mt-1">
                💡 Press Enter to accept "{roomSuggestion}" or keep typing
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 