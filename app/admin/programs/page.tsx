'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreHorizontal, GraduationCap } from 'lucide-react';

interface Program {
  id: string;
  title: string;
  description: string;
  duration: number;
  lessonCount: number;
  enrolledUsers: number;
  createdBy: string;
  createdAt: string;
  published: boolean;
}

export default function ProgramsPage() {
  const { user: currentUser } = useAuth();
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  const canCreate = currentUser?.role && hasPermission(currentUser.role, 'canCreatePrograms');
  const canEdit = currentUser?.role && hasPermission(currentUser.role, 'canEditAllPrograms');

  React.useEffect(() => {
    const fetchPrograms = async () => {
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
    };

    fetchPrograms();
  }, []);

  const filteredPrograms = React.useMemo(() => {
    return programs.filter((program) =>
      program.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [programs, searchQuery]);

  const handlePublishToggle = async (id: string, published: boolean) => {
    if (!canEdit) return;

    try {
      const response = await fetchWithAuth(`/api/programs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published }),
      });

      if (response.ok) {
        setPrograms((prev) =>
          prev.map((program) => (program.id === id ? { ...program, published } : program))
        );
      }
    } catch (error) {
      console.error('Error updating program:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground">Manage learning programs and challenges</p>
        </div>
        <Button disabled={!canCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Programs</CardTitle>
          <CardDescription>View and manage structured learning programs</CardDescription>
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

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-20 flex-1 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No programs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrograms.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                            <GraduationCap className="h-6 w-6" />
                          </div>
                          <div className="max-w-md">
                            <div className="font-medium">{program.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {program.description}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              by {program.createdBy}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {program.duration} days
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {program.lessonCount} lessons
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{program.enrolledUsers} users</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={program.published ? 'success' : 'warning'}>
                          {program.published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem disabled={!canEdit}>
                              Edit Program
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canEdit}>
                              Manage Lessons
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canEdit}
                              onClick={() =>
                                handlePublishToggle(program.id, !program.published)
                              }
                            >
                              {program.published ? 'Unpublish' : 'Publish'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!canEdit}
                              className="text-red-600 focus:text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
