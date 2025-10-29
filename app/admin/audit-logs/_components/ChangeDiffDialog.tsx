'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { AuditLog } from '@/types/audit';

interface ChangeDiffDialogProps {
  log: AuditLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeDiffDialog({ log, open, onOpenChange }: ChangeDiffDialogProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const formatAction = (action: string) => {
    return action.replace('_', ' ').toUpperCase();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderChanges = () => {
    if (!log.changes || Object.keys(log.changes).length === 0) {
      return <p className="text-sm text-muted-foreground">No changes recorded</p>;
    }

    // Handle special cases: created/deleted
    if (log.changes.created) {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Created Resource:</h4>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {JSON.stringify(log.changes.created, null, 2)}
          </pre>
        </div>
      );
    }

    if (log.changes.deleted) {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Deleted Resource:</h4>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {JSON.stringify(log.changes.deleted, null, 2)}
          </pre>
        </div>
      );
    }

    // Regular field changes
    return (
      <div className="space-y-4">
        {Object.entries(log.changes).map(([field, change]: [string, any]) => {
          if (!change || typeof change !== 'object' || !('before' in change || 'after' in change)) {
            return null;
          }

          return (
            <div key={field} className="space-y-2">
              <h4 className="font-semibold text-sm capitalize">{field.replace(/_/g, ' ')}:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950">
                    Before
                  </Badge>
                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-32">
                    {formatValue(change.before)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950">
                    After
                  </Badge>
                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-32">
                    {formatValue(change.after)}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            {formatAction(log.action)} on {log.resourceType} by {log.actorEmail}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Metadata Section */}
            <div className="space-y-3">
              <h3 className="font-semibold">Event Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <p className="font-mono text-xs mt-1">{formatTimestamp(log.timestamp)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <p className="font-medium mt-1">{formatAction(log.action)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resource Type:</span>
                  <p className="font-medium mt-1 capitalize">{log.resourceType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resource ID:</span>
                  <p className="font-mono text-xs mt-1">{log.resourceId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor:</span>
                  <p className="font-medium mt-1">{log.actorEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor ID:</span>
                  <p className="font-mono text-xs mt-1">{log.actorId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address:</span>
                  <p className="font-mono text-xs mt-1">{log.ipAddress}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">User Agent:</span>
                  <p className="font-mono text-xs mt-1 truncate" title={log.userAgent}>
                    {log.userAgent}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Changes Section */}
            <div className="space-y-3">
              <h3 className="font-semibold">Changes</h3>
              {renderChanges()}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
