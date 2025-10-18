'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  disabled?: boolean;
}

export function FileDropzone({
  onUpload,
  acceptedTypes = ['image/*', 'video/*', 'audio/*'],
  maxSizeMB = 100,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = (file: File): boolean => {
    // Check file type
    const isValidType = acceptedTypes.some((type) => {
      if (type.endsWith('/*')) {
        const prefix = type.split('/')[0];
        return file.type.startsWith(prefix + '/');
      }
      return file.type === type;
    });

    if (!isValidType) {
      setError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
      return false;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Max size: ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        setSelectedFile(file);
        setError(null);
        setSuccess(false);
      }
    },
    [disabled, acceptedTypes, maxSizeMB]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        setSelectedFile(file);
        setError(null);
        setSuccess(false);
      }
    },
    [acceptedTypes, maxSizeMB]
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(selectedFile);

      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      setTimeout(() => {
        setSelectedFile(null);
        setProgress(0);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging && !disabled && 'border-primary bg-primary/5',
          !isDragging && 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-primary/50'
        )}
      >
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Drop file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Max size: {maxSizeMB}MB • Types: {acceptedTypes.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Selected file */}
      {selectedFile && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!uploading && (
              <Button variant="ghost" size="icon" onClick={handleRemove}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">{progress}% uploaded</p>
            </div>
          )}

          {/* Success/Error states */}
          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Upload successful!</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload button */}
          {!uploading && !success && (
            <Button onClick={handleUpload} disabled={disabled} className="w-full">
              Upload File
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
