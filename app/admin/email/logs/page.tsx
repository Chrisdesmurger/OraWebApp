'use client';

/**
 * Email Logs Page
 *
 * Shows complete email delivery history with filtering
 */

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailLog {
  id: string;
  emailType: string;
  recipientEmail: string;
  recipientUid?: string;
  status: string;
  sentAt: number;
  deliveredAt?: number;
  openedAt?: number;
  clickedAt?: number;
  language: string;
  errorMessage?: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const EMAIL_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'magic_link', label: 'Magic Link' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'security_alert', label: 'Security Alert' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'onboarding_complete', label: 'Onboarding Complete' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'failed', label: 'Failed' },
  { value: 'bounced', label: 'Bounced' },
];

export default function EmailLogsPage() {
  const [logs, setLogs] = React.useState<EmailLog[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [emailType, setEmailType] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(0);
  const limit = 20;

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', (currentPage * limit).toString());

      if (emailType !== 'all') {
        params.set('emailType', emailType);
      }
      if (status !== 'all') {
        params.set('status', status);
      }
      if (search) {
        params.set('recipientEmail', search);
      }

      const response = await fetchWithAuth(`/api/email/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, emailType, status, search]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    fetchLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-500 hover:bg-green-600">Delivered</Badge>;
      case 'opened':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Opened</Badge>;
      case 'clicked':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Clicked</Badge>;
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

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/email">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
            <p className="text-muted-foreground">
              Complete email delivery history
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={emailType} onValueChange={(v) => { setEmailType(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Email Type" />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-8 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatEmailType(log.emailType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.recipientEmail}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {log.language}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(log.sentAt, 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.errorMessage ? (
                        <span className="text-xs text-red-500" title={log.errorMessage}>
                          {log.errorMessage.substring(0, 30)}...
                        </span>
                      ) : log.openedAt ? (
                        <span className="text-xs text-muted-foreground">
                          Opened {format(log.openedAt, 'dd/MM HH:mm')}
                        </span>
                      ) : log.deliveredAt ? (
                        <span className="text-xs text-muted-foreground">
                          Delivered {format(log.deliveredAt, 'dd/MM HH:mm')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No email logs found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && pagination.total > limit && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {currentPage * limit + 1} to {Math.min((currentPage + 1) * limit, pagination.total)} of {pagination.total} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
