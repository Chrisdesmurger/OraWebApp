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
import { TranslationFieldsWithAutoTranslate, type MultilingualText } from '@/components/ui/translation-fields-with-auto-translate';
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
import { getMultilingualDisplayText } from '@/components/ui/multilingual-input';
import type { LessonType, LessonCategory, CreateLessonRequest, UploadInitResponse } from '@/types/lesson';
import { LESSON_CATEGORY_LABELS } from '@/types/lesson';
import type { Subcategory } from '@/types/subcategory';

interface Program {
  id: string;
  title: string | MultilingualText;
}

interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  onSuccess: () => void;
}

// Multilingual text schema (accepts both string and MultilingualText for backward compatibility)
const multilingualTextSchema = z.union([
  z.string(),
  z.object({
    fr: z.string(),
    en: z.string().optional(),
    es: z.string().optional(),
  }),
]);

const createLessonSchema = z.object({
  title: multilingualTextSchema,
  description: multilingualTextSchema.optional(),
  category: z.enum(['yoga', 'meditation', 'pilates', 'respiration', 'auto-massage'], {
    required_error: 'Category is required',
  }),
  type: z.enum(['video', 'audio']),
  programId: z.string().optional(),  // Program is now optional
  order: z.number().int().min(0).optional(),
  tags: z.string().optional(),
  transcript: multilingualTextSchema.optional(),
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
  const [subcategories, setSubcategories] = React.useState<Subcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState<string | null>(null);
  const [loadingSubcategories, setLoadingSubcategories] = React.useState(false);

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
      title: { fr: '', en: '', es: '' },
      description: { fr: '', en: '', es: '' },
      transcript: { fr: '', en: '', es: '' },
      type: 'video',
      order: 0,
    },
  });

  const selectedType = watch('type');
  const selectedCategory = watch('category');

  // Fetch subcategories when category changes
  React.useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) {
        setSubcategories([]);
        setSelectedSubcategoryId(null);
        return;
      }

      setLoadingSubcategories(true);
      try {
        const response = await fetchWithAuth(
          `/api/subcategories?category=${selectedCategory}&status=active`
        );
        if (response.ok) {
          const data = await response.json();
          setSubcategories(data.subcategories || []);
        } else {
          console.error('Failed to fetch subcategories');
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    fetchSubcategories();
    // Reset subcategory when category changes
    setSelectedSubcategoryId(null);
  }, [selectedCategory]);

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
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let uploadCompleted = false;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
            // If we reached 100%, mark as potentially completed
            if (progress === 100) {
              uploadCompleted = true;
            }
          }
        });

        xhr.addEventListener('load', () => {
          // Firebase Storage resumable uploads return:
          // - 308 Resume Incomplete for successful chunk uploads (not an error!)
          // - 200 OK when the entire upload is complete
          // - 201 Created in some cases
          if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 308) {
            console.log('✅ Upload successful with status:', xhr.status);
            resolve();
          } else {
            console.error('Upload failed with status:', xhr.status, xhr.statusText, xhr.responseText);
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', (e) => {
          // If upload reached 100% and we get a network error, it's likely a CORS issue
          // after successful upload - treat as success
          if (uploadCompleted) {
            console.log('⚠️ Upload reached 100% but got network error - will verify server-side');
            resolve();
            return;
          }
          console.error('XHR error event:', e, 'Status:', xhr.status, 'ReadyState:', xhr.readyState);
          reject(new Error(`Upload failed - Network error (status: ${xhr.status})`));
        });

        xhr.addEventListener('abort', () => {
          console.error('Upload aborted');
          reject(new Error('Upload aborted'));
        });

        console.log('Starting upload to:', uploadUrl.substring(0, 100) + '...');
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Verify upload was successful by checking lesson status after a short delay
      // The Cloud Function should update the status to 'processing' or 'ready'
      console.log('Verifying upload status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for Cloud Function

      const verifyResponse = await fetchWithAuth(`/api/lessons/${lessonId}`);
      if (verifyResponse.ok) {
        const { lesson: updatedLesson } = await verifyResponse.json();
        if (updatedLesson.status === 'uploading' && !updatedLesson.storagePathOriginal) {
          // Upload didn't actually complete - file never arrived
          throw new Error('Upload verification failed - file did not arrive on server');
        }
        console.log('✅ Upload verified, lesson status:', updatedLesson.status);
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Delete lesson if upload fails (cleanup)
  const deleteLesson = async (lessonId: string) => {
    try {
      console.log('Cleaning up lesson after failed upload:', lessonId);
      await fetchWithAuth(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      console.log('Lesson deleted successfully');
    } catch (deleteError) {
      console.error('Failed to delete lesson after upload failure:', deleteError);
      // Don't throw - this is just cleanup
    }
  };

  const onSubmit = async (data: CreateLessonFormData) => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    let createdLessonId: string | null = null;

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
        description: data.description,
        category: data.category,
        type: data.type,
        programId: data.programId,
        order: data.order,
        tags,
        transcript: data.transcript,
        subcategoryId: selectedSubcategoryId,
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
      createdLessonId = lesson.id;

      // Upload file
      await uploadFile(lesson.id, file, lesson.type);

      // Success - clear the lessonId so we don't delete it
      createdLessonId = null;
      setUploadProgress(100);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating lesson:', error);
      setError(error instanceof Error ? error.message : 'Failed to create lesson');

      // If lesson was created but upload failed, delete the lesson
      if (createdLessonId) {
        await deleteLesson(createdLessonId);
      }
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
      setSubcategories([]);
      setSelectedSubcategoryId(null);
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
          <TranslationFieldsWithAutoTranslate
            label="Title"
            value={watch('title')}
            onChange={(value) => setValue('title', value)}
            disabled={uploading}
            required
            description="A clear, descriptive title for the lesson"
            placeholder={{
              fr: 'e.g., Introduction à la méditation',
              en: 'e.g., Introduction to meditation',
              es: 'e.g., Introducción a la meditación'
            }}
            maxLength={200}
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title.message}</p>
          )}

          {/* Description */}
          <TranslationFieldsWithAutoTranslate
            type="textarea"
            label="Description"
            value={watch('description')}
            onChange={(value) => setValue('description', value)}
            disabled={uploading}
            placeholder={{
              fr: 'Brève description de la leçon...',
              en: 'Brief description of the lesson...',
              es: 'Breve descripción de la lección...'
            }}
            rows={3}
            maxLength={500}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}

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

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch('category') || ''}
              onValueChange={(value) => setValue('category', value as LessonCategory)}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LESSON_CATEGORY_LABELS) as LessonCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {LESSON_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
          </div>

          {/* Subcategory */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label htmlFor="subcategoryId">Subcategory</Label>
              {loadingSubcategories ? (
                <div className="text-sm text-muted-foreground">Loading subcategories...</div>
              ) : subcategories.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No subcategories available for {LESSON_CATEGORY_LABELS[selectedCategory]}.
                  <a href="/admin/subcategories" className="text-primary ml-1 underline">
                    Create subcategories
                  </a>
                </div>
              ) : (
                <Select
                  value={selectedSubcategoryId || 'none'}
                  onValueChange={(value) =>
                    setSelectedSubcategoryId(value === 'none' ? null : value)
                  }
                  disabled={uploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No subcategory</span>
                    </SelectItem>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name.fr}
                        {sub.name.en && (
                          <span className="text-muted-foreground ml-2">
                            ({sub.name.en})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Subcategories are used to group lessons in horizontal carousels on the mobile app
              </p>
            </div>
          )}

          {/* Program */}
          <div className="space-y-2">
            <Label htmlFor="programId">Program</Label>
            <Select
              value={watch('programId') || ''}
              onValueChange={(value) => setValue('programId', value)}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {getMultilingualDisplayText(program.title)}
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
          <TranslationFieldsWithAutoTranslate
            type="textarea"
            label="Transcript"
            value={watch('transcript')}
            onChange={(value) => setValue('transcript', value)}
            disabled={uploading}
            placeholder={{
              fr: 'Transcription de la leçon...',
              en: 'Lesson transcript...',
              es: 'Transcripción de la lección...'
            }}
            rows={4}
            maxLength={10000}
          />

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
