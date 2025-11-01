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
  // Split ISO timestamp into date and time parts
  const [dateValue, setDateValue] = React.useState('');
  const [timeValue, setTimeValue] = React.useState('00:00'); // Default to midnight

  // Update local state when external value changes
  React.useEffect(() => {
    if (value) {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      setDateValue(`${year}-${month}-${day}`);
      setTimeValue(`${hours}:${minutes}`);
    } else {
      setDateValue('');
      setTimeValue('00:00'); // Reset to midnight when cleared
    }
  }, [value]);

  // Convert min/max ISO dates to date format (YYYY-MM-DD)
  const getMinDateString = (): string | undefined => {
    if (!minDate) return undefined;
    const date = new Date(minDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getMaxDateString = (): string | undefined => {
    if (!maxDate) return undefined;
    const date = new Date(maxDate);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const minDateString = getMinDateString();
  const maxDateString = getMaxDateString();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDateValue(newDate);

    if (!newDate) {
      onChange(null);
      return;
    }

    // Combine date and time (time defaults to 00:00 if not set)
    const combinedDateTime = `${newDate}T${timeValue || '00:00'}`;
    const isoDateTime = dateTimeLocalToIso(combinedDateTime);
    onChange(isoDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    if (!dateValue) {
      // Can't set time without a date
      return;
    }

    // Combine date and time
    const combinedDateTime = `${dateValue}T${newTime}`;
    const isoDateTime = dateTimeLocalToIso(combinedDateTime);
    onChange(isoDateTime);
  };

  const handleClear = () => {
    setDateValue('');
    setTimeValue('00:00');
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

      <div className="flex items-center gap-2">
        {/* Date input */}
        <div className="relative flex-1">
          <input
            type="date"
            value={dateValue}
            onChange={handleDateChange}
            disabled={disabled}
            min={minDateString}
            max={maxDateString}
            required={required}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              '[&::-webkit-calendar-picker-indicator]:cursor-pointer'
            )}
          />
        </div>

        {/* Time input */}
        <div className="relative w-32">
          <input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled || !dateValue}
            required={required && !!dateValue}
            step="60"
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              '[&::-webkit-calendar-picker-indicator]:cursor-pointer'
            )}
          />
        </div>

        {/* Clear button */}
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={handleClear}
            aria-label="Clear date and time"
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
