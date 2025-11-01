'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Image, Video, Music, AlertTriangle } from 'lucide-react';
import { type MediaStats } from '@/types/media';

interface MediaStatsCardProps {
  stats: MediaStats | null;
  loading: boolean;
  onRefresh: () => void;
}

export function MediaStatsCard({ stats, loading, onRefresh }: MediaStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storage Statistics</CardTitle>
              <CardDescription>Loading storage usage...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 animate-pulse rounded-md bg-muted" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="h-24 animate-pulse rounded-md bg-muted" />
              <div className="h-24 animate-pulse rounded-md bg-muted" />
              <div className="h-24 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Statistics</CardTitle>
          <CardDescription>No statistics available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalUsedPercentage = stats.totalSizeBytes > 0
    ? Math.min((stats.totalSizeBytes / (5 * 1024 * 1024 * 1024)) * 100, 100) // Assuming 5GB limit
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Storage Statistics</CardTitle>
            <CardDescription>
              {stats.totalFiles} files totaling {stats.totalSizeFormatted}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Storage Used</span>
            <span className="text-muted-foreground">{totalUsedPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={totalUsedPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {stats.totalSizeFormatted} of 5 GB used
          </p>
        </div>

        {/* By Type Breakdown */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Images */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                  <Image className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium">Images</span>
              </div>
              <Badge variant="secondary">{stats.byType.images.count}</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.byType.images.sizeFormatted}</p>
          </div>

          {/* Videos */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                  <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium">Videos</span>
              </div>
              <Badge variant="secondary">{stats.byType.videos.count}</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.byType.videos.sizeFormatted}</p>
          </div>

          {/* Audio */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                  <Music className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium">Audio</span>
              </div>
              <Badge variant="secondary">{stats.byType.audio.count}</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.byType.audio.sizeFormatted}</p>
          </div>
        </div>

        {/* Orphaned Files Warning */}
        {stats.orphanedFiles.count > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Orphaned Files Detected
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {stats.orphanedFiles.count} files ({stats.orphanedFiles.sizeFormatted}) are not
                  referenced in any lessons and can be safely deleted.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
