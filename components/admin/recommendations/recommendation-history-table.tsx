/**
 * RecommendationHistoryTable Component
 * Displays historical recommendations for a user
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
import { RecommendationHistoryItem } from '@/types/recommendation';
import {
  formatTriggerLabel,
  getTriggerBadgeColor,
} from '@/types/recommendation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Eye } from 'lucide-react';

interface RecommendationHistoryTableProps {
  history: RecommendationHistoryItem[];
  onViewHistory?: (historyId: string) => void;
}

export function RecommendationHistoryTable({
  history,
  onViewHistory,
}: RecommendationHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun historique de recommandations disponible
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Déclencheur</TableHead>
            <TableHead>Nombre de leçons</TableHead>
            <TableHead>Score moyen</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((item) => (
            <TableRow key={item.id}>
              {/* Generated Date */}
              <TableCell>
                <div>
                  <p className="font-medium">
                    {format(item.generatedAt, 'd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(item.generatedAt, 'HH:mm', { locale: fr })}
                  </p>
                </div>
              </TableCell>

              {/* Trigger */}
              <TableCell>
                <Badge className={getTriggerBadgeColor(item.trigger)}>
                  {formatTriggerLabel(item.trigger)}
                </Badge>
              </TableCell>

              {/* Lesson Count */}
              <TableCell>{item.lessonCount} leçons</TableCell>

              {/* Average Score */}
              <TableCell>
                <Badge variant="outline">
                  {(item.avgScore * 100).toFixed(1)}%
                </Badge>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewHistory?.(item.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
