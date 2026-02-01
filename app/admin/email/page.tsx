'use client';

/**
 * Email Dashboard Page
 *
 * Shows email analytics, recent sends, and quick actions
 */

import * as React from 'react';
import Link from 'next/link';
import { KpiCard } from '@/components/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Eye,
  MousePointer,
  FileText,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  last7Days: {
    sent: number;
    delivered: number;
    opened: number;
  };
}

interface RecentEmail {
  id: string;
  emailType: string;
  recipientEmail: string;
  status: string;
  sentAt: number;
  language: string;
}

export default function EmailDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<EmailStats | null>(null);
  const [recentEmails, setRecentEmails] = React.useState<RecentEmail[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchEmailStats = React.useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        fetchWithAuth('/api/email/stats'),
        fetchWithAuth('/api/email/logs?limit=10'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setRecentEmails(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEmailStats();
  }, [fetchEmailStats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Delivered</Badge>;
      case 'opened':
        return <Badge variant="default" className="bg-blue-500">Opened</Badge>;
      case 'clicked':
        return <Badge variant="default" className="bg-purple-500">Clicked</Badge>;
      case 'sent':
        return <Badge variant="secondary">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'bounced':
        return <Badge variant="destructive">Bounced</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatEmailType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor email delivery and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEmailStats} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/email/templates">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Emails Sent"
          value={stats?.totalSent ?? 0}
          icon={<Send className="h-4 w-4" />}
          isLoading={loading}
          changeLabel={`${stats?.last7Days?.sent ?? 0} last 7 days`}
        />
        <KpiCard
          title="Delivery Rate"
          value={`${stats?.deliveryRate?.toFixed(1) ?? 0}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          isLoading={loading}
          changeLabel={`${stats?.totalDelivered ?? 0} delivered`}
        />
        <KpiCard
          title="Open Rate"
          value={`${stats?.openRate?.toFixed(1) ?? 0}%`}
          icon={<Eye className="h-4 w-4" />}
          isLoading={loading}
          changeLabel={`${stats?.totalOpened ?? 0} opened`}
        />
        <KpiCard
          title="Click Rate"
          value={`${stats?.clickRate?.toFixed(1) ?? 0}%`}
          icon={<MousePointer className="h-4 w-4" />}
          isLoading={loading}
          changeLabel={`${stats?.totalClicked ?? 0} clicked`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Emails */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>Latest email sends and their status</CardDescription>
            </div>
            <Link href="/admin/email/logs">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                      <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : recentEmails.length > 0 ? (
                recentEmails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                        <Mail className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatEmailType(email.emailType)}</p>
                        <p className="text-xs text-muted-foreground">
                          {email.recipientEmail} • {formatDistanceToNow(email.sentAt, { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(email.status)}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No emails sent yet</p>
                  <p className="text-sm mt-2">Email history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Stats */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common email management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/admin/email/templates" className="block">
                <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                  <div className="font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Templates
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    View and edit email templates
                  </div>
                </button>
              </Link>
              <Link href="/admin/email/logs" className="block">
                <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                  <div className="font-medium flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    View All Logs
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Complete email delivery history
                  </div>
                </button>
              </Link>
              <button className="w-full rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors">
                <div className="font-medium flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Email Settings
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Configure email preferences
                </div>
              </button>
            </div>

            {/* Error Summary */}
            {stats && stats.totalFailed > 0 && (
              <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {stats.totalFailed} failed emails
                  </span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Check logs for delivery issues
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Email Types</CardTitle>
          <CardDescription>Available email templates and their usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { type: 'Authentication', templates: ['Magic Link', 'Password Reset', 'Security Alert'], color: 'bg-blue-500' },
              { type: 'Welcome', templates: ['Welcome', 'Onboarding Complete'], color: 'bg-green-500' },
              { type: 'Engagement', templates: ['Inactivity Reminder', 'Streak Milestone'], color: 'bg-purple-500' },
              { type: 'Marketing', templates: ['New Content', 'Weekly Digest'], color: 'bg-orange-500' },
            ].map((category) => (
              <div key={category.type} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-3 w-3 rounded-full ${category.color}`} />
                  <span className="font-medium">{category.type}</span>
                </div>
                <div className="space-y-1">
                  {category.templates.map((template) => (
                    <div key={template} className="text-sm text-muted-foreground">
                      {template}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
