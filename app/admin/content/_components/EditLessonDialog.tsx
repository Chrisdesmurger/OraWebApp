'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { LessonStatusBadge } from './LessonStatusBadge';
import { LessonPreviewImageUpload } from './LessonPreviewImageUpload';
import { ExternalLink } from 'lucide-react';
import type { Lesson, UpdateLessonRequest } from '@/types/lesson';

interface Program {
  id: string;
  title: string;
}

interface EditLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  programs: Program[];
  onSuccess: () => void;
}

const editLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  programId: z.string().min(1, 'Program is required'),
  order: z.number().int().min(0).optional(),
  tags: z.string().optional(),
  transcript: z.string().optional(),
});

type EditLessonFormData = z.infer<typeof editLessonSchema>;

export function EditLessonDialog({
  open,
  onOpenChange,
  lesson,
  programs,
  onSuccess,
}: EditLessonDialogProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  // Initialize preview image URL when lesson changes
  React.useEffect(() => {
    if (lesson?.previewImageUrl) {
      setPreviewImageUrl(lesson.previewImageUrl);
    } else {
      setPreviewImageUrl(null);
    }
  }, [lesson]);

  const handlePreviewImageUpload = (url: string) => {
    setPreviewImageUrl(url);
    // Refresh will be handled by onSuccess in parent
  };

  const handlePreviewImageRemove = () => {
    setPreviewImageUrl(null);
    // Refresh will be handled by onSuccess in parent
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditLessonFormData>({
    resolver: zodResolver(editLessonSchema),
  });

  // Reset form when lesson changes
  React.useEffect(() => {
    if (lesson) {
      reset({
        title: lesson.title,
        description: lesson.description || '',
        programId: lesson.programId,
        order: lesson.order,
        tags: lesson.tags.join(', '),
        transcript: lesson.transcript || '',
      });
    }
  }, [lesson, reset]);

  const onSubmit = async (data: EditLessonFormData) => {
    if (!lesson) return;

    try {
      setError(null);

      // Parse tags
      const tags = data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      // Update lesson
      const updateRequest: UpdateLessonRequest = {
        title: data.title,
        description: data.description,
        order: data.order,
        tags,
        transcript: data.transcript,
      };

      const response = await fetchWithAuth(`/api/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lesson');
      }

      // Success
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating lesson:', error);
      setError(error instanceof Error ? error.message : 'Failed to update lesson');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setError(null);
      onOpenChange(false);
    }
  };

  if (!lesson) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          <DialogDescription>
            Update lesson details. To replace the file, please contact an administrator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Lesson Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="secondary" className="capitalize mt-1">
                {lesson.type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                <LessonStatusBadge status={lesson.status} />
              </div>
            </div>
            {lesson.durationSec && (
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{Math.round(lesson.durationSec / 60)} min</p>
              </div>
            )}
            {lesson.sizeBytes && (
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {(lesson.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          {/* Renditions */}
          {lesson.status === 'ready' && lesson.renditions && (
            <div className="space-y-2">
              <Label>Available Renditions</Label>
              <div className="grid gap-2">
                {lesson.renditions.high && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">High Quality</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.renditions.high.width}x{lesson.renditions.high.height} -{' '}
                        {lesson.renditions.high.bitrate_kbps} kbps
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(lesson.renditions?.high?.path, '_blank')
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {lesson.renditions.medium && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">Medium Quality</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.renditions.medium.width}x{lesson.renditions.medium.height} -{' '}
                        {lesson.renditions.medium.bitrate_kbps} kbps
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(lesson.renditions?.medium?.path, '_blank')
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {lesson.renditions.low && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">Low Quality</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.renditions.low.width}x{lesson.renditions.low.height} -{' '}
                        {lesson.renditions.low.bitrate_kbps} kbps
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(lesson.renditions?.low?.path, '_blank')
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audio Variants */}
          {lesson.status === 'ready' && lesson.audioVariants && (
            <div className="space-y-2">
              <Label>Available Audio Variants</Label>
              <div className="grid gap-2">
                {lesson.audioVariants.high && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">High Quality</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.audioVariants.high.bitrate_kbps} kbps
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(lesson.audioVariants?.high?.path, '_blank')
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {lesson.audioVariants.medium && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">Medium Quality</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.audioVariants.medium.bitrate_kbps} kbps
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(lesson.audioVariants?.medium?.path, '_blank')
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {lesson.audioVariants.low && (
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">Low Quality</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.audioVariants.low.bitrate_kbps} kbps
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(lesson.audioVariants?.low?.path, '_blank')
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Image Upload */}
          <LessonPreviewImageUpload
            lessonId={lesson.id}
            currentUrl={previewImageUrl}
            onUpload={handlePreviewImageUpload}
            onRemove={handlePreviewImageRemove}
            disabled={isSubmitting}
          />

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter lesson title"
              {...register('title')}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the lesson (optional)"
              rows={3}
              {...register('description')}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Program */}
          <div className="space-y-2">
            <Label htmlFor="programId">
              Program <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('programId')}
              onValueChange={(value) => setValue('programId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.programId && (
              <p className="text-sm text-red-500">{errors.programId.message}</p>
            )}
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="order">Order</Label>
            <Input
              id="order"
              type="number"
              min="0"
              placeholder="0"
              {...register('order', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.order && <p className="text-sm text-red-500">{errors.order.message}</p>}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="meditation, mindfulness, breathing"
              {...register('tags')}
              disabled={isSubmitting}
            />
          </div>

          {/* Transcript */}
          <div className="space-y-2">
            <Label htmlFor="transcript">Transcript</Label>
            <Textarea
              id="transcript"
              placeholder="Enter lesson transcript (optional)"
              rows={6}
              {...register('transcript')}
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
