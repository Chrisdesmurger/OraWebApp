'use client';

import * as React from 'react';
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
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type MediaFile } from '@/types/media';
import { formatBytes } from '@/types/media';

interface MediaGalleryViewProps {
  files: MediaFile[];
  selectedFiles: Set<string>;
  onSelectionChange: (fileId: string, selected: boolean) => void;
  onPreview: (file: MediaFile) => void;
  onDelete: (file: MediaFile) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
}

export function MediaGalleryView({
  files,
  selectedFiles,
  onSelectionChange,
  onPreview,
  onDelete,
  hasMore,
  onLoadMore,
  loading,
}: MediaGalleryViewProps) {
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
    }
  };

  const handleDownload = (file: MediaFile) => {
    window.open(file.url, '_blank');
  };

  if (files.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
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
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group relative rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md"
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedFiles.has(file.id)}
                onCheckedChange={(checked) => onSelectionChange(file.id, checked === true)}
                className="bg-background border-2 data-[state=checked]:bg-primary"
              />
            </div>

            {/* Actions Menu */}
            <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPreview(file)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
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
            </div>

            {/* Thumbnail */}
            <div
              className="aspect-video bg-muted flex items-center justify-center cursor-pointer"
              onClick={() => onPreview(file)}
            >
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="rounded-full bg-white/90 p-3">
                      <Video className="h-6 w-6 text-gray-900" />
                    </div>
                  </div>
                </div>
              )}

              {file.type === 'audio' && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="rounded-full bg-gradient-to-br from-green-400 to-green-600 p-6">
                    <Music className="h-8 w-8 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="p-3 space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs gap-1">
                  {getTypeIcon(file.type)}
                  {file.type}
                </Badge>
                {file.isOrphaned && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Orphaned
                  </Badge>
                )}
                {file.usedInLessons.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {file.usedInLessons.length} lesson{file.usedInLessons.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

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
