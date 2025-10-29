'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2 } from 'lucide-react';
import type { AuditLog } from '@/types/audit';
import { ChangeDiffDialog } from './ChangeDiffDialog';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  role_change: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  status_change: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const resourceColors: Record<string, string> = {
  user: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  program: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  lesson: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

export function AuditLogTable({ logs, isLoading, hasMore, onLoadMore }: AuditLogTableProps) {
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.replace('_', ' ').charAt(0).toUpperCase() + action.replace('_', ' ').slice(1);
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No audit logs found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">
                  {formatTimestamp(log.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}>
                    {formatAction(log.action)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className={resourceColors[log.resourceType]}>
                      {log.resourceType}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {log.resourceId.substring(0, 12)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{log.actorEmail}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {log.actorId.substring(0, 12)}...
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button onClick={onLoadMore} variant="outline" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {selectedLog && (
        <ChangeDiffDialog
          log={selectedLog}
          open={!!selectedLog}
          onOpenChange={(open) => !open && setSelectedLog(null)}
        />
      )}
    </>
  );
}
