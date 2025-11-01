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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Image as ImageIcon,
  Video,
  Music,
  MoreVertical,
  Download,
  Trash2,
  AlertCircle,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { type MediaFile } from '@/types/media';
import { formatBytes } from '@/types/media';

interface MediaListViewProps {
  files: MediaFile[];
  selectedFiles: Set<string>;
  onSelectionChange: (fileId: string, selected: boolean) => void;
  onPreview: (file: MediaFile) => void;
  onDelete: (file: MediaFile) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
}

export function MediaListView({
  files,
  selectedFiles,
  onSelectionChange,
  onPreview,
  onDelete,
  hasMore,
  onLoadMore,
  loading,
}: MediaListViewProps) {
  const [sortBy, setSortBy] = React.useState<'name' | 'size' | 'date'>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const sortedFiles = React.useMemo(() => {
    const sorted = [...files];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          // Sort by lessonTitle if available, otherwise by file name
          const nameA = a.lessonTitle || a.name;
          const nameB = b.lessonTitle || b.name;
          comparison = nameA.localeCompare(nameB);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [files, sortBy, sortDirection]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'video':
        return <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'audio':
        return <Music className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
  };

  const handleDownload = (file: MediaFile) => {
    window.open(file.url, '_blank');
  };

  const SortButton = ({ column, children }: { column: typeof sortBy; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(column)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  if (files.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <div className="rounded-full bg-muted p-6 mb-4">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No files found</h3>
        <p className="text-muted-foreground max-w-sm">
          Try adjusting your filters or upload new media files to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={files.length > 0 && files.every((f) => selectedFiles.has(f.id))}
                  onCheckedChange={(checked) => {
                    files.forEach((file) => onSelectionChange(file.id, checked === true));
                  }}
                />
              </TableHead>
              <TableHead className="w-[80px]">Preview</TableHead>
              <TableHead>
                <SortButton column="name">Name</SortButton>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                <SortButton column="size">Size</SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="date">Uploaded</SortButton>
              </TableHead>
              <TableHead>Used In</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFiles.map((file) => {
              const displayName = file.lessonTitle || file.name;

              return (
                <TableRow
                  key={file.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onPreview(file)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => onSelectionChange(file.id, checked === true)}
                    />
                  </TableCell>

                  {/* Preview Thumbnail */}
                  <TableCell>
                    <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {file.type === 'image' && (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {file.type === 'video' && (
                        <div className="relative w-full h-full">
                          <video
                            src={file.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        </div>
                      )}
                      {file.type === 'audio' && (
                        <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium max-w-xs truncate" title={displayName}>
                        {displayName}
                      </p>
                      {file.lessonTitle && (
                        <p className="text-xs text-muted-foreground max-w-xs truncate" title={file.name}>
                          {file.name}
                        </p>
                      )}
                      {file.isOrphaned && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Orphaned
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(file.type)}
                      <span className="capitalize">{file.type}</span>
                    </div>
                  </TableCell>

                  {/* Size */}
                  <TableCell>{formatBytes(file.size)}</TableCell>

                  {/* Uploaded Date */}
                  <TableCell className="text-muted-foreground">
                    {formatDate(file.uploadedAt)}
                  </TableCell>

                  {/* Used In Lessons */}
                  <TableCell>
                    {file.usedInLessons.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {file.usedInLessons.map((lesson) => (
                          <Badge key={lesson.id} variant="secondary" className="text-xs">
                            {lesson.title}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(file)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Loading Skeleton */}
            {loading && (
              <>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-12 w-12 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <Button onClick={onLoadMore} variant="outline" size="lg">
            Load More
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
