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
import { Download, Trash2, Image as ImageIcon, Video, Music, AlertCircle, Play } from 'lucide-react';
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
  const [currentUrl, setCurrentUrl] = React.useState<string>('');

  // Reset current URL when file changes
  React.useEffect(() => {
    if (file) {
      setCurrentUrl(file.url);
    }
  }, [file]);

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

  const displayName = file.lessonTitle || file.name;
  const subtitle = file.lessonTitle ? file.name : `${file.contentType} • ${formatBytes(file.size)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {displayName}
          </DialogTitle>
          <DialogDescription>
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Preview */}
          <div className="rounded-lg border bg-muted/50 overflow-hidden">
            {file.type === 'image' && (
              <img
                src={currentUrl}
                alt={file.name}
                className="w-full h-auto max-h-[500px] object-contain"
              />
            )}

            {file.type === 'video' && (
              <video
                key={currentUrl}
                src={currentUrl}
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
                  <audio key={currentUrl} src={currentUrl} controls className="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              </div>
            )}
          </div>

          {/* Alternative Quality Versions */}
          {file.alternativeVersions && file.alternativeVersions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Available Quality Versions</h4>

              {/* ORIGINAL quality (current file being viewed) */}
              <div
                className={`flex items-center justify-between p-3 bg-muted rounded ${
                  currentUrl === file.url ? 'border-2 border-primary' : 'border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="default">ORIGINAL</Badge>
                  <span className="text-sm font-medium">{formatBytes(file.size)}</span>
                  {currentUrl === file.url && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentUrl(file.url)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Play
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={file.url} download>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>

              {/* HIGH/MEDIUM/LOW renditions */}
              {file.alternativeVersions.map((version) => (
                <div
                  key={version.quality}
                  className={`flex items-center justify-between p-3 bg-muted rounded ${
                    currentUrl === version.url ? 'border-2 border-primary' : 'border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={version.quality === 'high' ? 'default' : 'secondary'}>
                      {version.quality.toUpperCase()}
                    </Badge>
                    <span className="text-sm">{version.sizeFormatted}</span>
                    {currentUrl === version.url && (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentUrl(version.url)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={version.url} download>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">File Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {file.lessonTitle && (
                  <div>
                    <span className="text-muted-foreground">Lesson:</span>
                    <p className="font-medium">{file.lessonTitle}</p>
                  </div>
                )}
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
                    {file.usedInLessons.map((lesson) => (
                      <Badge key={lesson.id} variant="outline" className="text-sm">
                        {lesson.title}
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
