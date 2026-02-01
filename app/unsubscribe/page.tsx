'use client';

/**
 * Email Unsubscribe Page
 *
 * Public page for users to manage their email preferences
 * Uses signed tokens for authentication (no login required)
 */

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type UnsubscribeType = 'all' | 'marketing' | 'engagement' | 'digest';

interface UnsubscribeOption {
  type: UnsubscribeType;
  label: string;
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState(true);
  const [email, setEmail] = React.useState<string>('');
  const [options, setOptions] = React.useState<UnsubscribeOption[]>([]);
  const [selectedType, setSelectedType] = React.useState<UnsubscribeType>('all');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string>('');
  const [success, setSuccess] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setError('Missing unsubscribe token. Please use the link from your email.');
      setLoading(false);
      setVerifying(false);
      return;
    }

    verifyToken();
  }, [token]);

  async function verifyToken() {
    try {
      const response = await fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token!)}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Invalid or expired unsubscribe link.');
        return;
      }

      setEmail(data.email || '');
      setOptions(data.options || []);
    } catch (err) {
      setError('Failed to verify unsubscribe link. Please try again.');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }

  async function handleUnsubscribe() {
    if (!token) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          unsubscribeType: selectedType,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to unsubscribe. Please try again.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
            <p className="text-muted-foreground">Verifying your request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !options.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle>Unable to Process Request</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              If you continue to have issues, please contact our support team.
            </p>
            <a href="mailto:support@ora-wellbeing.com">
              <Button variant="outline">Contact Support</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Successfully Unsubscribed</CardTitle>
            <CardDescription>
              Your email preferences have been updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You will no longer receive {selectedType === 'all' ? 'marketing and engagement' : selectedType} emails from Ora.
            </p>
            <p className="text-xs text-muted-foreground">
              Note: You will still receive important account and security notifications.
            </p>
            <a href="https://ora-wellbeing.com">
              <Button variant="outline" className="mt-4">
                Return to Ora
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Mail className="h-12 w-12 text-orange-500" />
          </div>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>
            Manage your email subscriptions for {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label className="text-base font-medium">Choose what to unsubscribe from:</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(v: string) => setSelectedType(v as UnsubscribeType)}
              className="space-y-3"
            >
              {options.map((option) => (
                <div key={option.type} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.type} id={option.type} className="mt-1" />
                  <Label htmlFor={option.type} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">
              Reason for unsubscribing (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Help us improve by telling us why..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleUnsubscribe}
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Unsubscribe'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You will still receive important security and account notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
