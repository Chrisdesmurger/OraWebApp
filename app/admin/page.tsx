'use client';

import * as React from 'react';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { RecentActivityFeed } from './_components/RecentActivityFeed';

interface DashboardStats {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalPrograms: number;
  totalLessons: number;
  totalMedia: number;
  totalMediaSizeMB: number;
  lastUpdated: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetchWithAuth('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName || user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="h-4 w-4" />}
          isLoading={loading}
        />
        <KpiCard
          title="Active Users (7d)"
          value={stats?.activeUsers7d ?? 0}
          changeLabel="last 7 days"
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={loading}
        />
        <KpiCard
          title="Total Lessons"
          value={stats?.totalLessons ?? 0}
          icon={<BookOpen className="h-4 w-4" />}
          isLoading={loading}
        />
        <KpiCard
          title="Programs"
          value={stats?.totalPrograms ?? 0}
          changeLabel="total active"
          icon={<GraduationCap className="h-4 w-4" />}
          isLoading={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <RecentActivityFeed />
        </div>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                <div className="font-medium">Create New Content</div>
                <div className="text-xs text-muted-foreground">Add meditation or yoga content</div>
              </button>
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                <div className="font-medium">Add Program</div>
                <div className="text-xs text-muted-foreground">Create a new learning program</div>
              </button>
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                <div className="font-medium">Manage Users</div>
                <div className="text-xs text-muted-foreground">View and edit user accounts</div>
              </button>
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                <div className="font-medium">View Reports</div>
                <div className="text-xs text-muted-foreground">Analytics and insights</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
