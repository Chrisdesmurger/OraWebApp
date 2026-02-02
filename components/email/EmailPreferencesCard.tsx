'use client';

/**
 * Email Preferences Card Component
 *
 * Allows users to manage their email notification preferences
 * Can be embedded in any settings or profile page
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Bell, Sparkles, TrendingUp, Loader2, CheckCircle } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import type { EmailPreferences } from '@/types/email';

interface EmailPreferencesCardProps {
  className?: string;
}

export function EmailPreferencesCard({ className }: EmailPreferencesCardProps) {
  const [preferences, setPreferences] = React.useState<EmailPreferences | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    try {
      const response = await fetchWithAuth('/api/email/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      setError('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(key: keyof EmailPreferences, value: boolean | string) {
    if (!preferences) return;

    setSaving(true);
    setSaved(false);
    setError('');

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const response = await fetchWithAuth('/api/email/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save preference');
        // Revert on error
        setPreferences(preferences);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      setError('Failed to save preference');
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to load preferences</p>
          <Button variant="outline" onClick={fetchPreferences} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Preferences
            </CardTitle>
            <CardDescription>
              Manage your email notification settings
            </CardDescription>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {saved && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Marketing Emails */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Marketing & New Content
          </div>

          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="marketingEmails" className="flex-1">
                <span className="font-medium">Marketing emails</span>
                <p className="text-xs text-muted-foreground">
                  Promotions, tips and platform updates
                </p>
              </Label>
              <Switch
                id="marketingEmails"
                checked={preferences.marketingEmails}
                onCheckedChange={(v) => updatePreference('marketingEmails', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="newContentNotifications" className="flex-1">
                <span className="font-medium">New content alerts</span>
                <p className="text-xs text-muted-foreground">
                  Get notified when new lessons are published
                </p>
              </Label>
              <Switch
                id="newContentNotifications"
                checked={preferences.newContentNotifications}
                onCheckedChange={(v) => updatePreference('newContentNotifications', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="programRecommendations" className="flex-1">
                <span className="font-medium">Program recommendations</span>
                <p className="text-xs text-muted-foreground">
                  Personalized program suggestions
                </p>
              </Label>
              <Switch
                id="programRecommendations"
                checked={preferences.programRecommendations}
                onCheckedChange={(v) => updatePreference('programRecommendations', v)}
              />
            </div>
          </div>
        </div>

        {/* Engagement Emails */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            Engagement & Reminders
          </div>

          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="engagementEmails" className="flex-1">
                <span className="font-medium">Engagement emails</span>
                <p className="text-xs text-muted-foreground">
                  Progress updates and achievements
                </p>
              </Label>
              <Switch
                id="engagementEmails"
                checked={preferences.engagementEmails}
                onCheckedChange={(v) => updatePreference('engagementEmails', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="streakReminders" className="flex-1">
                <span className="font-medium">Streak reminders</span>
                <p className="text-xs text-muted-foreground">
                  Keep your practice streak going
                </p>
              </Label>
              <Switch
                id="streakReminders"
                checked={preferences.streakReminders}
                onCheckedChange={(v) => updatePreference('streakReminders', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="inactivityReminders" className="flex-1">
                <span className="font-medium">Inactivity reminders</span>
                <p className="text-xs text-muted-foreground">
                  Gentle nudges when you've been away
                </p>
              </Label>
              <Switch
                id="inactivityReminders"
                checked={preferences.inactivityReminders}
                onCheckedChange={(v) => updatePreference('inactivityReminders', v)}
              />
            </div>
          </div>
        </div>

        {/* Weekly Digest */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-blue-500" />
            Weekly Digest
          </div>

          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="weeklyDigest" className="flex-1">
                <span className="font-medium">Weekly summary</span>
                <p className="text-xs text-muted-foreground">
                  Your weekly activity and new content
                </p>
              </Label>
              <Switch
                id="weeklyDigest"
                checked={preferences.weeklyDigest}
                onCheckedChange={(v) => updatePreference('weeklyDigest', v)}
              />
            </div>

            {preferences.weeklyDigest && (
              <div className="flex items-center justify-between">
                <Label htmlFor="digestFrequency" className="flex-1">
                  <span className="font-medium">Frequency</span>
                </Label>
                <Select
                  value={preferences.digestFrequency}
                  onValueChange={(v) => updatePreference('digestFrequency', v)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Language Preference */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="preferredLanguage" className="flex-1">
              <span className="font-medium">Email language</span>
              <p className="text-xs text-muted-foreground">
                Choose your preferred language for emails
              </p>
            </Label>
            <Select
              value={preferences.preferredLanguage}
              onValueChange={(v) => updatePreference('preferredLanguage', v)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Francais</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Espanol</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Note about required emails */}
        <p className="text-xs text-muted-foreground pt-4 border-t">
          Note: Security alerts and account notifications cannot be disabled.
        </p>
      </CardContent>
    </Card>
  );
}
