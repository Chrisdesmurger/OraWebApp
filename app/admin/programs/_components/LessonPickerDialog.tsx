'use client';

import * as React from 'react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { getStorageDownloadURL } from '@/lib/firebase/client';
import type { Lesson } from '@/types/lesson';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Video, Music, FileText, Eye } from 'lucide-react';
import { MediaPlayer } from '@/components/media/media-player';

interface LessonPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLessonIds: string[];
  onConfirm: (lessonIds: string[]) => void;
}

export function LessonPickerDialog({
  open,
  onOpenChange,
  selectedLessonIds,
  onConfirm,
}: LessonPickerDialogProps) {
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>(selectedLessonIds);
  const [previewLesson, setPreviewLesson] = React.useState<Lesson | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = React.useState<string>('');
  const [loadingMediaUrl, setLoadingMediaUrl] = React.useState(false);

  // Fetch lessons when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelected(selectedLessonIds);
      fetchLessons();
    }
  }, [open, selectedLessonIds]);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = React.useMemo(() => {
    if (!searchQuery) return lessons;
    const query = searchQuery.toLowerCase();
    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(query) ||
        lesson.transcript?.toLowerCase().includes(query)
    );
  }, [lessons, searchQuery]);

  const handleToggle = (lessonId: string) => {
    setSelected((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === filteredLessons.length) {
      setSelected([]);
    } else {
      setSelected(filteredLessons.map((l) => l.id));
    }
  };

  const handleConfirm = () => {
    onConfirm(selected);
    onOpenChange(false);
  };

  // Convert Firebase Storage path to download URL when preview lesson changes
  React.useEffect(() => {
    if (previewLesson && (previewLesson.type === 'video' || previewLesson.type === 'audio')) {
      convertPreviewMediaUrl();
    }
  }, [previewLesson]);

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Get low quality media path for preview (Firebase Storage path)
  // Using low quality to reduce bandwidth and improve loading speed
  const getMediaPath = (lesson: Lesson): string => {
    if (lesson.type === 'video' && lesson.renditions) {
      return lesson.renditions.low?.path ||
             lesson.renditions.medium?.path ||
             lesson.renditions.high?.path ||
             lesson.storagePathOriginal ||
             '';
    }

    if (lesson.type === 'audio' && lesson.audioVariants) {
      return lesson.audioVariants.low?.path ||
             lesson.audioVariants.medium?.path ||
             lesson.audioVariants.high?.path ||
             lesson.storagePathOriginal ||
             '';
    }

    return lesson.storagePathOriginal || '';
  };

  // Convert Firebase Storage path to download URL
  const convertPreviewMediaUrl = async () => {
    if (!previewLesson) return;

    setLoadingMediaUrl(true);
    try {
      const storagePath = getMediaPath(previewLesson);
      if (storagePath) {
        const downloadUrl = await getStorageDownloadURL(storagePath);
        if (downloadUrl) {
          setPreviewMediaUrl(downloadUrl);
        } else {
          console.warn('Failed to get download URL for:', storagePath);
          setPreviewMediaUrl('');
        }
      } else {
        setPreviewMediaUrl('');
      }
    } catch (error) {
      console.error('Error converting media URL:', error);
      setPreviewMediaUrl('');
    } finally {
      setLoadingMediaUrl(false);
    }
  };

  const renderMediaPreview = (lesson: Lesson) => {
    // Video lesson - show thumbnail or icon
    if (lesson.type === 'video') {
      if (lesson.thumbnailUrl) {
        return (
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="h-12 w-12 rounded-lg object-cover"
          />
        );
      }
      // Default video icon
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white">
          <Video className="h-6 w-6" />
        </div>
      );
    }

    // Audio lesson - show audio icon
    if (lesson.type === 'audio') {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white">
          <Music className="h-6 w-6" />
        </div>
      );
    }

    // Default fallback
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 text-white">
        <Video className="h-6 w-6" />
      </div>
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Lessons</DialogTitle>
          <DialogDescription>
            Choose lessons to include in this program. You can reorder them later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selected.length} of {filteredLessons.length} lessons selected
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={loading || filteredLessons.length === 0}
            >
              {selected.length === filteredLessons.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Lessons List */}
          <ScrollArea className="h-[400px] rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No lessons found' : 'No lessons available'}
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredLessons.map((lesson) => {
                  const isSelected = selected.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggle(lesson.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(lesson.id)}
                        className="mt-1"
                      />

                      {/* Media Preview */}
                      {renderMediaPreview(lesson)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{lesson.title}</div>
                          {lesson.type && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {lesson.type === 'video' && <Video className="h-3 w-3 mr-1" />}
                              {lesson.type === 'audio' && <Music className="h-3 w-3 mr-1" />}
                              {lesson.type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {lesson.transcript ? lesson.transcript.substring(0, 100) + '...' : 'No transcript available'}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {lesson.tags && lesson.tags.length > 0 && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {lesson.tags[0]}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {formatDuration(lesson.durationSec)}
                          </Badge>
                        </div>
                      </div>

                      {/* Preview Button */}
                      {(lesson.type === 'video' || lesson.type === 'audio') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewLesson(lesson);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Selection ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Preview Dialog */}
    <Dialog open={!!previewLesson} onOpenChange={() => setPreviewLesson(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{previewLesson?.title}</DialogTitle>
          <DialogDescription>
            {previewLesson?.type === 'video' ? 'Video' : 'Audio'} Preview
          </DialogDescription>
        </DialogHeader>

        {loadingMediaUrl ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading media...</span>
          </div>
        ) : (
          previewLesson && (previewLesson.type === 'video' || previewLesson.type === 'audio') && (
            <MediaPlayer
              type={previewLesson.type}
              src={previewMediaUrl}
              thumbnailUrl={previewLesson.thumbnailUrl || undefined}
              title={previewLesson.title}
              controls={true}
            />
          )
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
