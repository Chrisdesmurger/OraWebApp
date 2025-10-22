'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Terminal,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: 'canViewUsers',
  },
  {
    title: 'Content',
    href: '/admin/content',
    icon: BookOpen,
    permission: 'canViewContent',
  },
  {
    title: 'Programs',
    href: '/admin/programs',
    icon: GraduationCap,
    permission: 'canViewPrograms',
  },
  {
    title: 'Commands',
    href: '/admin/commands',
    icon: Terminal,
    permission: 'canRunCommands',
  },
  {
    title: 'Stats',
    href: '/admin/stats',
    icon: BarChart3,
    permission: 'canViewStats',
  },
];

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const filteredNavItems = React.useMemo(() => {
    if (!user?.role) return navItems.filter((item) => !item.permission);

    return navItems.filter((item) => {
      if (!item.permission) return true;
      // user.role is guaranteed to exist here because of the guard above
      return hasPermission(user.role!, item.permission as any);
    });
  }, [user?.role]);

  const NavContent = () => (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <div className="mb-2 flex items-center px-4">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
          <h2 className="ml-3 text-lg font-semibold tracking-tight">Ora Admin</h2>
        </div>
        <div className="space-y-1 mt-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 text-orange-900 dark:text-orange-50'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 transform border-r bg-background transition-transform duration-300 ease-in-out lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className={cn('hidden lg:block w-64 border-r bg-background', className)}>
        <div className="sticky top-0 h-screen overflow-y-auto">
          <NavContent />
        </div>
      </aside>
    </>
  );
}
