'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckSquare, Plus, ArrowLeft, AlertCircle, CheckCircle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { apiService, Property, User } from '@/lib/api';
import { cn } from '@/lib/utils';

const checklistSchema = z.object({
  property_id: z.string().min(1, 'Please select a property'),
  housekeeper_id: z.string().min(1, 'Please select a housekeeper'),
  scheduled_date: z.string().min(1, 'Please select a date'),
  scheduled_time: z.string().min(1, 'Please select a time'),
}).refine((data) => {
  // If scheduled_date is today, scheduled_time must be in the future
  const today = new Date();
  const selectedDate = new Date(data.scheduled_date);
  const selectedTime = data.scheduled_time;
  
  if (selectedDate.toDateString() === today.toDateString()) {
    const now = new Date();
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    return selectedDateTime > now;
  }
  
  return true;
}, {
  message: "Time must be in the future for today's date",
  path: ["scheduled_time"],
});

type ChecklistFormData = z.infer<typeof checklistSchema>;

export default function NewChecklistPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [housekeepers, setHousekeepers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const router = useRouter();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
  });

  const selectedPropertyId = watch('property_id');
  const selectedHousekeeperId = watch('housekeeper_id');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [propertiesResponse, usersResponse] = await Promise.all([
          apiService.getProperties(),
          apiService.getAllUsers(),
        ]);
        
        setProperties(propertiesResponse.data);
        // Filter only housekeepers
        setHousekeepers(usersResponse.data.filter((user: User) => user.role === 'housekeeper'));
      } catch (err: any) {
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setValue('scheduled_date', format(date, 'yyyy-MM-dd'));
      setCalendarOpen(false);
      
      // If today is selected, set default time to next hour
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        const nextHour = new Date();
        nextHour.setHours(today.getHours() + 1, 0, 0, 0);
        const timeString = format(nextHour, 'HH:mm');
        setSelectedTime(timeString);
        setValue('scheduled_time', timeString);
      }
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    setValue('scheduled_time', time);
  };

  const onSubmit = async (data: ChecklistFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Combine date and time into a single datetime string
      const scheduledDateTime = `${data.scheduled_date} ${data.scheduled_time}:00`;
      
      const checklistData = {
        property_id: data.property_id,
        housekeeper_id: data.housekeeper_id,
        scheduled_date: scheduledDateTime,
      };

      const response = await apiService.createChecklist(checklistData);

      if (response.data) {
        setSuccess('Checklist created successfully! Redirecting...');
        setTimeout(() => {
          router.push('/checklists');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create checklist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProperty = properties.find(p => p.id == selectedPropertyId);
  const selectedHousekeeper = housekeepers.find(h => h.id == selectedHousekeeperId);

  if (loadingData) {
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

  return (
    <ProtectedRoute roles={['admin', 'property_owner']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/checklists">
                <ArrowLeft className="h-10 w-10 mr-2" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Checklist</h1>
                <p className="text-gray-600">Schedule a cleaning task for your property</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckSquare className="h-5 w-5 mr-2" />
                    Checklist Information
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
                    {/* Property Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="property_id">Property *</Label>
                      <Select onValueChange={(value) => setValue('property_id', value)}>
                        <SelectTrigger className="transition-all duration-200 focus:ring-1 focus:ring-blue-500">
                          <SelectValue placeholder="Select a property" > {selectedProperty?.name} </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div>
                                <div className="font-medium">{property.name}</div>
                                <div className="text-sm text-gray-500">{property.address}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.property_id && (
                        <p className="text-sm text-red-600">{errors.property_id.message}</p>
                      )}
                    </div>

                    {/* Housekeeper Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="housekeeper_id">Housekeeper *</Label>
                      <Select onValueChange={(value) => setValue('housekeeper_id', value)}>
                        <SelectTrigger className="transition-all duration-200 focus:ring-1 focus:ring-blue-500">
                          <SelectValue placeholder="Select a housekeeper" > {selectedHousekeeper?.name} </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {housekeepers.map((housekeeper) => (
                            <SelectItem key={housekeeper.id} value={housekeeper.id}>
                              <div>
                                <div className="font-medium">{housekeeper.name}</div>
                                <div className="text-sm text-gray-500">{housekeeper.email}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.housekeeper_id && (
                        <p className="text-sm text-red-600">{errors.housekeeper_id.message}</p>
                      )}
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_date">Scheduled Date *</Label>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-1 focus:ring-blue-500",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.scheduled_date && (
                        <p className="text-sm text-red-600">{errors.scheduled_date.message}</p>
                      )}
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_time">Scheduled Time *</Label>
                      <input
                        type="time"
                        id="scheduled_time"
                        value={selectedTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min={selectedDate && selectedDate.toDateString() === new Date().toDateString() 
                          ? new Date().toTimeString().slice(0, 5) 
                          : undefined}
                      />
                      {errors.scheduled_time && (
                        <p className="text-sm text-red-600">{errors.scheduled_time.message}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4 pt-6 border-t">
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Creating Checklist...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Checklist
                          </>
                        )}
                      </Button>
                      <Link href="/checklists">
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
              {/* Selection Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Selected Property</h4>
                    {selectedProperty ? (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-900">{selectedProperty.name}</p>
                        <p className="text-sm text-blue-600">{selectedProperty.address}</p>
                        <p className="text-sm text-blue-600">{selectedProperty.city}, {selectedProperty.state}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No property selected</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Selected Housekeeper</h4>
                    {selectedHousekeeper ? (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-900">{selectedHousekeeper.name}</p>
                        <p className="text-sm text-green-600">{selectedHousekeeper.email}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No housekeeper selected</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Scheduled Date & Time</h4>
                    {selectedDate ? (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="font-medium text-purple-900">{format(selectedDate, "PPP")}</p>
                        <p className="text-sm text-purple-600">{format(selectedDate, "EEEE")}</p>
                        {selectedTime && (
                          <p className="text-sm text-purple-600 mt-1">
                            Time: {selectedTime}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No date selected</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">What happens next?</p>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Tasks will be automatically generated based on property rooms</li>
                      <li>• The housekeeper will receive a notification</li>
                      <li>• You can track progress in real-time</li>
                      <li>• Review and rate the work once completed</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {properties.length > 0 && housekeepers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Available Properties:</span>
                      <span className="text-sm font-medium text-gray-900">{properties.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Available Housekeepers:</span>
                      <span className="text-sm font-medium text-gray-900">{housekeepers.length}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}