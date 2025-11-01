'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, X } from 'lucide-react';
import { formatBytes } from '@/types/media';

interface BulkActionsBarProps {
  selectedCount: number;
  totalSize: number;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  selectedCount,
  totalSize,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-5">
      <div className="rounded-lg border bg-background shadow-lg">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {selectedCount}
            </Badge>
            <span className="font-medium">
              {selectedCount === 1 ? 'file' : 'files'} selected
            </span>
            <span className="text-muted-foreground">
              ({formatBytes(totalSize)})
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
