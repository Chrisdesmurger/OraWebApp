'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, BookOpen, TrendingUp, Clock } from 'lucide-react';

interface StatsData {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalPrograms: number;
  totalLessons: number;
  totalMedia: number;
  totalMediaSizeMB: number;
  lastUpdated: string;
}

export default function StatsPage() {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const canView = currentUser?.role && hasPermission(currentUser.role, 'canViewStats');
  const canViewAdvanced = currentUser?.role && hasPermission(currentUser.role, 'canViewAdvancedStats');

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetchWithAuth('/api/stats');

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[admin/stats] Failed to fetch stats:', error);
        }
      } catch (error) {
        console.error('[admin/stats] Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (canView) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [canView]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground">Platform analytics and insights</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to view statistics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground">Platform analytics and insights</p>
      </div>

      {/* User Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">User Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={<Users className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Active (7d)"
            value={stats?.activeUsers7d ?? 0}
            changeLabel="last 7 days"
            icon={<TrendingUp className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Active (30d)"
            value={stats?.activeUsers30d ?? 0}
            changeLabel="last 30 days"
            icon={<Clock className="h-4 w-4" />}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Content Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Content Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Total Programs"
            value={stats?.totalPrograms ?? 0}
            icon={<BookOpen className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Total Lessons"
            value={stats?.totalLessons ?? 0}
            icon={<BookOpen className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Media Files"
            value={stats?.totalMedia ?? 0}
            icon={<BookOpen className="h-4 w-4" />}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Storage Statistics */}
      {canViewAdvanced && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Storage Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-2xl font-bold">
                    {((stats?.totalMediaSizeMB ?? 0) / 1024).toFixed(2)} GB
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Charts placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth Over Time</CardTitle>
          <CardDescription>Monthly user registration trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Chart visualization coming soon</p>
              <p className="text-sm mt-2">
                Integration with recharts for detailed analytics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
