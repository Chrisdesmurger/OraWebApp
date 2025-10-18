/**
 * Dashboard Statistics Types
 * These types define the shape of data used throughout the analytics dashboard
 */

/**
 * Main dashboard statistics returned from /api/stats
 */
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

/**
 * User growth data point for time-series charts
 */
export interface UserGrowthData {
  date: string;        // ISO date string
  totalUsers: number;  // Cumulative total users
  newUsers: number;    // New users registered on this date
  activeUsers: number; // Active users on this date
}

/**
 * Activity data point for time-series charts
 */
export interface ActivityData {
  date: string;        // ISO date string
  sessions: number;    // Number of sessions started
  completions: number; // Number of sessions completed
  avgDuration: number; // Average session duration in minutes
}

/**
 * Content statistics for pie/donut charts
 */
export interface ContentStatsData {
  name: string;  // Category name (e.g., "Meditation", "Yoga")
  value: number; // Count or percentage
}

/**
 * Program enrollment data
 */
export interface ProgramEnrollmentData {
  programId: string;
  programName: string;
  enrollments: number;
  completions: number;
  avgProgress: number; // Percentage (0-100)
}

/**
 * User retention cohort data
 */
export interface RetentionData {
  cohort: string;      // e.g., "2025-10"
  day0: number;        // Users on day 0 (100%)
  day1: number;        // Users active on day 1
  day7: number;        // Users active on day 7
  day30: number;       // Users active on day 30
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  date: string;
  dau: number;         // Daily Active Users
  wau: number;         // Weekly Active Users
  mau: number;         // Monthly Active Users
  dauMauRatio: number; // Stickiness ratio (DAU/MAU)
}

/**
 * Revenue metrics (for future use)
 */
export interface RevenueMetrics {
  date: string;
  revenue: number;
  subscriptions: number;
  arpu: number;        // Average Revenue Per User
  mrr: number;         // Monthly Recurring Revenue
}

/**
 * Cached statistics with timestamp
 */
export interface CachedStats<T> {
  data: T;
  timestamp: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Time range filter options
 */
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Chart data fetching status
 */
export interface ChartDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetched?: number;
}
