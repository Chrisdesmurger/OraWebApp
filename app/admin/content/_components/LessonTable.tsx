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
import { LessonStatusBadge } from './LessonStatusBadge';
import { MoreHorizontal, Edit, Copy, Trash2, Eye, Globe } from 'lucide-react';
import type { Lesson, MultilingualText } from '@/types/lesson';
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
}

/**
 * Helper to get display text from multilingual field
 */
function getDisplayText(text: MultilingualText | string | null | undefined): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.fr || text.en || text.es || '';
}

/**
 * Get translation status for a lesson
 */
function getTranslationStatus(lesson: Lesson): { fr: boolean; en: boolean; es: boolean } {
  return {
    fr: !!(lesson.title?.fr),
    en: !!(lesson.title?.en),
    es: !!(lesson.title?.es),
  };
}

export function LessonTable({
  lessons,
  programs,
  currentUser,
  onEdit,
  onDelete,
  onDuplicate,
}: LessonTableProps) {
  const router = useRouter();

  const getProgramTitle = (programId: string) => {
    // If no programId, lesson is standalone
    if (!programId) {
      return null;
    }
    const program = programs.find((p) => p.id === programId);
    return program?.title || 'Unknown Program';
  };

  const canEdit = (lesson: Lesson) => {
    if (!currentUser.role) return false;
    return canEditResource(currentUser.role, 'content', lesson.authorId, currentUser.uid);
  };

  const canDelete = (lesson: Lesson) => {
    if (!currentUser.role) return false;
    // Only admins can delete
    return currentUser.role === 'admin';
  };

  const handleViewDetails = (lessonId: string) => {
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
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Program</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>i18n</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lessons.map((lesson) => {
          const translationStatus = getTranslationStatus(lesson);
          const lessonTitle = getDisplayText(lesson.title);

          return (
            <TableRow key={lesson.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{lessonTitle}</span>
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
                {getProgramTitle(lesson.programId) ? (
                  <span className="text-sm">{getProgramTitle(lesson.programId)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No program</span>
                )}
              </TableCell>
              <TableCell>
                <LessonStatusBadge status={lesson.status} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge
                    variant={translationStatus.fr ? 'default' : 'secondary'}
                    className="text-xs px-1"
                    title={translationStatus.fr ? 'French available' : 'French missing'}
                  >
                    FR
                  </Badge>
                  <Badge
                    variant={translationStatus.en ? 'default' : 'outline'}
                    className="text-xs px-1"
                    title={translationStatus.en ? 'English available' : 'English missing'}
                  >
                    EN
                  </Badge>
                  <Badge
                    variant={translationStatus.es ? 'default' : 'outline'}
                    className="text-xs px-1"
                    title={translationStatus.es ? 'Spanish available' : 'Spanish missing'}
                  >
                    ES
                  </Badge>
                </div>
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
