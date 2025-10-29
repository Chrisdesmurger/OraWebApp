'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import type { GetAuditLogsQuery, AuditAction, ResourceType } from '@/types/audit';
import { AUDIT_ACTIONS, RESOURCE_TYPES } from '@/types/audit';

interface AuditLogFiltersProps {
  onFilterChange: (filters: GetAuditLogsQuery) => void;
  isLoading?: boolean;
}

export function AuditLogFilters({ onFilterChange, isLoading }: AuditLogFiltersProps) {
  const [resourceType, setResourceType] = React.useState<ResourceType | 'all'>('all');
  const [action, setAction] = React.useState<AuditAction | 'all'>('all');
  const [actorId, setActorId] = React.useState('');
  const [resourceId, setResourceId] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const handleApplyFilters = () => {
    const filters: GetAuditLogsQuery = {
      limit: 50,
    };

    if (resourceType !== 'all') filters.resourceType = resourceType;
    if (action !== 'all') filters.action = action;
    if (actorId.trim()) filters.actorId = actorId.trim();
    if (resourceId.trim()) filters.resourceId = resourceId.trim();
    if (startDate) filters.startDate = new Date(startDate).toISOString();
    if (endDate) filters.endDate = new Date(endDate + 'T23:59:59').toISOString();

    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    setResourceType('all');
    setAction('all');
    setActorId('');
    setResourceId('');
    setStartDate('');
    setEndDate('');

    onFilterChange({ limit: 50 });
  };

  const hasActiveFilters =
    resourceType !== 'all' ||
    action !== 'all' ||
    actorId.trim() !== '' ||
    resourceId.trim() !== '' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="resourceType">Resource Type</Label>
            <Select value={resourceType} onValueChange={(val) => setResourceType(val as ResourceType | 'all')}>
              <SelectTrigger id="resourceType">
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {RESOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select value={action} onValueChange={(val) => setAction(val as AuditAction | 'all')}>
              <SelectTrigger id="action">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {AUDIT_ACTIONS.map((act) => (
                  <SelectItem key={act} value={act}>
                    {act.replace('_', ' ').charAt(0).toUpperCase() + act.replace('_', ' ').slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actorId">User ID (Actor)</Label>
            <Input
              id="actorId"
              placeholder="Filter by user ID"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resourceId">Resource ID</Label>
            <Input
              id="resourceId"
              placeholder="Filter by resource ID"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleApplyFilters} disabled={isLoading} size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
          {hasActiveFilters && (
            <Button onClick={handleClearFilters} variant="outline" size="sm" disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
