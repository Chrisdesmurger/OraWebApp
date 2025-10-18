'use client';

import { useState, useEffect } from 'react';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            setStats(cachedStats.data);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch fresh data
      const response = await fetch('/api/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
      console.error('useStats error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
