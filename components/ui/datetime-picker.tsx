'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

/**
 * DateTimePicker Component
 *
 * A controlled datetime input component that works with ISO 8601 timestamps.
 * Uses HTML5 datetime-local input for cross-browser compatibility.
 *
 * Usage:
 * <DateTimePicker
 *   value={form.watch('scheduledPublishAt')}
 *   onChange={(value) => form.setValue('scheduledPublishAt', value)}
 *   label="Schedule Publish Date"
 *   minDate={new Date().toISOString()}
 * />
 */

interface DateTimePickerProps {
  value: string | null;  // ISO 8601 timestamp (e.g., "2025-12-15T14:30:00Z")
  onChange: (value: string | null) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  minDate?: string;  // ISO 8601 timestamp
  maxDate?: string;  // ISO 8601 timestamp
  className?: string;
  required?: boolean;
}

/**
 * Convert ISO 8601 timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
 *
 * datetime-local input expects format: "2025-12-15T14:30"
 * ISO 8601 from API: "2025-12-15T14:30:00Z" or "2025-12-15T14:30:00.000Z"
 */
function isoToDateTimeLocal(iso: string | null): string {
  if (!iso) return '';

  try {
    const date = new Date(iso);

    // Get local date/time components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error converting ISO to datetime-local:', error);
    return '';
  }
}

/**
 * Convert datetime-local format to ISO 8601 timestamp
 *
 * Input format: "2025-12-15T14:30"
 * Output format: "2025-12-15T14:30:00Z" (UTC)
 */
function dateTimeLocalToIso(local: string): string {
  if (!local) return '';

  try {
    // Parse the local datetime string
    const date = new Date(local);

    // Return ISO string in UTC
    return date.toISOString();
  } catch (error) {
    console.error('Error converting datetime-local to ISO:', error);
    return '';
  }
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  label,
  description,
  minDate,
  maxDate,
  className,
  required = false,
}: DateTimePickerProps) {
  // Convert ISO value to datetime-local format for input
  const localValue = isoToDateTimeLocal(value);

  // Convert min/max dates to datetime-local format
  const minLocal = minDate ? isoToDateTimeLocal(minDate) : undefined;
  const maxLocal = maxDate ? isoToDateTimeLocal(maxDate) : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localDateTime = e.target.value;

    if (!localDateTime) {
      onChange(null);
      return;
    }

    // Convert back to ISO 8601 for the API
    const isoDateTime = dateTimeLocalToIso(localDateTime);
    onChange(isoDateTime);
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative flex items-center gap-2">
        <input
          type="datetime-local"
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
          min={minLocal}
          max={maxLocal}
          required={required}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'appearance-none'
          )}
        />

        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={handleClear}
            aria-label="Clear date"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {value && (
        <p className="text-xs text-muted-foreground">
          UTC: {new Date(value).toUTCString()}
        </p>
      )}
    </div>
  );
}

// Export conversion helpers for use in other components
export { isoToDateTimeLocal, dateTimeLocalToIso };
