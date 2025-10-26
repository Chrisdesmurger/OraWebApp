'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { MediaPlayer } from '@/components/media/media-player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User, Tag, Video, Music, FileText, Loader2 } from 'lucide-react';
import { getStorageDownloadURL } from '@/lib/firebase/client';
import type { Lesson } from '@/types/lesson';

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const [lesson, setLesson] = React.useState<Lesson | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = React.useState<string>('');
  const [loadingMediaUrl, setLoadingMediaUrl] = React.useState(false);

  React.useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  // Convert Firebase Storage path to download URL when lesson loads
  React.useEffect(() => {
    if (lesson && (lesson.type === 'video' || lesson.type === 'audio')) {
      convertMediaUrl();
    }
  }, [lesson]);

  const fetchLesson = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/lessons/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson);
      } else {
        setError('Failed to load lesson');
      }
    } catch (err) {
      console.error('Error fetching lesson:', err);
      setError('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  // Get low quality media path for preview (Firebase Storage path)
  // Using low quality to reduce bandwidth and improve loading speed
  const getMediaPath = (): string => {
    if (!lesson) return '';

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
  const convertMediaUrl = async () => {
    setLoadingMediaUrl(true);
    try {
      const storagePath = getMediaPath();
      if (storagePath) {
        const downloadUrl = await getStorageDownloadURL(storagePath);
        if (downloadUrl) {
          setMediaUrl(downloadUrl);
        } else {
          console.warn('Failed to get download URL for:', storagePath);
        }
      }
    } catch (error) {
      console.error('Error converting media URL:', error);
    } finally {
      setLoadingMediaUrl(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      uploading: { label: 'Uploading', variant: 'default' },
      processing: { label: 'Processing', variant: 'default' },
      ready: { label: 'Ready', variant: 'outline' },
      failed: { label: 'Failed', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Lesson not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/content')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Content
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/content')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
            <p className="text-muted-foreground">Lesson Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getTypeIcon(lesson.type)}
          {getStatusBadge(lesson.status)}
        </div>
      </div>

      {/* Media Player */}
      {(lesson.type === 'video' || lesson.type === 'audio') && (
        <Card>
          <CardHeader>
            <CardTitle>Media Preview</CardTitle>
            <CardDescription>
              Preview the uploaded {lesson.type} content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMediaUrl ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading media...</span>
              </div>
            ) : (
              <MediaPlayer
                type={lesson.type}
                src={mediaUrl}
                thumbnailUrl={lesson.thumbnailUrl || undefined}
                title={lesson.title}
                controls={true}
                className="max-w-4xl mx-auto"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Lesson Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lesson Information</CardTitle>
          <CardDescription>General details about this lesson</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </div>
              <div className="font-medium">{formatDate(lesson.createdAt)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Updated
              </div>
              <div className="font-medium">{formatDate(lesson.updatedAt)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration
              </div>
              <div className="font-medium">{formatDuration(lesson.durationSec)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Author ID
              </div>
              <div className="font-medium font-mono text-sm">{lesson.authorId}</div>
            </div>
          </div>

          {lesson.tags && lesson.tags.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {lesson.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
          <CardDescription>Media file information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {lesson.codec && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Codec</div>
                <div className="font-medium font-mono text-sm">{lesson.codec}</div>
              </div>
            )}

            {lesson.mimeType && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">MIME Type</div>
                <div className="font-medium font-mono text-sm">{lesson.mimeType}</div>
              </div>
            )}

            {lesson.sizeBytes && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">File Size</div>
                <div className="font-medium">
                  {(lesson.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            )}

            {lesson.storagePathOriginal && (
              <div className="space-y-1 col-span-2">
                <div className="text-sm text-muted-foreground">Storage Path</div>
                <div className="font-medium font-mono text-sm break-all">
                  {lesson.storagePathOriginal}
                </div>
              </div>
            )}
          </div>

          {/* Renditions Info */}
          {lesson.type === 'video' && lesson.renditions && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Available Renditions</div>
              <div className="space-y-1">
                {lesson.renditions.high && (
                  <div className="text-sm">
                    <Badge variant="outline">High</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {lesson.renditions.high.width}x{lesson.renditions.high.height} @ {lesson.renditions.high.bitrate_kbps} kbps
                    </span>
                  </div>
                )}
                {lesson.renditions.medium && (
                  <div className="text-sm">
                    <Badge variant="outline">Medium</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {lesson.renditions.medium.width}x{lesson.renditions.medium.height} @ {lesson.renditions.medium.bitrate_kbps} kbps
                    </span>
                  </div>
                )}
                {lesson.renditions.low && (
                  <div className="text-sm">
                    <Badge variant="outline">Low</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {lesson.renditions.low.width}x{lesson.renditions.low.height} @ {lesson.renditions.low.bitrate_kbps} kbps
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audio Variants Info */}
          {lesson.type === 'audio' && lesson.audioVariants && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Available Audio Variants</div>
              <div className="space-y-1">
                {lesson.audioVariants.high && (
                  <div className="text-sm">
                    <Badge variant="outline">High</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {lesson.audioVariants.high.bitrate_kbps} kbps
                    </span>
                  </div>
                )}
                {lesson.audioVariants.medium && (
                  <div className="text-sm">
                    <Badge variant="outline">Medium</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {lesson.audioVariants.medium.bitrate_kbps} kbps
                    </span>
                  </div>
                )}
                {lesson.audioVariants.low && (
                  <div className="text-sm">
                    <Badge variant="outline">Low</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {lesson.audioVariants.low.bitrate_kbps} kbps
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      {lesson.transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>Full text transcript of the lesson</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{lesson.transcript}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
