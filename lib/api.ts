import { AuthResponse, LoginData, RegisterData, ResetPasswordData, removeAuthToken } from './auth';

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://clean.track.thethemeai.com/api';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://cleantrack.test/api';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
}

export interface Property {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  image?: string;
  image_url?: string;
  amenities?: string[];
  created_at: string;
  updated_at: string;
  rooms?: Room[];
  housekeepers?: User[];
  rooms_count?: number;
  tasks_count?: number;
}

// Lightweight property interface for select options
export interface PropertyOption {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type?: string;
  is_default: boolean;
  is_system_default: boolean;
  is_active: boolean;
  order?: number;
  property_id?: string; // Add property_id field for form handling
  task_ids?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
  creator?: {
    id: string;
    name: string;
    role: string;
  };
  property?: {
    id: string;
    name: string;
  };
  is_created_by_admin?: boolean;
  creator_name?: string;
  pivot?: {
    property_id: string;
    order: number;
    is_active: boolean;
    requires_photo?: boolean;
    photos_required_count?: number;
  };
}

export interface RoomStats {
  total_rooms: number;
  active_rooms: number;
  default_rooms: number;
  custom_rooms: number;
  rooms_by_type: Record<string, number>;
}

export interface RoomFilters {
  is_active?: boolean;
  search?: string;
  created_from?: string;
  created_to?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at';
  sort_direction?: 'asc' | 'desc';
  per_page?: number;
  owner_id?: string; // Filter rooms by property owner
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'property_owner' | 'housekeeper';
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ownedProperties?: Property[];
  assignedProperties?: Property[];
}

export interface Checklist {
  id: string;
  property_id: string;
  housekeeper_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'reviewed';
  rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
  housekeeper?: User;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  task_id: string;
  room_id: string; // room that the item belongs to
  completed: boolean;
  notes?: string;
  photo?: string; // Single photo for backward compatibility
  photo_url?: string; // Single photo URL for backward compatibility
  photos?: Array<{
    path: string;
    uploaded_at: string;
  }>; // Multiple photo paths with upload timestamps
  photo_urls?: string[]; // Multiple photo URLs
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  requires_photo: boolean;
  is_default?: boolean;
  order?: number;
  is_active?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  rooms?: Room[];
  room_name?: string; // Added for property details page
  room_id?: string; // Added for property details page
  creator?: {
    id: string;
    name: string;
    role: string;
  };
  is_created_by_admin?: boolean;
  creator_name?: string;
}

