'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { LessonFilters } from './_components/LessonFilters';
import { LessonTable } from './_components/LessonTable';
import { CreateLessonDialog } from './_components/CreateLessonDialog';
import { EditLessonDialog } from './_components/EditLessonDialog';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/hooks/use-toast';
import type { Lesson, LessonStatus, LessonType } from '@/types/lesson';

interface Program {
  id: string;
  title: string;
}

export default function ContentPage() {
  const { user: currentUser } = useAuth();
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filter state
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<LessonStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = React.useState<LessonType | 'all'>('all');
  const [programFilter, setProgramFilter] = React.useState<string>('all');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedLesson, setSelectedLesson] = React.useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = React.useState<string | null>(null);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = React.useState(false);

  const canCreate = currentUser?.role && hasPermission(currentUser.role, 'canCreateContent');

  // Fetch lessons
  const fetchLessons = React.useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);

        // Check if any lessons are uploading or processing
        const hasActiveUploads = data.lessons?.some(
          (lesson: Lesson) =>
            lesson.status === 'uploading' || lesson.status === 'processing'
        );
        setAutoRefresh(hasActiveUploads);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch lessons',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch lessons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch programs from API
  const fetchPrograms = React.useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/programs');
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      } else {
        console.error('Failed to fetch programs');
        toast({
          title: 'Warning',
          description: 'Failed to fetch programs. Some features may be limited.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Warning',
        description: 'Failed to fetch programs. Some features may be limited.',
        variant: 'destructive',
      });
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchLessons();
    fetchPrograms();
  }, [fetchLessons, fetchPrograms]);

  // Auto-refresh every 30 seconds if there are active uploads/processing
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLessons();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchLessons]);

  // Filter lessons
  const filteredLessons = React.useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSearch = lesson.title.toLowerCase().includes(search.toLowerCase()) ||
        lesson.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || lesson.status === statusFilter;
      const matchesType = typeFilter === 'all' || lesson.type === typeFilter;
      const matchesProgram = programFilter === 'all' || lesson.programId === programFilter;

      return matchesSearch && matchesStatus && matchesType && matchesProgram;
    });
  }, [lessons, search, statusFilter, typeFilter, programFilter]);

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setProgramFilter('all');
  };

  // Handle edit
  const handleEdit = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setEditDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (lessonId: string) => {
    setLessonToDelete(lessonId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!lessonToDelete) return;

    try {
      const response = await fetchWithAuth(`/api/lessons/${lessonToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Lesson deleted successfully',
        });
        fetchLessons();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to delete lesson',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lesson',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setLessonToDelete(null);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (lesson: Lesson) => {
    try {
      const response = await fetchWithAuth('/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: `${lesson.title} (Copy)`,
          type: lesson.type,
          programId: lesson.programId,
          order: lesson.order,
          tags: lesson.tags,
          transcript: lesson.transcript,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Lesson duplicated successfully (metadata only). Upload a file to complete.',
        });
        fetchLessons();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to duplicate lesson',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error duplicating lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate lesson',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
          <p className="text-muted-foreground">
            Manage meditation, yoga, and lesson content
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLessons}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={!canCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Lesson
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Lessons</CardTitle>
          <CardDescription>
            View and manage your lesson library
            {autoRefresh && (
              <span className="ml-2 text-orange-600">
                (Auto-refreshing - uploads in progress)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <LessonFilters
            search={search}
            status={statusFilter}
            type={typeFilter}
            programId={programFilter}
            programs={programs}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            onTypeChange={setTypeFilter}
            onProgramChange={setProgramFilter}
            onReset={handleResetFilters}
          />

          {/* Loading skeleton */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : currentUser ? (
            /* Lesson table */
            <LessonTable
              lessons={filteredLessons}
              programs={programs}
              currentUser={currentUser}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading user information...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateLessonDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        programs={programs}
        onSuccess={() => {
          toast({
            title: 'Success',
            description: 'Lesson created successfully',
          });
          fetchLessons();
        }}
      />

      {/* Edit Dialog */}
      <EditLessonDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lesson={selectedLesson}
        programs={programs}
        onSuccess={() => {
          toast({
            title: 'Success',
            description: 'Lesson updated successfully',
          });
          fetchLessons();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lesson and
              all associated files from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
