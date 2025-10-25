'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { type Program } from '@/types/program';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus } from 'lucide-react';
import { ProgramTable } from './_components/ProgramTable';
import { CreateProgramDialog } from './_components/CreateProgramDialog';
import { EditProgramDialog } from './_components/EditProgramDialog';
import { ManageLessonsDialog } from './_components/ManageLessonsDialog';
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

export default function ProgramsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingProgram, setEditingProgram] = React.useState<Program | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingProgramId, setDeletingProgramId] = React.useState<string | null>(null);
  const [manageLessonsOpen, setManageLessonsOpen] = React.useState(false);
  const [managingProgram, setManagingProgram] = React.useState<Program | null>(null);

  const canCreate = currentUser?.role && hasPermission(currentUser.role, 'canCreatePrograms');
  const canEdit = currentUser?.role && hasPermission(currentUser.role, 'canEditAllPrograms');

  const fetchPrograms = React.useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/programs');
      if (response.ok) {
        const data = await response.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const filteredPrograms = React.useMemo(() => {
    if (!searchQuery) return programs;
    const query = searchQuery.toLowerCase();
    return programs.filter(
      (program) =>
        program.title.toLowerCase().includes(query) ||
        program.description.toLowerCase().includes(query) ||
        program.category.toLowerCase().includes(query) ||
        program.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [programs, searchQuery]);

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setEditDialogOpen(true);
  };

  const handleDelete = (programId: string) => {
    setDeletingProgramId(programId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingProgramId) return;

    try {
      const response = await fetchWithAuth(`/api/programs/${deletingProgramId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPrograms((prev) => prev.filter((p) => p.id !== deletingProgramId));
        setDeleteDialogOpen(false);
        setDeletingProgramId(null);
        toast({
          title: "Program deleted",
          description: "The program has been successfully deleted.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || 'Failed to delete program',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      toast({
        title: "Error",
        description: 'Failed to delete program',
        variant: "destructive",
      });
    }
  };

  const handlePublishToggle = async (
    programId: string,
    newStatus: 'published' | 'draft' | 'archived'
  ) => {
    if (!canEdit) return;

    try {
      const response = await fetchWithAuth(`/api/programs/${programId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrograms((prev) =>
          prev.map((program) =>
            program.id === programId ? data.program : program
          )
        );
        toast({
          title: "Status updated",
          description: `Program status changed to ${newStatus}.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || 'Failed to update program status',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating program status:', error);
      toast({
        title: "Error",
        description: 'Failed to update program status',
        variant: "destructive",
      });
    }
  };

  const handleManageLessons = (program: Program) => {
    setManagingProgram(program);
    setManageLessonsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground">
            Manage learning programs and structured courses
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} disabled={!canCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Programs</CardTitle>
          <CardDescription>
            View and manage structured learning programs with lessons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ProgramTable
            programs={filteredPrograms}
            loading={loading}
            canEdit={canEdit || false}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublishToggle={handlePublishToggle}
            onManageLessons={handleManageLessons}
          />
        </CardContent>
      </Card>

      {/* Create Program Dialog */}
      <CreateProgramDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchPrograms}
      />

      {/* Edit Program Dialog */}
      <EditProgramDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        program={editingProgram}
        onSuccess={fetchPrograms}
      />

      {/* Manage Lessons Dialog */}
      <ManageLessonsDialog
        open={manageLessonsOpen}
        onOpenChange={setManageLessonsOpen}
        program={managingProgram}
        onSuccess={fetchPrograms}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be
              undone. All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
