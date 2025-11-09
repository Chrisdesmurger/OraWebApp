import * as React from 'react';
import Link from 'next/link';
import type { OnboardingConfig } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Rocket, BarChart3, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface OnboardingTableProps {
  configs: OnboardingConfig[];
  onPublish: (configId: string) => Promise<void>;
  onDelete: (configId: string) => Promise<void>;
  canEdit: boolean;
}

// Helper function to convert Firestore timestamp to Date
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  }
  return new Date(timestamp);
}


export function OnboardingTable({ configs, onPublish, onDelete, canEdit }: OnboardingTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Questions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Updated</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.id}>
              <TableCell>
                <div>
                  <Link
                    href={`/admin/onboarding/${config.id}`}
                    className="font-medium hover:underline"
                  >
                    {config.title}
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {config.description}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">v{config.version}</code>
              </TableCell>
              <TableCell>{getStatusBadge(config.status)}</TableCell>
              <TableCell>
                <span className="text-sm">{config.questions.length}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {toDate(config.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {toDate(config.updatedAt).toLocaleDateString()}
                </span>
              </TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/onboarding/${config.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href={`/admin/onboarding/${config.id}/preview`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Preview
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href={`/admin/onboarding/${config.id}/analytics`}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Link>
                      </DropdownMenuItem>

                      {config.status !== 'active' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onPublish(config.id)}
                            className="text-green-600"
                          >
                            <Rocket className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        </>
                      )}

                      {config.status !== 'active' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(config.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
