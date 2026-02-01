'use client';

/**
 * Email Template Preview Page
 *
 * Shows a preview of an email template with language toggle
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Send,
  Eye,
  Code,
  Mail,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { useAuth } from '@/lib/auth/auth-context';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { EmailType } from '@/types/email';

const TEMPLATE_INFO: Record<string, { name: string; description: string }> = {
  magic_link: { name: 'Magic Link', description: 'Passwordless login link' },
  password_reset: { name: 'Password Reset', description: 'Reset password request' },
  security_alert: { name: 'Security Alert', description: 'Account security notification' },
  welcome: { name: 'Welcome', description: 'New user welcome email' },
  onboarding_complete: { name: 'Onboarding Complete', description: 'Onboarding completion email' },
};

export default function TemplatePreviewPage() {
  const params = useParams();
  const { user } = useAuth();
  const emailType = params.type as EmailType;
  const [language, setLanguage] = React.useState<SupportedLanguage>('fr');
  const [previewHtml, setPreviewHtml] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const templateInfo = TEMPLATE_INFO[emailType] || { name: emailType, description: '' };

  const fetchPreview = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/email/templates/preview?type=${emailType}&language=${language}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewHtml(data.html || '');
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setLoading(false);
    }
  }, [emailType, language]);

  React.useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleSendTest = async () => {
    if (!user?.email) return;

    setSending(true);
    try {
      await fetchWithAuth('/api/email/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType,
          recipientEmail: user.email,
          language,
        }),
      });
      alert('Test email sent!');
    } catch (error) {
      console.error('Error sending test:', error);
      alert('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/email/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{templateInfo.name}</h1>
            <p className="text-muted-foreground">{templateInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguage)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Francais</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Espanol</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSendTest} disabled={sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending...' : 'Send Test'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Template Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{emailType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Languages</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="outline">FR</Badge>
                <Badge variant="outline">EN</Badge>
                <Badge variant="outline">ES</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="bg-green-500 mt-1">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              How the email will appear in {language === 'fr' ? 'French' : language === 'en' ? 'English' : 'Spanish'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : previewHtml ? (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] bg-white"
                  title="Email Preview"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 bg-muted rounded-lg">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The preview API is not yet implemented
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
