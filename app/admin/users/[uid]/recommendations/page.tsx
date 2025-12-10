/**
 * User Recommendations Page
 * Displays personalized lesson recommendations for a specific user
 * Route: /admin/users/[uid]/recommendations
 */

'use client';

import { use, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import {
  RecommendationWithLessons,
  RecommendationHistoryItem,
} from '@/types/recommendation';
import { RecommendationMetadataCard } from '@/components/admin/recommendations/recommendation-metadata-card';
import { RecommendedLessonsTable } from '@/components/admin/recommendations/recommended-lessons-table';
import { RecommendationContext } from '@/components/admin/recommendations/recommendation-context';
import { RecommendationHistoryTable } from '@/components/admin/recommendations/recommendation-history-table';
import { RegenerateButton } from '@/components/admin/recommendations/regenerate-button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface UserRecommendationsPageProps {
  params: Promise<{ uid: string }>;
}

export default function UserRecommendationsPage({
  params,
}: UserRecommendationsPageProps) {
  const { uid } = use(params);
  const [recommendation, setRecommendation] =
    useState<RecommendationWithLessons | null>(null);
  const [history, setHistory] = useState<RecommendationHistoryItem[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const response = await fetchWithAuth(`/api/users/${uid}`);
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        setUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      }
    } catch (err) {
      console.error('[Page] Error fetching user:', err);
    }
  };

  // Fetch latest recommendation
  const fetchRecommendation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/users/${uid}/recommendations`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError(
            'Aucune recommandation trouvée pour cet utilisateur. Les recommandations sont générées après l\'onboarding.'
          );
          return;
        }
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendation(data.recommendation);
    } catch (err: any) {
      console.error('[Page] Error fetching recommendation:', err);
      setError(
        err.message || 'Impossible de charger les recommandations'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recommendation history
  const fetchHistory = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/users/${uid}/recommendations/history`
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('[Page] Error fetching history:', err);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchUserData();
    fetchRecommendation();
    fetchHistory();
  }, [uid]);

  // Handle successful regeneration
  const handleRegenerateSuccess = () => {
    // Refetch recommendations after regeneration
    setTimeout(() => {
      fetchRecommendation();
      fetchHistory();
    }, 2000); // Wait 2s for Cloud Function to complete
  };

  // Handle view lesson
  const handleViewLesson = (lessonId: string) => {
    // Open lesson detail in new tab
    window.open(`/admin/content/${lessonId}`, '_blank');
  };

  // Handle view history
  const handleViewHistory = (historyId: string) => {
    // TODO: Implement history detail view
    console.log('[Page] View history:', historyId);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour aux utilisateurs
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Recommandations personnalisées
            </h1>
            {userName && (
              <p className="text-gray-500 mt-1">
                Pour l'utilisateur : <span className="font-medium">{userName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Regenerate Button (Admin only) */}
        {!isLoading && !error && (
          <RegenerateButton uid={uid} onSuccess={handleRegenerateSuccess} />
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Recommendation Data */}
      {recommendation && !isLoading && !error && (
        <div className="space-y-6">
          {/* Metadata Card */}
          <RecommendationMetadataCard recommendation={recommendation} />

          {/* Recommended Lessons Table */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Leçons recommandées (Top 5)
            </h2>
            <RecommendedLessonsTable
              lessons={recommendation.lessons}
              onViewLesson={handleViewLesson}
            />
          </Card>

          {/* Context Section */}
          <RecommendationContext recommendation={recommendation} />

          {/* History Section */}
          {history.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Historique des recommandations
              </h2>
              <RecommendationHistoryTable
                history={history}
                onViewHistory={handleViewHistory}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
