'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import type { OnboardingConfig } from '@/types/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, Settings, BarChart3 } from 'lucide-react';
import { OnboardingTable } from './_components/OnboardingTable';
import Link from 'next/link';

export default function OnboardingPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = React.useState<OnboardingConfig[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'draft' | 'active' | 'archived'>('all');

  const canCreate = currentUser?.role === 'admin';

  const fetchConfigs = React.useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') {
        queryParams.set('status', statusFilter);
      }

      const response = await fetchWithAuth(`/api/admin/onboarding?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch onboarding configurations',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching onboarding configs:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while fetching configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  React.useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const filteredConfigs = React.useMemo(() => {
    if (!searchQuery) return configs;
    const query = searchQuery.toLowerCase();
    return configs.filter(
      (config) =>
        config.title.toLowerCase().includes(query) ||
        config.description.toLowerCase().includes(query) ||
        config.version.toLowerCase().includes(query)
    );
  }, [configs, searchQuery]);

  const handlePublish = async (configId: string) => {
    try {
      const response = await fetchWithAuth(`/api/admin/onboarding/${configId}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Onboarding configuration published successfully',
        });
        await fetchConfigs();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to publish configuration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while publishing',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/admin/onboarding/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== configId));
        toast({
          title: 'Success',
          description: 'Configuration deleted successfully',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete configuration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting',
        variant: 'destructive',
      });
    }
  };

  const activeConfig = configs.find((c) => c.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Onboarding Management</h1>
        <p className="text-muted-foreground">
          Create and manage interactive onboarding questionnaires for new users
        </p>
      </div>

      {/* Active Configuration Banner */}
      {activeConfig && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Active Configuration
            </CardTitle>
            <CardDescription className="text-green-700">
              {activeConfig.title} (v{activeConfig.version})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-900">{activeConfig.description}</p>
                <p className="text-xs text-green-600 mt-1">
                  {activeConfig.questions.length} questions • Published on{' '}
                  {activeConfig.publishedAt
                    ? new Date(activeConfig.publishedAt as any).toLocaleDateString()
                    : 'Unknown'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/onboarding/${activeConfig.id}`}>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Link href={`/admin/onboarding/${activeConfig.id}/analytics`}>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search configurations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            {/* Create Button */}
            {canCreate && (
              <Link href="/admin/onboarding/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Configurations</CardTitle>
          <CardDescription>
            Manage onboarding questionnaires and track their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center p-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'No configurations found matching your search'
                  : 'No configurations yet. Create your first onboarding flow!'}
              </p>
            </div>
          ) : (
            <OnboardingTable
              configs={filteredConfigs}
              onPublish={handlePublish}
              onDelete={handleDelete}
              canEdit={canCreate}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
