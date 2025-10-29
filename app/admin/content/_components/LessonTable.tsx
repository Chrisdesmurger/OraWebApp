'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LessonStatusBadge } from './LessonStatusBadge';
import { MoreHorizontal, Edit, Copy, Trash2, Eye } from 'lucide-react';
import type { Lesson } from '@/types/lesson';
import type { AuthUser } from '@/lib/auth/auth-context';
import { canEditResource } from '@/lib/rbac';
import { formatDistanceToNow } from '@/lib/utils/date';

interface Program {
  id: string;
  title: string;
}

interface LessonTableProps {
  lessons: Lesson[];
  programs: Program[];
  currentUser: AuthUser;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onDuplicate: (lesson: Lesson) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function LessonTable({
  lessons,
  programs,
  currentUser,
  onEdit,
  onDelete,
  onDuplicate,
  selectedIds,
  onSelectionChange,
}: LessonTableProps) {
  const router = useRouter();

  const handleSelectAll = React.useCallback(
    (checked: boolean | 'indeterminate') => {
      // Only select/deselect on true boolean values, ignore indeterminate
      if (checked === true) {
        onSelectionChange(lessons.map((l) => l.id));
      } else if (checked === false) {
        onSelectionChange([]);
      }
    },
    [lessons, onSelectionChange]
  );

  const handleSelectOne = React.useCallback(
    (lessonId: string, checked: boolean | 'indeterminate') => {
      // Only handle true boolean values, ignore indeterminate
      if (checked === true) {
        onSelectionChange([...selectedIds, lessonId]);
      } else if (checked === false) {
        onSelectionChange(selectedIds.filter((id) => id !== lessonId));
      }
    },
    [selectedIds, onSelectionChange]
  );

  const isAllSelected = lessons.length > 0 && selectedIds.length === lessons.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < lessons.length;

  const getProgramTitle = (programId: string): string => {
    const program = programs.find((p) => p.id === programId);
    return program?.title || 'Unknown Program';
  };

  const canEdit = (lesson: Lesson): boolean => {
    if (!currentUser.role) return false;
    return canEditResource(currentUser.role, 'content', lesson.authorId, currentUser.uid);
  };

  const canDelete = (lesson: Lesson): boolean => {
    if (!currentUser.role) return false;
    // Only admins can delete
    return currentUser.role === 'admin';
  };

  const handleViewDetails = (lessonId: string): void => {
    router.push(`/admin/content/${lessonId}`);
  };

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No lessons found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first lesson to get started
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all lessons"
              className={isIndeterminate ? 'data-[state=checked]:bg-primary/50' : ''}
            />
          </TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Program</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lessons.map((lesson) => {
          const isSelected = selectedIds.includes(lesson.id);
          return (
            <TableRow
              key={lesson.id}
              className={isSelected ? 'bg-muted/50' : ''}
            >
              <TableCell>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectOne(lesson.id, checked)}
                  aria-label={`Select ${lesson.title}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{lesson.title}</span>
                  {lesson.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {lesson.tags.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {lesson.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{lesson.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {lesson.type}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">{getProgramTitle(lesson.programId)}</span>
              </TableCell>
              <TableCell>
                <LessonStatusBadge status={lesson.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(lesson.updatedAt))}
                </span>
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
                    <DropdownMenuItem onClick={() => handleViewDetails(lesson.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canEdit(lesson)}
                      onClick={() => onEdit(lesson)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(lesson)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canDelete(lesson)}
                      onClick={() => onDelete(lesson.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
