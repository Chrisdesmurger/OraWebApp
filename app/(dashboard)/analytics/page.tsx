import * as React from 'react';
import { StatsOverview } from '@/components/dashboard/stats-overview';
import { ChartsOverview } from '@/components/dashboard/charts-overview';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor user growth, activity, and content performance
        </p>
      </div>

      <StatsOverview />

      <ChartsOverview />
    </div>
  );
}
