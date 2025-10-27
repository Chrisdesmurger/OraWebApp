'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { toast } from 'sonner';

interface ProgramCoverUploadProps {
  programId: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ProgramCoverUpload({
  programId,
  currentUrl,
  onUpload,
  onRemove,
  disabled = false,
}: ProgramCoverUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(currentUrl || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Firebase Storage
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);

      const response = await fetchWithAuth(`/api/programs/${programId}/cover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      onUpload(data.coverUrl);
      toast.success('Cover image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    try {
      setUploading(true);
      const response = await fetchWithAuth(`/api/programs/${programId}/cover`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }

      setPreview(null);
      onRemove();
      toast.success('Cover image removed successfully');
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast.error(error.message || 'Failed to remove image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Program Cover Image</div>
          <div className="text-sm text-muted-foreground">
            Recommended size: 800x600px (max 5MB)
          </div>
        </div>
      </div>

      {preview ? (
        <div className="relative group">
          <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
            <img
              src={preview}
              alt="Program cover"
              className="h-full w-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center aspect-video rounded-lg border-2 border-dashed bg-muted/50">
          <div className="text-center p-6">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-sm text-muted-foreground mb-4">
              No cover image uploaded
            </div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}
