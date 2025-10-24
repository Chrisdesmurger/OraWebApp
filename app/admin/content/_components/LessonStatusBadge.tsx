import { Badge } from '@/components/ui/badge';
import type { LessonStatus } from '@/types/lesson';

interface LessonStatusBadgeProps {
  status: LessonStatus;
}

const statusConfig: Record<LessonStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
  },
  uploading: {
    label: 'Uploading',
    variant: 'secondary',
  },
  processing: {
    label: 'Processing',
    variant: 'secondary',
  },
  ready: {
    label: 'Ready',
    variant: 'default',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
  },
};

export function LessonStatusBadge({ status }: LessonStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}
