'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  isLoading = false,
  className,
}: KpiCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    return change > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) {
      return 'text-muted-foreground';
    }
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getTrendIcon()}
                <span className={cn('font-medium', getTrendColor())}>
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
                <span>{changeLabel}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
