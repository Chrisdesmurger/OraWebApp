'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Calendar } from 'lucide-react';
import { type MediaType } from '@/types/media';

export interface MediaFiltersState {
  type: MediaType | 'all';
  search: string;
  orphanedOnly: boolean;
  startDate: string;
  endDate: string;
}

interface MediaFiltersProps {
  filters: MediaFiltersState;
  onChange: (filters: MediaFiltersState) => void;
}

export function MediaFilters({ filters, onChange }: MediaFiltersProps) {
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.search) count++;
    if (filters.orphanedOnly) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  const handleClearFilters = () => {
    onChange({
      type: 'all',
      search: '',
      orphanedOnly: false,
      startDate: '',
      endDate: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by filename..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-10 pr-10"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            onClick={() => onChange({ ...filters, search: '' })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Type Filter */}
        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="type-filter">Type</Label>
          <Select
            value={filters.type}
            onValueChange={(value) => onChange({ ...filters, type: value as MediaType | 'all' })}
          >
            <SelectTrigger id="type-filter">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="start-date">From Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="start-date"
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="end-date">To Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="end-date"
              type="date"
              value={filters.endDate}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orphaned Only Checkbox */}
        <div className="flex items-center space-x-2 pb-2">
          <Checkbox
            id="orphaned-only"
            checked={filters.orphanedOnly}
            onCheckedChange={(checked) =>
              onChange({ ...filters, orphanedOnly: checked === true })
            }
          />
          <Label
            htmlFor="orphaned-only"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Orphaned only
          </Label>
        </div>

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button variant="outline" onClick={handleClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filters
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}
