'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogFilters } from './_components/AuditLogFilters';
import { AuditLogTable } from './_components/AuditLogTable';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import type { AuditLog, GetAuditLogsQuery } from '@/types/audit';

export default function AuditLogsPage() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [lastDocId, setLastDocId] = React.useState<string | undefined>(undefined);
  const [filters, setFilters] = React.useState<GetAuditLogsQuery>({
    limit: 50,
  });

  // Check permissions
  React.useEffect(() => {
    if (!loading && user) {
      if (!user.role || !hasPermission(user.role, 'canViewAuditLogs')) {
        redirect('/admin');
      }
    }
  }, [user, loading]);

  // Fetch audit logs
  const fetchLogs = React.useCallback(async (query: GetAuditLogsQuery, append = false) => {
    try {
      setIsLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (query.resourceType) params.append('resourceType', query.resourceType);
      if (query.action) params.append('action', query.action);
      if (query.actorId) params.append('actorId', query.actorId);
      if (query.resourceId) params.append('resourceId', query.resourceId);
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.startAfter) params.append('startAfter', query.startAfter);

      const response = await fetchWithAuth(`/api/audit-logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();

      if (append) {
        setLogs((prev) => [...prev, ...data.logs]);
      } else {
        setLogs(data.logs);
      }

      setHasMore(data.hasMore);
      setLastDocId(data.lastDocId);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    if (user && user.role && hasPermission(user.role, 'canViewAuditLogs')) {
      fetchLogs(filters);
    }
  }, [user, fetchLogs]);

  // Handle filter change
  const handleFilterChange = (newFilters: GetAuditLogsQuery) => {
    setFilters(newFilters);
    fetchLogs(newFilters);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && lastDocId) {
      fetchLogs({ ...filters, startAfter: lastDocId }, true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !user.role || !hasPermission(user.role, 'canViewAuditLogs')) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View all admin actions and changes made to users, programs, and lessons.
        </p>
      </div>

      <AuditLogFilters onFilterChange={handleFilterChange} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            {logs.length} log{logs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable
            logs={logs}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        </CardContent>
      </Card>
    </div>
  );
}
