'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, setAuthToken, getAuthToken, removeAuthToken, setUserData, getUserData, getRoleRedirectPath } from '@/lib/auth';
import { apiService } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    const userData = getUserData();

    if (token && userData) {
      setUser(userData);
      // Optionally verify token with server
      apiService.getMe().then(
        (response) => {
          setUser(response.data);
          setUserData(response.data);
        },
        (error) => {
          console.error('Failed to verify token:', error);
          removeAuthToken();
          setUser(null);
        }
      );
    }

    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    setAuthToken(token);
    setUserData(userData);
    setUser(userData);
    router.push(getRoleRedirectPath(userData.role));
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeAuthToken();
      setUser(null);
      router.push('/login');
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    setUserData(userData);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}