'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { useAuth } from '@/lib/auth/auth-context';

export interface DashboardStats {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalPrograms: number;
  totalLessons: number;
  totalMedia: number;
  totalMediaSizeMB: number;
  lastUpdated: string;
}

const CACHE_KEY = 'ora-dashboard-stats';
const CACHE_DURATION = 60 * 1000; // 60 seconds

interface CachedStats {
  data: DashboardStats;
  timestamp: number;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('[useStats] Hook initialized - User:', user ? `${user.email} (${user.uid})` : 'NULL');

  const fetchStats = async (useCache = true) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      if (useCache && typeof window !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedStats: CachedStats = JSON.parse(cached);
          const isExpired = Date.now() - cachedStats.timestamp > CACHE_DURATION;

          if (!isExpired) {
            console.log('[useStats] Using cached data');
            setStats(cachedStats.data);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch fresh data - cookies are sent automatically with fetchWithAuth
      console.log('[useStats] Fetching fresh data from API');
      const response = await fetchWithAuth('/api/stats');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to fetch stats: ${response.statusText}`);
      }

      const data: DashboardStats = await response.json();

      // Update cache
      if (typeof window !== 'undefined') {
        const cacheData: CachedStats = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      }

      setStats(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(errorMessage);
      console.error('useStats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is authenticated
    if (user) {
      fetchStats();
    }
  }, [user]);

  const refresh = () => {
    fetchStats(false);
  };

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}
