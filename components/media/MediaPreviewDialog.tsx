'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Trash2, Image as ImageIcon, Video, Music, AlertCircle } from 'lucide-react';
import { type MediaFile } from '@/types/media';
import { formatBytes } from '@/types/media';

interface MediaPreviewDialogProps {
  file: MediaFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (file: MediaFile) => void;
}

export function MediaPreviewDialog({
  file,
  open,
  onOpenChange,
  onDelete,
}: MediaPreviewDialogProps) {
  if (!file) return null;

  const handleDownload = () => {
    window.open(file.url, '_blank');
  };

  const handleDelete = () => {
    onDelete(file);
    onOpenChange(false);
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = () => {
    switch (file.type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {file.name}
          </DialogTitle>
          <DialogDescription>
            {file.contentType} • {formatBytes(file.size)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Preview */}
          <div className="rounded-lg border bg-muted/50 overflow-hidden">
            {file.type === 'image' && (
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-auto max-h-[500px] object-contain"
              />
            )}

            {file.type === 'video' && (
              <video
                src={file.url}
                controls
                className="w-full h-auto max-h-[500px]"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            )}

            {file.type === 'audio' && (
              <div className="p-8 flex items-center justify-center">
                <div className="w-full max-w-md space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-gradient-to-br from-green-400 to-green-600 p-8">
                      <Music className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <audio src={file.url} controls className="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              </div>
            )}
          </div>

          {/* File Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">File Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">File Name:</span>
                  <p className="font-medium break-all">{file.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">File Type:</span>
                  <p className="font-medium">{file.contentType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-medium">{formatBytes(file.size)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded:</span>
                  <p className="font-medium">{formatDate(file.uploadedAt)}</p>
                </div>
                {file.uploadedBy && (
                  <div>
                    <span className="text-muted-foreground">Uploaded By:</span>
                    <p className="font-medium">{file.uploadedBy}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    {file.isOrphaned ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Orphaned
                      </Badge>
                    ) : (
                      <Badge variant="secondary">In Use</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Used In Lessons */}
            {file.usedInLessons.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Used In Lessons</h3>
                  <div className="flex flex-wrap gap-2">
                    {file.usedInLessons.map((lessonId) => (
                      <Badge key={lessonId} variant="outline">
                        {lessonId}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Orphaned Warning */}
            {file.isOrphaned && (
              <>
                <Separator />
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        Orphaned File
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        This file is not referenced in any lessons and can be safely deleted to
                        free up storage space.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
