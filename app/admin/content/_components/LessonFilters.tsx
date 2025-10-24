'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { LessonStatus, LessonType } from '@/types/lesson';

interface LessonFiltersProps {
  search: string;
  status: LessonStatus | 'all';
  type: LessonType | 'all';
  programId: string | 'all';
  programs: Array<{ id: string; title: string }>;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: LessonStatus | 'all') => void;
  onTypeChange: (value: LessonType | 'all') => void;
  onProgramChange: (value: string) => void;
  onReset: () => void;
}

export function LessonFilters({
  search,
  status,
  type,
  programId,
  programs,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onProgramChange,
  onReset,
}: LessonFiltersProps) {
  const hasActiveFilters = search || status !== 'all' || type !== 'all' || programId !== 'all';

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Type Filter */}
        <Select value={type} onValueChange={(value) => onTypeChange(value as LessonType | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={status} onValueChange={(value) => onStatusChange(value as LessonStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Program Filter */}
        <Select value={programId} onValueChange={onProgramChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="h-4 w-4 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}
