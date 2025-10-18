'use client';

import * as React from 'react';
import { UserGrowthChart, UserGrowthData } from '@/components/charts/user-growth-chart';
import { ActivityChart, ActivityData } from '@/components/charts/activity-chart';
import { ContentStatsChart, ContentStatsData } from '@/components/charts/content-stats-chart';

// Mock data generators - replace with actual API calls
function generateUserGrowthData(): UserGrowthData[] {
  const data: UserGrowthData[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString(),
      totalUsers: 100 + (29 - i) * 5 + Math.floor(Math.random() * 10),
      newUsers: Math.floor(Math.random() * 15) + 5,
      activeUsers: Math.floor(Math.random() * 50) + 30,
    });
  }

  return data;
}

function generateActivityData(): ActivityData[] {
  const data: ActivityData[] = [];
  const now = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString(),
      sessions: Math.floor(Math.random() * 100) + 50,
      completions: Math.floor(Math.random() * 60) + 30,
      avgDuration: Math.floor(Math.random() * 30) + 15,
    });
  }

  return data;
}

function generateContentStatsData(): ContentStatsData[] {
  return [
    { name: 'Meditation', value: 45 },
    { name: 'Yoga', value: 32 },
    { name: 'Mindfulness', value: 28 },
    { name: 'Breathing', value: 18 },
    { name: 'Sleep', value: 22 },
  ];
}

export interface ChartsOverviewProps {
  isLoading?: boolean;
}

export function ChartsOverview({ isLoading = false }: ChartsOverviewProps) {
  const [userGrowthData, setUserGrowthData] = React.useState<UserGrowthData[]>([]);
  const [activityData, setActivityData] = React.useState<ActivityData[]>([]);
  const [contentStatsData, setContentStatsData] = React.useState<ContentStatsData[]>([]);

  React.useEffect(() => {
    // In a real app, fetch from API
    // For now, use mock data
    setUserGrowthData(generateUserGrowthData());
    setActivityData(generateActivityData());
    setContentStatsData(generateContentStatsData());
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <UserGrowthChart data={userGrowthData} isLoading={isLoading} />
      </div>

      <ActivityChart data={activityData} isLoading={isLoading} />

      <ContentStatsChart
        data={contentStatsData}
        isLoading={isLoading}
        title="Content Distribution"
        description="Breakdown by content type"
      />
    </div>
  );
}
