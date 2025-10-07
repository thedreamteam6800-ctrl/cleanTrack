import { NextResponse } from 'next/server';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'property_owner' | 'housekeeper';
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'admin' | 'property_owner' | 'housekeeper';
}

export interface ResetPasswordData {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export const setUserData = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getUserData = (): User | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const getRoleRedirectPath = (role: User['role']): string => {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'property_owner':
      return '/dashboard';
    case 'housekeeper':
      return '/today-tasks';
    default:
      return '/dashboard';
  }
};