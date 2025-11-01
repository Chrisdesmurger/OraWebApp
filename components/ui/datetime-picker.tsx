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
 * Output format: "2025-12-15T00:00:00Z" (UTC, defaults to midnight)
 *
 * Note: If time is not specified (just date), defaults to midnight (00:00)
 */
function dateTimeLocalToIso(local: string): string {
  if (!local) return '';

  try {
    // If only date is provided (no time), add T00:00 to set to midnight
    let dateTimeStr = local;
    if (local.length === 10) {
      // Format: "2025-12-15" (date only)
      dateTimeStr = `${local}T00:00`;
    }

    // Parse the local datetime string
    const date = new Date(dateTimeStr);

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
  const inputRef = React.useRef<HTMLInputElement>(null);

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

    // Only process if we have a complete datetime (YYYY-MM-DDTHH:mm)
    if (localDateTime.length === 16 && localDateTime.includes('T')) {
      const isoDateTime = dateTimeLocalToIso(localDateTime);
      onChange(isoDateTime);
    }
  };

  // When user clicks on the calendar and selects just a date,
  // the input might not have time. Force it to midnight when user finishes.
  const handleClick = () => {
    if (!inputRef.current) return;

    // Set up a timer to check if user selected date without time
    setTimeout(() => {
      if (!inputRef.current) return;
      const val = inputRef.current.value;

      // If value exists but incomplete (no time), add midnight
      if (val && val.length >= 10 && !val.includes('T')) {
        const dateWithMidnight = `${val.slice(0, 10)}T00:00`;
        inputRef.current.value = dateWithMidnight;
        // Trigger change handler manually
        const event = new Event('change', { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }
    }, 100);
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
          ref={inputRef}
          type="datetime-local"
          value={localValue}
          onChange={handleChange}
          onClick={handleClick}
          onBlur={(e) => {
            // Final safety: if user somehow has incomplete datetime on blur, complete it
            const val = e.target.value;
            if (val && val.length >= 10) {
              let complete = val;
              if (!val.includes('T')) {
                complete = `${val.slice(0, 10)}T00:00`;
              } else if (val.length < 16) {
                // Has T but incomplete time
                complete = `${val.slice(0, 10)}T00:00`;
              }
              if (complete !== val) {
                e.target.value = complete;
                const event = new Event('change', { bubbles: true });
                e.target.dispatchEvent(event);
              }
            }
          }}
          disabled={disabled}
          min={minLocal}
          max={maxLocal}
          required={required}
          step="60"
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
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
