'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduledContentItem } from '@/types/scheduled-content';

export default function ScheduledContentPage() {
  const { user, loading } = useAuth();
  const [scheduledItems, setScheduledItems] = React.useState<ScheduledContentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check permissions
  React.useEffect(() => {
    if (!loading && user) {
      if (!user.role || !hasPermission(user.role, 'canViewPrograms')) {
        redirect('/admin');
      }
    }
  }, [user, loading]);

  // Fetch scheduled content
  const fetchScheduledContent = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/scheduled-content');

      if (!response.ok) {
        throw new Error('Failed to fetch scheduled content');
      }

      const data = await response.json();
      setScheduledItems(data.items || []);
    } catch (error) {
      console.error('Error fetching scheduled content:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user && user.role && hasPermission(user.role, 'canViewPrograms')) {
      fetchScheduledContent();
    }
  }, [user, fetchScheduledContent]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading scheduled content...</p>
        </div>
      </div>
    );
  }

  const getScheduleTypeBadge = (type: 'publish' | 'archive') => {
    return type === 'publish' ? (
      <Badge variant="default" className="bg-green-500">Publish</Badge>
    ) : (
      <Badge variant="secondary" className="bg-orange-500 text-white">Archive</Badge>
    );
  };

  const getContentTypeBadge = (contentType: 'program' | 'lesson') => {
    return contentType === 'program' ? (
      <Badge variant="outline">Program</Badge>
    ) : (
      <Badge variant="outline">Lesson</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scheduled Content</h1>
            <p className="text-muted-foreground">
              View and manage scheduled publishing and archiving
            </p>
          </div>
        </div>
        <Button onClick={fetchScheduledContent} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Scheduled Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Scheduled Events</CardTitle>
          <CardDescription>
            {scheduledItems.length} event{scheduledItems.length !== 1 ? 's' : ''} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Scheduled Content</h3>
              <p className="text-sm text-muted-foreground">
                No programs or lessons are currently scheduled for auto-publishing or archiving.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}-${item.scheduleType}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getContentTypeBadge(item.type)}
                      {getScheduleTypeBadge(item.scheduleType)}
                      {item.autoPublishEnabled && (
                        <Badge variant="secondary" className="bg-blue-500 text-white">Auto</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Scheduled for: {format(new Date(item.scheduledAt), 'PPP p')}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>ID: {item.id.slice(0, 8)}</p>
                    {item.authorId && <p>By: {item.authorId.slice(0, 8)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
