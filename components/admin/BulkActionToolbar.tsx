'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, ChevronDown, X } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onUpdateStatus?: (status: 'draft' | 'published' | 'archived') => void;
  onClearSelection: () => void;
  entityType: 'program' | 'lesson';
}

export function BulkActionToolbar({
  selectedCount,
  onDelete,
  onUpdateStatus,
  onClearSelection,
  entityType,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-lg border bg-background p-4 shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {selectedCount}
          </div>
          <span className="font-medium">
            {selectedCount} {entityType}{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          {onUpdateStatus && entityType === 'program' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Update Status
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onUpdateStatus('draft')}>
                  Set as Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus('published')}>
                  Set as Published
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus('archived')}>
                  Set as Archived
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        Clear Selection
      </Button>
    </div>
  );
}
