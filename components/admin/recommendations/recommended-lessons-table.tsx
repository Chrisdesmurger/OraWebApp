/**
 * RecommendedLessonsTable Component
 * Displays recommended lessons with scores, difficulty, and actions
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecommendedLesson } from '@/types/recommendation';
import { getScoreBadgeColor } from '@/types/recommendation';
import { Eye, ExternalLink } from 'lucide-react';

interface RecommendedLessonsTableProps {
  lessons: RecommendedLesson[];
  onViewLesson?: (lessonId: string) => void;
}

/**
 * Format duration from seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}min ${remainingSeconds}s`
      : `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}min`
    : `${hours}h`;
}

/**
 * Get difficulty badge color
 */
function getDifficultyBadgeColor(difficulty: string): string {
  const lower = difficulty.toLowerCase();

  if (lower.includes('débutant') || lower === 'beginner') {
    return 'bg-green-100 text-green-800 border-green-200';
  }

  if (lower.includes('intermédiaire') || lower === 'intermediate') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  if (lower.includes('avancé') || lower === 'advanced') {
    return 'bg-red-100 text-red-800 border-red-200';
  }

  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export function RecommendedLessonsTable({
  lessons,
  onViewLesson,
}: RecommendedLessonsTableProps) {
  if (lessons.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune leçon recommandée
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rang</TableHead>
            <TableHead>Leçon</TableHead>
            <TableHead>Discipline</TableHead>
            <TableHead>Difficulté</TableHead>
            <TableHead>Durée</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((lesson) => (
            <TableRow
              key={lesson.id}
              className={
                lesson.rank <= 5
                  ? 'bg-blue-50/50 hover:bg-blue-50'
                  : undefined
              }
            >
              {/* Rank */}
              <TableCell className="font-bold text-center">
                {lesson.rank <= 5 ? (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    #{lesson.rank}
                  </Badge>
                ) : (
                  `#${lesson.rank}`
                )}
              </TableCell>

              {/* Lesson Title */}
              <TableCell>
                <div>
                  <p className="font-medium">{lesson.title}</p>
                  {lesson.programTitle && (
                    <p className="text-sm text-gray-500">{lesson.programTitle}</p>
                  )}
                </div>
              </TableCell>

              {/* Discipline */}
              <TableCell>
                <Badge variant="outline">{lesson.discipline}</Badge>
              </TableCell>

              {/* Difficulty */}
              <TableCell>
                <Badge className={getDifficultyBadgeColor(lesson.difficulty)}>
                  {lesson.difficulty}
                </Badge>
              </TableCell>

              {/* Duration */}
              <TableCell>{formatDuration(lesson.duration)}</TableCell>

              {/* Score */}
              <TableCell>
                <Badge className={getScoreBadgeColor(lesson.score)}>
                  {(lesson.score * 100).toFixed(0)}%
                </Badge>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewLesson?.(lesson.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/admin/content/${lesson.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
