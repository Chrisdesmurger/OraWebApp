'use client';

import * as React from 'react';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  totalPrograms: number;
  userGrowth: number;
  contentGrowth: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
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
          change={stats?.userGrowth}
          changeLabel="vs last month"
          icon={<Users className="h-4 w-4" />}
          isLoading={loading}
        />
        <KpiCard
          title="Active Users"
          value={stats?.activeUsers ?? 0}
          changeLabel="this month"
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={loading}
        />
        <KpiCard
          title="Content Items"
          value={stats?.totalContent ?? 0}
          change={stats?.contentGrowth}
          changeLabel="vs last month"
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
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user interactions and content updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity to display</p>
                  <p className="text-sm mt-2">Activity feed will appear here once users interact with the platform</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
