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
import { Progress } from '@/components/ui/progress';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Upload, X } from 'lucide-react';
import type { LessonType, CreateLessonRequest, UploadInitResponse } from '@/types/lesson';

interface Program {
  id: string;
  title: string;
}

interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  onSuccess: () => void;
}

const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  type: z.enum(['video', 'audio']),
  programId: z.string().min(1, 'Program is required'),
  order: z.number().int().min(0).optional(),
  tags: z.string().optional(),
  transcript: z.string().optional(),
});

type CreateLessonFormData = z.infer<typeof createLessonSchema>;

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'];

export function CreateLessonDialog({
  open,
  onOpenChange,
  programs,
  onSuccess,
}: CreateLessonDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateLessonFormData>({
    resolver: zodResolver(createLessonSchema),
    defaultValues: {
      type: 'video',
      order: 0,
    },
  });

  const selectedType = watch('type');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const acceptedTypes =
      selectedType === 'video' ? ACCEPTED_VIDEO_TYPES : ACCEPTED_AUDIO_TYPES;
    if (!acceptedTypes.includes(selectedFile.type)) {
      setError(
        `Invalid file type. Please select a ${selectedType} file (${acceptedTypes.join(', ')})`
      );
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 2GB limit');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (lessonId: string, file: File, lessonType: LessonType) => {
    try {
      // Get upload URL
      const initResponse = await fetchWithAuth(`/api/uploads/lessons/${lessonId}/init`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          lessonType: lessonType,
        }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(errorData.error || 'Failed to initialize upload');
      }

      const { uploadUrl }: UploadInitResponse = await initResponse.json();

      // Upload file using XMLHttpRequest for progress tracking
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const onSubmit = async (data: CreateLessonFormData) => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      // Parse tags
      const tags = data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      // Create lesson
      const createRequest: CreateLessonRequest = {
        title: data.title,
        type: data.type,
        programId: data.programId,
        order: data.order,
        tags,
        transcript: data.transcript,
      };

      const createResponse = await fetchWithAuth('/api/lessons', {
        method: 'POST',
        body: JSON.stringify(createRequest),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create lesson');
      }

      const { lesson } = await createResponse.json();

      // Upload file
      await uploadFile(lesson.id, file, lesson.type);

      // Success
      setUploadProgress(100);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating lesson:', error);
      setError(error instanceof Error ? error.message : 'Failed to create lesson');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      reset();
      setFile(null);
      setError(null);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson to your program. Upload a video or audio file and provide details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter lesson title"
              {...register('title')}
              disabled={uploading}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setValue('type', value as LessonType);
                removeFile(); // Clear file when type changes
              }}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          {/* Program */}
          <div className="space-y-2">
            <Label htmlFor="programId">
              Program <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('programId')}
              onValueChange={(value) => setValue('programId', value)}
              disabled={uploading}
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
              disabled={uploading}
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
              disabled={uploading}
            />
          </div>

          {/* Transcript */}
          <div className="space-y-2">
            <Label htmlFor="transcript">Transcript</Label>
            <Textarea
              id="transcript"
              placeholder="Enter lesson transcript (optional)"
              rows={4}
              {...register('transcript')}
              disabled={uploading}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>
              File <span className="text-red-500">*</span>
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {!file ? (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex flex-col items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      Select {selectedType} file
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Max file size: 2GB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats:{' '}
                      {selectedType === 'video'
                        ? 'MP4, MOV, AVI'
                        : 'MP3, WAV, M4A'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      selectedType === 'video'
                        ? ACCEPTED_VIDEO_TYPES.join(',')
                        : ACCEPTED_AUDIO_TYPES.join(',')
                    }
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {!uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

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
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? 'Creating...' : 'Create Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
