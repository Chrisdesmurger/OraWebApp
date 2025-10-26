'use client';

import * as React from 'react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { getStorageDownloadURL } from '@/lib/firebase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen } from 'lucide-react';
import { DraggableLessonList } from './DraggableLessonList';
import { LessonPickerDialog } from './LessonPickerDialog';
import { MediaPlayer } from '@/components/media/media-player';
import type { Program } from '@/types/program';
import type { Lesson } from '@/types/lesson';

interface ManageLessonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program | null;
  onSuccess: () => void;
}

/**
 * ManageLessonsDialog - Main dialog for managing lessons in a program
 *
 * Features:
 * - Two tabs: "Current Lessons" (reorder/remove) and "Add Lessons" (picker)
 * - Real-time sync with Firestore
 * - Optimistic UI updates
 * - Drag-and-drop lesson reordering
 * - Add/remove lessons from program
 */
export function ManageLessonsDialog({
  open,
  onOpenChange,
  program,
  onSuccess,
}: ManageLessonsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [lessonDetails, setLessonDetails] = React.useState<Lesson[]>([]);
  const [showPicker, setShowPicker] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('current');
  const [previewLesson, setPreviewLesson] = React.useState<Lesson | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = React.useState<string>('');
  const [loadingMediaUrl, setLoadingMediaUrl] = React.useState(false);

  // Fetch lesson details when dialog opens
  React.useEffect(() => {
    if (open && program) {
      fetchProgramWithLessons();
    } else {
      // Reset state when dialog closes
      setLessonDetails([]);
      setActiveTab('current');
    }
  }, [open, program?.id]);

  /**
   * Fetch program details with populated lesson information
   */
  const fetchProgramWithLessons = async () => {
    if (!program) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/programs/${program.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch program details');
      }

      const data = await response.json();
      setLessonDetails(data.lessonDetails || []);
    } catch (error: any) {
      console.error('Error fetching program lessons:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load lessons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle lesson reorder via drag-and-drop
   */
  const handleReorder = async (reorderedLessons: Lesson[]) => {
    if (!program) return;

    const newLessonIds = reorderedLessons.map((l) => l.id);

    // Optimistic update
    setLessonDetails(reorderedLessons);

    try {
      const response = await fetchWithAuth(`/api/programs/${program.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({ lessons: newLessonIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reorder lessons');
      }

      toast({
        title: 'Lessons reordered',
        description: 'Lesson order has been saved successfully.',
      });

      onSuccess(); // Refresh parent program list
    } catch (error: any) {
      console.error('Error reordering lessons:', error);

      // Revert optimistic update
      await fetchProgramWithLessons();

      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder lessons',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle lesson removal from program
   */
  const handleRemove = async (lessonId: string) => {
    if (!program) return;

    const newLessonIds = lessonDetails
      .filter((l) => l.id !== lessonId)
      .map((l) => l.id);

    // Optimistic update
    const previousLessons = [...lessonDetails];
    setLessonDetails(lessonDetails.filter((l) => l.id !== lessonId));

    try {
      const response = await fetchWithAuth(`/api/programs/${program.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({ lessons: newLessonIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove lesson');
      }

      toast({
        title: 'Lesson removed',
        description: 'Lesson has been removed from the program.',
      });

      onSuccess(); // Refresh parent program list
    } catch (error: any) {
      console.error('Error removing lesson:', error);

      // Revert optimistic update
      setLessonDetails(previousLessons);

      toast({
        title: 'Error',
        description: error.message || 'Failed to remove lesson',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle adding selected lessons from picker
   */
  const handleAddLessons = async (newLessonIds: string[]) => {
    if (!program) return;

    // Merge with existing lessons (avoid duplicates)
    const existingIds = lessonDetails.map((l) => l.id);
    const uniqueNewIds = newLessonIds.filter((id) => !existingIds.includes(id));

    if (uniqueNewIds.length === 0) {
      toast({
        title: 'No new lessons',
        description: 'Selected lessons are already in the program.',
      });
      setShowPicker(false);
      return;
    }

    const allLessonIds = [...existingIds, ...uniqueNewIds];

    try {
      const response = await fetchWithAuth(`/api/programs/${program.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({ lessons: allLessonIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add lessons');
      }

      toast({
        title: 'Lessons added',
        description: `${uniqueNewIds.length} lesson(s) added to the program.`,
      });

      // Refresh lesson details
      await fetchProgramWithLessons();
      setShowPicker(false);
      onSuccess(); // Refresh parent program list
    } catch (error: any) {
      console.error('Error adding lessons:', error);

      toast({
        title: 'Error',
        description: error.message || 'Failed to add lessons',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle preview button click
   */
  const handlePreview = (lesson: Lesson) => {
    setPreviewLesson(lesson);
  };

  /**
   * Convert Firebase Storage path to download URL when preview lesson changes
   */
  React.useEffect(() => {
    if (previewLesson && (previewLesson.type === 'video' || previewLesson.type === 'audio')) {
      convertPreviewMediaUrl();
    }
  }, [previewLesson]);

  /**
   * Get low quality media path for preview (Firebase Storage path)
   */
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

  /**
   * Convert Firebase Storage path to download URL
   */
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

  if (!program) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Lessons - {program.title}</DialogTitle>
            <DialogDescription>
              {lessonDetails.length} lesson{lessonDetails.length !== 1 ? 's' : ''} · {program.durationDays} days
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">
                  Current Lessons ({lessonDetails.length})
                </TabsTrigger>
                <TabsTrigger value="add">
                  Add Lessons
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="flex-1 overflow-y-auto mt-4">
                {lessonDetails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add lessons to this program to get started.
                    </p>
                    <Button onClick={() => setActiveTab('add')}>
                      Add Your First Lesson
                    </Button>
                  </div>
                ) : (
                  <DraggableLessonList
                    lessons={lessonDetails}
                    onReorder={handleReorder}
                    onRemove={handleRemove}
                    onPreview={handlePreview}
                  />
                )}
              </TabsContent>

              <TabsContent value="add" className="flex-1 overflow-hidden mt-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Select lessons from the library to add to this program. You can reorder them in the "Current Lessons" tab.
                </div>
                <Button
                  onClick={() => setShowPicker(true)}
                  className="w-full"
                >
                  Open Lesson Library
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Lesson Picker Dialog (nested) */}
      <LessonPickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        selectedLessonIds={lessonDetails.map((l) => l.id)}
        onConfirm={handleAddLessons}
      />

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
