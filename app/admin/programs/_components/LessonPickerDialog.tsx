'use client';

import * as React from 'react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
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
import { Search, Loader2, Video, Music, FileText } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  durationSec?: number;
  category?: string;
  type?: 'video' | 'audio' | 'article';
  thumbnailUrl?: string;
  renditions?: { url: string; quality: string }[];
  audioVariants?: { url: string; quality: string }[];
}

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
        lesson.description?.toLowerCase().includes(query)
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const renderMediaPreview = (lesson: Lesson) => {
    // Video lesson - show thumbnail or video preview
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
      // Fallback: Try to use first rendition as preview
      if (lesson.renditions && lesson.renditions.length > 0) {
        return (
          <video
            src={lesson.renditions[0].url}
            className="h-12 w-12 rounded-lg object-cover"
            muted
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

    // Article - show article icon
    if (lesson.type === 'article') {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-white">
          <FileText className="h-6 w-6" />
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
                              {lesson.type === 'article' && <FileText className="h-3 w-3 mr-1" />}
                              {lesson.type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {lesson.description || 'No description available'}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {lesson.category && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {lesson.category}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {formatDuration(lesson.durationSec)}
                          </Badge>
                        </div>
                      </div>
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
  );
}
