'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Activity, getActivityIcon, getActivityAction } from '@/lib/types/activity';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface ActivityGroup {
  label: string;
  activities: Activity[];
}

function groupActivitiesByDate(activities: Activity[]): ActivityGroup[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  const today: Activity[] = [];
  const yesterday: Activity[] = [];
  const thisWeek: Activity[] = [];
  const older: Activity[] = [];

  activities.forEach((activity) => {
    const diff = now - activity.createdAt;

    if (diff < oneDay) {
      today.push(activity);
    } else if (diff < 2 * oneDay) {
      yesterday.push(activity);
    } else if (diff < oneWeek) {
      thisWeek.push(activity);
    } else {
      older.push(activity);
    }
  });

  const groups: ActivityGroup[] = [];

  if (today.length > 0) {
    groups.push({ label: 'Today', activities: today });
  }
  if (yesterday.length > 0) {
    groups.push({ label: 'Yesterday', activities: yesterday });
  }
  if (thisWeek.length > 0) {
    groups.push({ label: 'This Week', activities: thisWeek });
  }
  if (older.length > 0) {
    groups.push({ label: 'Older', activities: older });
  }

  return groups;
}

function getResourceLink(activity: Activity): string | null {
  if (!activity.resourceId || !activity.resourceType) {
    return null;
  }

  switch (activity.resourceType) {
    case 'user':
      return `/admin/users?id=${activity.resourceId}`;
    case 'program':
      return `/admin/programs?id=${activity.resourceId}`;
    case 'lesson':
      return `/admin/programs/${activity.resourceId}`;
    case 'content':
      return `/admin/content?id=${activity.resourceId}`;
    default:
      return null;
  }
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icon = getActivityIcon(activity.type);
  const action = getActivityAction(activity.type);
  const timeAgo = formatDistanceToNow(activity.createdAt, { addSuffix: true });
  const resourceLink = getResourceLink(activity);

  return (
    <div className="flex items-start space-x-3 py-3 border-b last:border-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-medium">{activity.actorName}</span>
          <span className="text-muted-foreground"> {action}</span>
          {activity.resourceTitle && (
            <>
              {' '}
              {resourceLink ? (
                <Link href={resourceLink} className="font-medium hover:underline text-primary">
                  {activity.resourceTitle}
                </Link>
              ) : (
                <span className="font-medium">{activity.resourceTitle}</span>
              )}
            </>
          )}
        </div>
        {activity.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

export function RecentActivityFeed() {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuth('/api/activity');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch activities');
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err: any) {
        console.error('[RecentActivityFeed] Error fetching activities:', err);
        setError(err.message || 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const activityGroups = React.useMemo(() => {
    return groupActivitiesByDate(activities);
  }, [activities]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest user interactions and content updates</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 py-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive text-sm">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Please check your permissions or try again later
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity to display</p>
            <p className="text-sm mt-2">
              Activity feed will appear here once users interact with the platform
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activityGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{group.label}</h3>
                <div className="space-y-0">
                  {group.activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