export interface DashboardStats {
  total_properties: number;
  active_users?: number;
  completed_tasks?: number;
  pending_tasks?: number;
  completion_rate?: number;
  average_rating?: number;
  active_checklists?: number;
  team_members?: number;
  this_month?: number;
  total_tasks?: number;
  tasks_today?: number;
  active_staff?: number;
  completed_today?: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'property_owner' | 'housekeeper';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: 'property_owner' | 'housekeeper';
}

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
      endpoint: string,
      options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const body = isJson ? await response.json().catch(() => null) : null;

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          // Clear token and user data, then redirect
          try { removeAuthToken(); } catch {}
          window.location.href = '/login';
        }
        console.error('Unauthenticated:', body?.message || '401 Unauthorized');
      }

      if (!response.ok) {
        const message = body?.message || `HTTP error! status: ${response.status}`;
        // Attach response body to error for callers to display extra details
        const error: any = new Error(message);
        error.status = response.status;
        error.data = body;
        throw error;
      }

      return {
        data: body?.data || body,
        message: body?.message,
        status: response.status,
      };
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }



  // Auth endpoints
  async login(credentials: LoginData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/password/email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyToken(email: string, token: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/password/verify-token', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    });
  }

  async resetPassword(data: ResetPasswordData): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.request<User>('/me');
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  async getDashboardOverview(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/overview');
  }

  async getRecentActivity(): Promise<ApiResponse<ActivityItem[]>> {
    return this.request<ActivityItem[]>('/dashboard/recent-activity');
  }

  // Property endpoints
  async getProperties(page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Property>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/properties?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getProperty(id: string): Promise<ApiResponse<Property>> {
    return this.request<Property>(`/properties/${id}`);
  }

  async getPropertyOptions(): Promise<ApiResponse<PropertyOption[]>> {
    return this.request<PropertyOption[]>('/properties/options');
  }


  async createProperty(data: any): Promise<ApiResponse<Property>> {
    const headers = this.getAuthHeaders();

    return this.request<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
  }


  async updateProperty(id: string, data: any): Promise<ApiResponse<Property>> {
    const headers = this.getAuthHeaders();
    headers['Content-Type'] = 'application/json'; // Set correct content-type for JSON

    return this.request<Property>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers,
    });
  }

  async deleteProperty(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/properties/${id}`, {
      method: 'DELETE',
    });
  }

  async assignHousekeeper(propertyId: string, housekeeperId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/properties/${propertyId}/assign-housekeeper`, {
      method: 'POST',
      body: JSON.stringify({ housekeeper_id: housekeeperId }),
    });
  }

  async removeHousekeeper(propertyId: string, housekeeperId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/properties/${propertyId}/remove-housekeeper`, {
      method: 'DELETE',
      body: JSON.stringify({ housekeeper_id: housekeeperId }),
    });
  }

  // Checklist endpoints
  async getChecklists(page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Checklist>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/checklists?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getChecklist(id: string): Promise<ApiResponse<Checklist>> {
    return this.request<Checklist>(`/checklists/${id}`);
  }

  async createChecklist(data: {
    property_id: string;
    housekeeper_id: string;
    scheduled_date: string;
  }): Promise<ApiResponse<Checklist>> {
    return this.request<Checklist>('/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startChecklist(
    checklistId: string,
    coords?: { latitude: number; longitude: number }
  ): Promise<ApiResponse<Checklist>> {
    return this.request<Checklist>(`/checklists/${checklistId}/start`, {
      method: 'POST',
      body: coords ? JSON.stringify(coords) : undefined,
      headers: coords ? { 'Content-Type': 'application/json' } : undefined,
    });
  }

  async completeChecklist(checklistId: string): Promise<ApiResponse<Checklist>> {
    return this.request<Checklist>(`/checklists/${checklistId}/complete`, {
      method: 'POST',
    });
  }

  async reviewChecklist(
    checklistId: string,
    data: { rating?: number; notes?: string }
  ): Promise<ApiResponse<Checklist>> {
    return this.request<Checklist>(`/checklists/${checklistId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }

  async updateChecklistItem(
      checklistId: string,
      checklistItemId: string,
      data: { completed: boolean; notes?: string; photos?: File[] }
  ): Promise<ApiResponse<ChecklistItem>> {
    const photoBase64Array: string[] = [];

    if (data.photos && data.photos.length > 0) {
      for (const photo of data.photos) {
        const photoBase64 = await this.fileToBase64(photo);
        photoBase64Array.push(photoBase64);
      }
    }

    const payload: any = {
      completed: data.completed,
    };

    if (data.notes) payload.notes = data.notes;
    if (photoBase64Array.length > 0) payload.photos = photoBase64Array;

    const headers = {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json',
    };

    return this.request<ChecklistItem>(`/checklists/${checklistId}/items/${checklistItemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers,
    });
  }


  async getChecklistsByDate(date: string, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Checklist>> {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/checklists?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getChecklistsByStatus(status: string, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Checklist>> {
    const params = new URLSearchParams();
    params.append('status', status);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/checklists?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getTodayTasks(page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Checklist>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/today-tasks?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // User endpoints
  async getUsers(page: number = 1, perPage: number = 20, filters?: any): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/users?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get all users without pagination (for dropdowns, etc.)
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users/all');
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(data: CreateUserData): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

    async updateUser(id: string, data: UpdateUserData): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(userId: string, avatarFile: File): Promise<ApiResponse<{ avatar_url: string }>> {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const headers = this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set content-type for FormData

    return this.request<{ avatar_url: string }>(`/users/${userId}/avatar`, {
      method: 'POST',
      body: formData,
      headers,
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Profile endpoints
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/profile');
  }

  async updateProfile(data: {
    name: string;
    email: string;
    avatar?: string;
  }): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleUserStatus(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}/toggle-status`, {
      method: 'POST',
    });
  }



  // Room endpoints
  async getRooms(filters?: RoomFilters, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Room>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/rooms?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getRoom(id: string): Promise<ApiResponse<Room>> {
    return this.request<Room>(`/rooms/${id}`);
  }

  async createRoom(data: {
    name: string;
    description?: string;
    property_id?: string;
    is_default?: boolean;
    task_ids?: string[];
  }): Promise<ApiResponse<Room>> {
    return this.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSystemDefaultRoom(data: {
    name: string;
    description?: string;
    type?: string;
    order?: number;
    is_active?: boolean;
    task_ids?: string[];
  }): Promise<ApiResponse<Room>> {
    return this.request<Room>('/rooms/create-system-default', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRoom(id: string, data: {
    name?: string;
    description?: string;
    property_id?: string;
    is_default?: boolean;
    is_active?: boolean;
    task_ids?: string[];
  }): Promise<ApiResponse<Room>> {
    return this.request<Room>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRoom(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoomTypes(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/rooms/types');
  }

  async getRoomStats(): Promise<ApiResponse<RoomStats>> {
    return this.request<RoomStats>('/room-stats');
  }

  async getSystemDefaultRooms(): Promise<ApiResponse<Room[]>> {
    return this.request<Room[]>('/system-default-rooms');
  }

  async toggleSystemDefault(roomId: string): Promise<ApiResponse<Room>> {
    return this.request<Room>(`/rooms/${roomId}/toggle-system-default`, {
      method: 'POST',
    });
  }

  async getOwners(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/users/owners');
  }

  async getPropertiesByOwner(ownerId: string): Promise<ApiResponse<Property[]>> {
    return this.request<Property[]>(`/properties/by-owner/${ownerId}`);
  }

  // New: room suggestions for inline tag input
  async suggestRooms(q: string): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<Array<{ id: string; name: string }>>(`/rooms/suggest${query}`);
  }

  // Task endpoints
  async getTasks(propertyId: string, page: number = 1, perPage: number = 20, search?: string): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    params.append('property_id', propertyId);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    if (search && search.trim()) {
      params.append('search', search.trim());
    }

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/tasks?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getAllTasks(filters?: any, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/tasks?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async createTask(data: {
    title: string;
    description?: string;
    estimated_time: number;
    requires_photo: boolean;
    room_ids: string[];
    is_default?: boolean;
    order?: number;
    is_active?: boolean;
  }): Promise<ApiResponse<Task>> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: {
    title: string;
    description?: string;
    estimated_time: number;
    requires_photo: boolean;
    room_ids?: string[];
    is_default?: boolean;
    order?: number;
    is_active?: boolean;
  }): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async searchTasks(params: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<Task[]>> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('q', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    const queryString = queryParams.toString();
    const url = queryString ? `/tasks/search?${queryString}` : '/tasks/search';
    return this.request<Task[]>(url);
  }

  // Add method to get rooms for a specific property with pagination and search
  async getRoomsForProperty(
    propertyId: string,
    page: number = 1,
    perPage: number = 20,
    search?: string
  ): Promise<PaginatedResponse<Room>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    if (search && search.trim()) {
      params.append('search', search.trim());
    }

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/properties/${propertyId}/rooms?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get tasks for a specific property
  async getTasksForProperty(propertyId: string, page: number = 1, perPage: number = 20, search?: string): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    if (search && search.trim()) {
      params.append('search', search.trim());
    }

    // For paginated responses, we need to get the raw response
    const url = `${API_BASE_URL}/properties/${propertyId}/tasks?${params.toString()}`;
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return body; // Return the entire paginated response
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // New: bulk attach rooms to a property (crowdsourced create)
  async bulkAttachRooms(propertyId: string, names: string[]): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    return this.request<Array<{ id: string; name: string }>>(`/properties/${propertyId}/rooms/bulk-attach`, {
      method: 'POST',
      body: JSON.stringify({ names }),
    });
  }

  // New: update per-room photo requirements on pivot
  async updateRoomRequirements(
    propertyId: string,
    roomId: string,
    requiresPhoto: boolean,
    photosRequiredCount: number
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/properties/${propertyId}/rooms/${roomId}/requirements`, {
      method: 'PUT',
      body: JSON.stringify({
        requires_photo: requiresPhoto,
        photos_required_count: photosRequiredCount,
      }),
    });
  }
}

export const apiService = new ApiService();
