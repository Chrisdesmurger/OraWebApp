'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, BookOpen, TrendingUp, Clock } from 'lucide-react';

interface StatsData {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  content: {
    total: number;
    published: number;
    drafts: number;
    growth: number;
  };
  engagement: {
    totalSessions: number;
    avgDuration: number;
    completionRate: number;
  };
  programs: {
    total: number;
    active: number;
    enrollments: number;
  };
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Users"
            value={stats?.users.total ?? 0}
            change={stats?.users.growth}
            changeLabel="vs last month"
            icon={<Users className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Active Users"
            value={stats?.users.active ?? 0}
            changeLabel="this month"
            icon={<TrendingUp className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="New Users"
            value={stats?.users.newThisMonth ?? 0}
            changeLabel="this month"
            icon={<Users className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Avg Session"
            value={stats?.engagement.avgDuration ? `${stats.engagement.avgDuration}m` : '0m'}
            changeLabel="average duration"
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
            title="Total Content"
            value={stats?.content.total ?? 0}
            change={stats?.content.growth}
            changeLabel="vs last month"
            icon={<BookOpen className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Published"
            value={stats?.content.published ?? 0}
            changeLabel="available to users"
            icon={<BookOpen className="h-4 w-4" />}
            isLoading={loading}
          />
          <KpiCard
            title="Drafts"
            value={stats?.content.drafts ?? 0}
            changeLabel="in progress"
            icon={<BookOpen className="h-4 w-4" />}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Engagement Statistics */}
      {canViewAdvanced && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Engagement Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.engagement.totalSessions.toLocaleString() ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.engagement.completionRate ?? 0}%
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Program Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.programs.enrollments ?? 0}
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
