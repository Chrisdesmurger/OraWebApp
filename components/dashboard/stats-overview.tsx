'use client';

import * as React from 'react';
import { Users, Activity, BookOpen, Film, Database, Clock } from 'lucide-react';
import { KpiCard } from '@/components/kpi-card';
import { useStats } from '@/lib/hooks/use-stats';

export function StatsOverview() {
  const { stats, isLoading, error } = useStats();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        Error loading stats: {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        title="Total Users"
        value={isLoading ? '...' : stats?.totalUsers.toLocaleString() || '0'}
        icon={<Users className="h-4 w-4" />}
        isLoading={isLoading}
      />

      <KpiCard
        title="Active Users (7d)"
        value={isLoading ? '...' : stats?.activeUsers7d.toLocaleString() || '0'}
        icon={<Activity className="h-4 w-4" />}
        isLoading={isLoading}
      />

      <KpiCard
        title="Active Users (30d)"
        value={isLoading ? '...' : stats?.activeUsers30d.toLocaleString() || '0'}
        icon={<Clock className="h-4 w-4" />}
        isLoading={isLoading}
      />

      <KpiCard
        title="Total Programs"
        value={isLoading ? '...' : stats?.totalPrograms.toLocaleString() || '0'}
        icon={<BookOpen className="h-4 w-4" />}
        isLoading={isLoading}
      />

      <KpiCard
        title="Total Lessons"
        value={isLoading ? '...' : stats?.totalLessons.toLocaleString() || '0'}
        icon={<BookOpen className="h-4 w-4" />}
        isLoading={isLoading}
      />

      <KpiCard
        title="Media Files"
        value={isLoading ? '...' : stats?.totalMedia.toLocaleString() || '0'}
        icon={<Film className="h-4 w-4" />}
        isLoading={isLoading}
      />

      <KpiCard
        title="Storage Used"
        value={
          isLoading
            ? '...'
            : stats
            ? `${(stats.totalMediaSizeMB / 1024).toFixed(2)} GB`
            : '0 GB'
        }
        icon={<Database className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
}
