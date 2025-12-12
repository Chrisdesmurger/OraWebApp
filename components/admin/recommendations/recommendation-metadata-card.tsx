/**
 * RecommendationMetadataCard Component
 * Displays metadata about a recommendation (algorithm version, trigger, scores, etc.)
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Recommendation } from '@/types/recommendation';
import {
  formatTriggerLabel,
  getTriggerBadgeColor,
} from '@/types/recommendation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RecommendationMetadataCardProps {
  recommendation: Recommendation;
}

export function RecommendationMetadataCard({
  recommendation,
}: RecommendationMetadataCardProps) {
  const { generatedAt, algorithmVersion, metadata } = recommendation;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Métadonnées de recommandation</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Generated At */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Généré le</p>
          <p className="font-medium">
            {format(generatedAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </div>

        {/* Trigger Type */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Type de déclencheur</p>
          <Badge className={getTriggerBadgeColor(metadata.trigger)}>
            {formatTriggerLabel(metadata.trigger)}
          </Badge>
        </div>

        {/* Algorithm Version */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Version de l'algorithme</p>
          <p className="font-medium font-mono">{algorithmVersion}</p>
        </div>

        {/* Total Lessons Scored */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Leçons évaluées</p>
          <p className="font-medium">{metadata.totalLessonsScored} leçons</p>
        </div>

        {/* Average Score */}
        <div className="md:col-span-2 lg:col-span-1">
          <p className="text-sm text-gray-500 mb-1">Score moyen</p>
          <p className="font-medium">
            {(metadata.avgScore * 100).toFixed(1)}%
          </p>
        </div>

        {/* Top 5 Recommendations */}
        <div className="md:col-span-2 lg:col-span-3">
          <p className="text-sm text-gray-500 mb-1">
            Recommandations principales
          </p>
          <p className="font-medium">{recommendation.lessonIds.length} leçons</p>
        </div>
      </div>
    </Card>
  );
}
