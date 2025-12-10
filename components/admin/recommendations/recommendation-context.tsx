/**
 * RecommendationContext Component
 * Displays the context used to generate recommendations
 * (intentions, experience levels, time commitment, completed lessons)
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Recommendation } from '@/types/recommendation';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RecommendationContextProps {
  recommendation: Recommendation;
}

export function RecommendationContext({
  recommendation,
}: RecommendationContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { basedOn } = recommendation;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Contexte de génération</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Masquer
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Afficher
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Intentions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Intentions de l'utilisateur
            </p>
            {basedOn.intentions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {basedOn.intentions.map((intention, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200"
                  >
                    {intention}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune intention définie</p>
            )}
          </div>

          {/* Experience Levels */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Niveaux d'expérience par discipline
            </p>
            {Object.keys(basedOn.experienceLevels).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(basedOn.experienceLevels).map(
                  ([discipline, level]) => (
                    <div
                      key={discipline}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <span className="font-medium text-sm">{discipline}</span>
                      <Badge variant="outline" className="ml-2">
                        {level}
                      </Badge>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Aucun niveau d'expérience défini
              </p>
            )}
          </div>

          {/* Time Commitment */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Engagement de temps préféré
            </p>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {basedOn.timeCommitment || 'Non spécifié'}
            </Badge>
          </div>

          {/* Completed Lessons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Leçons déjà complétées (exclues)
            </p>
            <p className="text-sm text-gray-600">
              {basedOn.completedLessonIds.length} leçon(s) complétée(s)
            </p>
            {basedOn.completedLessonIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Ces leçons ont été exclues des recommandations pour éviter les
                doublons
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
