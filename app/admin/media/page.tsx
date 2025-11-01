'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LayoutGrid, List } from 'lucide-react';
import { MediaStatsCard } from '@/components/media/MediaStatsCard';
import { MediaFilters, type MediaFiltersState } from '@/components/media/MediaFilters';
import { MediaGalleryView } from '@/components/media/MediaGalleryView';
import { MediaListView } from '@/components/media/MediaListView';
import { MediaPreviewDialog } from '@/components/media/MediaPreviewDialog';
import { BulkActionsBar } from '@/components/media/BulkActionsBar';
import type {
  MediaFile,
  MediaStats,
  GetMediaResponse,
} from '@/types/media';
import { formatBytes } from '@/types/media';

type ViewMode = 'gallery' | 'list';

export default function MediaPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // View mode state
  const [viewMode, setViewMode] = React.useState<ViewMode>('gallery');

  // Data state
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [stats, setStats] = React.useState<MediaStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();

  // Filter state
  const [filters, setFilters] = React.useState<MediaFiltersState>({
    type: 'all',
    search: '',
    orphanedOnly: false,
    startDate: '',
    endDate: '',
  });

  // Selection state
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = React.useState<MediaFile | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = React.useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<'single' | 'bulk'>('single');
  const [deletingFile, setDeletingFile] = React.useState<MediaFile | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canManageMedia = currentUser?.role && hasPermission(currentUser.role, 'canDeleteMedia');

  // Fetch media files
  const fetchMedia = React.useCallback(
    async (loadMore = false) => {
      try {
        if (!loadMore) {
          setLoading(true);
        }

        const params = new URLSearchParams();
        if (filters.type !== 'all') params.set('type', filters.type);
        if (filters.orphanedOnly) params.set('orphaned', 'true');
        if (filters.startDate) params.set('startDate', new Date(filters.startDate).toISOString());
        if (filters.endDate) params.set('endDate', new Date(filters.endDate).toISOString());
        if (loadMore && nextCursor) params.set('startAfter', nextCursor);

        const response = await fetchWithAuth(`/api/media?${params}`);

        if (response.ok) {
          const data: GetMediaResponse = await response.json();

          if (loadMore) {
            setFiles((prev) => [...prev, ...data.files]);
          } else {
            setFiles(data.files);
          }

          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        } else {
          const error = await response.json();
          toast({
            title: 'Error',
            description: error.message || 'Failed to fetch media files',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching media:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch media files',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, nextCursor, toast]
  );

  // Fetch statistics
  const fetchStats = React.useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await fetchWithAuth('/api/media/stats');

      if (response.ok) {
        const data: MediaStats = await response.json();
        setStats(data);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch statistics',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch statistics',
        variant: 'destructive',
      });
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  React.useEffect(() => {
    fetchMedia();
    fetchStats();
  }, []);

  // Refetch when filters change
  React.useEffect(() => {
    fetchMedia();
  }, [filters]);

  // Apply client-side search filter
  const filteredFiles = React.useMemo(() => {
    if (!filters.search) return files;

    const query = filters.search.toLowerCase();
    return files.filter((file) => file.name.toLowerCase().includes(query));
  }, [files, filters.search]);

  // Handle selection change
  const handleSelectionChange = (fileId: string, selected: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  // Handle preview
  const handlePreview = (file: MediaFile) => {
    setPreviewFile(file);
    setPreviewDialogOpen(true);
  };

  // Handle single delete
  const handleDeleteSingle = (file: MediaFile) => {
    setDeletingFile(file);
    setDeleteTarget('single');
    setDeleteDialogOpen(true);
  };

  // Handle bulk delete
  const handleDeleteBulk = () => {
    setDeleteTarget('bulk');
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!canManageMedia) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to delete media files',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);

    try {
      if (deleteTarget === 'single' && deletingFile) {
        // Delete single file
        const response = await fetchWithAuth(`/api/media/${encodeURIComponent(deletingFile.id)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setFiles((prev) => prev.filter((f) => f.id !== deletingFile.id));
          toast({
            title: 'File deleted',
            description: 'The file has been successfully deleted.',
          });
          fetchStats(); // Refresh stats
        } else {
          const error = await response.json();
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete file',
            variant: 'destructive',
          });
        }
      } else if (deleteTarget === 'bulk') {
        // Bulk delete
        const filePaths = Array.from(selectedFiles);

        const response = await fetchWithAuth('/api/media/cleanup', {
          method: 'POST',
          body: JSON.stringify({ filePaths }),
        });

        if (response.ok) {
          const data = await response.json();

          setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.id)));
          setSelectedFiles(new Set());

          const successCount = data.deletedCount;
          const errorCount = data.errors?.length || 0;

          toast({
            title: 'Bulk delete completed',
            description: `${successCount} file(s) deleted successfully${
              errorCount > 0 ? `, ${errorCount} failed` : ''
            }.`,
          });

          fetchStats(); // Refresh stats
        } else {
          const error = await response.json();
          toast({
            title: 'Error',
            description: error.message || 'Failed to delete files',
            variant: 'destructive',
          });
        }
      }

      setDeleteDialogOpen(false);
      setDeletingFile(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete files',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Calculate total size of selected files
  const selectedTotalSize = React.useMemo(() => {
    return Array.from(selectedFiles).reduce((total, fileId) => {
      const file = files.find((f) => f.id === fileId);
      return total + (file?.size || 0);
    }, 0);
  }, [selectedFiles, files]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Manage your media files and storage
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 rounded-lg border p-1">
          <Button
            variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('gallery')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Gallery
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {/* Storage Statistics */}
      <MediaStatsCard stats={stats} loading={statsLoading} onRefresh={fetchStats} />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <MediaFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      {/* Media Files */}
      <Card>
        <CardContent className="pt-6">
          {viewMode === 'gallery' ? (
            <MediaGalleryView
              files={filteredFiles}
              selectedFiles={selectedFiles}
              onSelectionChange={handleSelectionChange}
              onPreview={handlePreview}
              onDelete={handleDeleteSingle}
              hasMore={hasMore}
              onLoadMore={() => fetchMedia(true)}
              loading={loading}
            />
          ) : (
            <MediaListView
              files={filteredFiles}
              selectedFiles={selectedFiles}
              onSelectionChange={handleSelectionChange}
              onPreview={handlePreview}
              onDelete={handleDeleteSingle}
              hasMore={hasMore}
              onLoadMore={() => fetchMedia(true)}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <MediaPreviewDialog
        file={previewFile}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        onDelete={handleDeleteSingle}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedFiles.size}
        totalSize={selectedTotalSize}
        onDelete={handleDeleteBulk}
        onClear={() => setSelectedFiles(new Set())}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === 'single' ? 'Delete File' : 'Delete Selected Files'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'single' ? (
                <>
                  Are you sure you want to delete <strong>{deletingFile?.name}</strong>? This
                  action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{selectedFiles.size} file(s)</strong>{' '}
                  ({formatBytes(selectedTotalSize)})? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
