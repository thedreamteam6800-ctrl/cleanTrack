'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  CheckSquare,
  Home,
  Users,
  User,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  DoorOpen,
  ListTodo
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Properties',
    href: '/properties',
    icon: Building2,
    roles: ['admin', 'property_owner'],
  },
  {
    title: 'Rooms',
    href: '/rooms',
    icon: DoorOpen,
    roles: ['admin'], // Only admins can access global rooms page
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: ListTodo,
    roles: ['admin', 'property_owner'],
  },
  {
    title: 'Checklists',
    href: '/checklists',
    icon: CheckSquare,
  },
  {
    title: 'Today\'s Tasks',
    href: '/today-tasks',
    icon: Calendar,
    roles: ['housekeeper'],
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'My Profile',
    href: '/profile',
    icon: User,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  return (
    <div className={cn(
      'relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-xl text-gray-900">CleanTrack</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className={cn('h-5 w-5', collapsed ? '' : 'mr-3')} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed && user && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className={cn('h-5 w-5', collapsed ? '' : 'mr-3')} />
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );
}
