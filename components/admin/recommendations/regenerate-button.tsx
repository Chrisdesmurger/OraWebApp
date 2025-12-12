/**
 * RegenerateButton Component
 * Button to manually trigger recommendation regeneration
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

interface RegenerateButtonProps {
  uid: string;
  onSuccess?: () => void;
}

export function RegenerateButton({ uid, onSuccess }: RegenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRegenerate = async () => {
    setIsLoading(true);

    try {
      const response = await fetchWithAuth(
        `/api/users/${uid}/recommendations/regenerate`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate recommendations');
      }

      const data = await response.json();

      toast({
        title: 'Succès',
        description: 'Les recommandations ont été recalculées avec succès',
        variant: 'default',
      });

      console.log('[RegenerateButton] Regeneration successful:', data);

      // Call success callback
      onSuccess?.();
    } catch (error: any) {
      console.error('[RegenerateButton] Error:', error);

      toast({
        title: 'Erreur',
        description:
          error.message || 'Impossible de recalculer les recommandations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRegenerate}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Recalcul en cours...' : 'Recalculer les recommandations'}
    </Button>
  );
}
