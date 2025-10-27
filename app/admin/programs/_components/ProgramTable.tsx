'use client';

import * as React from 'react';
import { Program } from '@/types/program';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, Brain, User, Sparkles, Heart } from 'lucide-react';

interface ProgramTableProps {
  programs: Program[];
  loading: boolean;
  canEdit: boolean;
  onEdit: (program: Program) => void;
  onDelete: (programId: string) => void;
  onPublishToggle: (programId: string, newStatus: 'published' | 'draft' | 'archived') => void;
  onManageLessons: (program: Program) => void;
}

export function ProgramTable({
  programs,
  loading,
  canEdit,
  onEdit,
  onDelete,
  onPublishToggle,
  onManageLessons,
}: ProgramTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-20 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'meditation':
        return 'from-purple-400 to-purple-600';
      case 'yoga':
        return 'from-green-400 to-green-600';
      case 'mindfulness':
        return 'from-blue-400 to-blue-600';
      case 'wellness':
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconClass = "h-6 w-6";
    switch (category) {
      case 'meditation':
        return <Brain className={iconClass} />;
      case 'yoga':
        return <User className={iconClass} />;
      case 'mindfulness':
        return <Sparkles className={iconClass} />;
      case 'wellness':
        return <Heart className={iconClass} />;
      default:
        return <Brain className={iconClass} />;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      beginner: { label: 'Beginner', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
      intermediate: { label: 'Intermediate', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
      advanced: { label: 'Advanced', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
    };

    const variant = variants[difficulty] || { label: difficulty, className: '' };
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Program</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Lessons</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {programs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No programs found. Create your first program to get started!
            </TableCell>
          </TableRow>
        ) : (
          programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {program.coverImageUrl ? (
                    <div className="h-12 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={program.coverImageUrl}
                        alt={program.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${getCategoryColor(program.category)} text-white flex-shrink-0`}>
                      {getCategoryIcon(program.category)}
                    </div>
                  )}
                  <div className="max-w-md">
                    <div className="font-medium">{program.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {program.description}
                    </div>
                    {program.tags && program.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {program.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {program.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{program.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {program.category}
                </Badge>
              </TableCell>
              <TableCell>
                {getDifficultyBadge(program.difficulty)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {program.durationDays} {program.durationDays === 1 ? 'day' : 'days'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {program.lessons?.length || 0} {program.lessons?.length === 1 ? 'lesson' : 'lessons'}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(program.status)} className="capitalize">
                  {program.status}
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
                    <DropdownMenuItem
                      disabled={!canEdit}
                      onClick={() => onEdit(program)}
                    >
                      Edit Program
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canEdit}
                      onClick={() => onManageLessons(program)}
                    >
                      Manage Lessons
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canEdit}
                      onClick={() => {
                        const newStatus = program.status === 'published' ? 'draft' : 'published';
                        onPublishToggle(program.id, newStatus as 'published' | 'draft');
                      }}
                    >
                      {program.status === 'published' ? 'Unpublish' : 'Publish'}
                    </DropdownMenuItem>
                    {program.status !== 'archived' && (
                      <DropdownMenuItem
                        disabled={!canEdit}
                        onClick={() => onPublishToggle(program.id, 'archived')}
                      >
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!canEdit}
                      className="text-red-600 focus:text-red-600"
                      onClick={() => onDelete(program.id)}
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
  );
}
