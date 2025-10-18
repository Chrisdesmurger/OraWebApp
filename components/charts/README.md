# Ora Analytics Charts

This directory contains reusable chart components for the Ora Admin dashboard, built with Recharts.

## Components

### KPI Card (`/components/kpi-card.tsx`)

Display key performance indicators with optional trend indicators.

```tsx
import { KpiCard } from '@/components/kpi-card';
import { Users } from 'lucide-react';

<KpiCard
  title="Total Users"
  value={1234}
  change={12.5}
  changeLabel="vs last month"
  icon={<Users className="h-4 w-4" />}
  isLoading={false}
/>
```

**Props:**
- `title` (string): Card title
- `value` (string | number): Main value to display
- `change?` (number): Percentage change (shows trend icon)
- `changeLabel?` (string): Label for change metric (default: "vs last period")
- `icon?` (ReactNode): Icon to display in header
- `isLoading?` (boolean): Show loading skeleton
- `className?` (string): Additional CSS classes

### User Growth Chart (`/components/charts/user-growth-chart.tsx`)

Line chart showing user growth metrics over time.

```tsx
import { UserGrowthChart } from '@/components/charts/user-growth-chart';

const data = [
  {
    date: '2025-10-01',
    totalUsers: 100,
    newUsers: 15,
    activeUsers: 45,
  },
  // ... more data
];

<UserGrowthChart data={data} isLoading={false} />
```

**Props:**
- `data` (UserGrowthData[]): Array of data points
- `isLoading?` (boolean): Show loading state
- `className?` (string): Additional CSS classes

**Data Format:**
```typescript
interface UserGrowthData {
  date: string;        // ISO date string
  totalUsers: number;  // Cumulative users
  newUsers: number;    // New users on this date
  activeUsers: number; // Active users on this date
}
```

### Activity Chart (`/components/charts/activity-chart.tsx`)

Bar chart displaying user activity metrics.

```tsx
import { ActivityChart } from '@/components/charts/activity-chart';

const data = [
  {
    date: '2025-10-01',
    sessions: 150,
    completions: 85,
    avgDuration: 25,
  },
  // ... more data
];

<ActivityChart data={data} isLoading={false} />
```

**Props:**
- `data` (ActivityData[]): Array of activity data points
- `isLoading?` (boolean): Show loading state
- `className?` (string): Additional CSS classes

**Data Format:**
```typescript
interface ActivityData {
  date: string;       // ISO date string
  sessions: number;   // Number of sessions
  completions: number; // Number of completions
  avgDuration: number; // Average duration in minutes
}
```

### Content Stats Chart (`/components/charts/content-stats-chart.tsx`)

Pie chart for content distribution and statistics.

```tsx
import { ContentStatsChart } from '@/components/charts/content-stats-chart';

const data = [
  { name: 'Meditation', value: 45 },
  { name: 'Yoga', value: 32 },
  { name: 'Mindfulness', value: 28 },
];

<ContentStatsChart
  data={data}
  title="Content Distribution"
  description="Breakdown by content type"
  isLoading={false}
/>
```

**Props:**
- `data` (ContentStatsData[]): Array of category data
- `isLoading?` (boolean): Show loading state
- `className?` (string): Additional CSS classes
- `title?` (string): Chart title (default: "Content Distribution")
- `description?` (string): Chart description (default: "Breakdown of content types")

**Data Format:**
```typescript
interface ContentStatsData {
  name: string;  // Category name
  value: number; // Category value
}
```

## Hooks

### useStats (`/lib/hooks/use-stats.ts`)

Custom hook for fetching dashboard statistics with automatic caching.

```tsx
import { useStats } from '@/lib/hooks/use-stats';

function MyComponent() {
  const { stats, isLoading, error, refresh } = useStats();

  if (error) return <div>Error: {error}</div>;
  if (isLoading) return <div>Loading...</div>;

  return <div>Total Users: {stats.totalUsers}</div>;
}
```

**Returns:**
- `stats` (DashboardStats | null): Stats data
- `isLoading` (boolean): Loading state
- `error` (string | null): Error message
- `refresh` (() => void): Function to force refresh (bypasses cache)

**Features:**
- Automatic caching in localStorage
- 60-second cache duration
- Fetches from `/api/stats` endpoint
- Automatic error handling

## Dashboard Components

### StatsOverview (`/components/dashboard/stats-overview.tsx`)

Pre-built component displaying all KPI cards with real data from API.

```tsx
import { StatsOverview } from '@/components/dashboard/stats-overview';

<StatsOverview />
```

**Features:**
- Fetches data using `useStats` hook
- Displays 7 KPI cards:
  - Total Users
  - Active Users (7d)
  - Active Users (30d)
  - Total Programs
  - Total Lessons
  - Media Files
  - Storage Used
- Automatic loading states
- Error handling

### ChartsOverview (`/components/dashboard/charts-overview.tsx`)

Pre-built component displaying all charts with mock data.

```tsx
import { ChartsOverview } from '@/components/dashboard/charts-overview';

<ChartsOverview isLoading={false} />
```

**Props:**
- `isLoading?` (boolean): Show loading state for all charts

**Note:** Currently uses mock data generators. Replace with API calls for production.

## Example Usage

Complete example in `/app/(dashboard)/analytics/page.tsx`:

```tsx
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
```

## API Endpoint

The stats data is fetched from `/api/stats` which returns:

```typescript
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
```

**Caching:** The endpoint returns `Cache-Control: public, max-age=60` headers for 60-second browser caching.

## Styling

All components use:
- **Tailwind CSS** for styling
- **shadcn/ui** Card components for containers
- **Default Recharts palette** for chart colors (no custom colors)
- **Responsive design** with mobile-first approach
- **Dark mode support** via CSS variables

## Testing

To test the components:

1. Navigate to `/analytics` in your browser
2. Verify KPI cards display real data from API
3. Check that charts render correctly
4. Test loading states by throttling network
5. Verify cache behavior (check localStorage for `ora-dashboard-stats`)

## Future Enhancements

- [ ] Add date range picker for charts
- [ ] Implement real-time data updates
- [ ] Add export functionality (CSV, PDF)
- [ ] Create more chart types (scatter, radar)
- [ ] Add drill-down capabilities
- [ ] Implement chart comparison mode
