'use client';

/**
 * Email Templates Page
 *
 * Lists all available email templates with preview and test options
 */

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Mail,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { useAuth } from '@/lib/auth/auth-context';
import { getAvailableEmailTypes } from '@/lib/email/templates';
import type { EmailType, EmailCategory } from '@/types/email';

interface TemplateInfo {
  type: EmailType;
  category: EmailCategory;
  name: string;
  description: string;
  available: boolean;
}

const TEMPLATE_INFO: Record<EmailType, { name: string; description: string; category: EmailCategory }> = {
  // Authentication
  magic_link: {
    name: 'Magic Link',
    description: 'Passwordless login link sent to user',
    category: 'authentication',
  },
  email_verification: {
    name: 'Email Verification',
    description: 'Verify email address for new accounts',
    category: 'authentication',
  },
  password_reset: {
    name: 'Password Reset',
    description: 'Reset password request email',
    category: 'authentication',
  },
  security_alert: {
    name: 'Security Alert',
    description: 'Alert for suspicious account activity',
    category: 'authentication',
  },
  // Welcome
  welcome: {
    name: 'Welcome',
    description: 'Welcome email for new users',
    category: 'welcome',
  },
  onboarding_complete: {
    name: 'Onboarding Complete',
    description: 'Sent after user completes onboarding',
    category: 'welcome',
  },
  // Engagement
  inactivity_7d: {
    name: 'Inactivity (7 days)',
    description: 'Reminder after 7 days of inactivity',
    category: 'engagement',
  },
  inactivity_30d: {
    name: 'Inactivity (30 days)',
    description: 'Reminder after 30 days of inactivity',
    category: 'engagement',
  },
  streak_milestone: {
    name: 'Streak Milestone',
    description: 'Celebrate practice streaks',
    category: 'engagement',
  },
  first_completion: {
    name: 'First Completion',
    description: 'First lesson completed celebration',
    category: 'engagement',
  },
  program_complete: {
    name: 'Program Complete',
    description: 'Program completion celebration',
    category: 'engagement',
  },
  // Marketing
  new_content: {
    name: 'New Content',
    description: 'Notify about new lessons/programs',
    category: 'marketing',
  },
  weekly_digest: {
    name: 'Weekly Digest',
    description: 'Weekly summary and recommendations',
    category: 'marketing',
  },
  program_recommendation: {
    name: 'Program Recommendation',
    description: 'Personalized program suggestions',
    category: 'marketing',
  },
  // Transactional
  account_change: {
    name: 'Account Change',
    description: 'Account settings modified',
    category: 'transactional',
  },
  subscription_confirmed: {
    name: 'Subscription Confirmed',
    description: 'Subscription purchase confirmation',
    category: 'transactional',
  },
  subscription_expiring: {
    name: 'Subscription Expiring',
    description: 'Subscription renewal reminder',
    category: 'transactional',
  },
  payment_failed: {
    name: 'Payment Failed',
    description: 'Payment processing failure',
    category: 'transactional',
  },
};

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  authentication: 'bg-blue-500',
  welcome: 'bg-green-500',
  engagement: 'bg-purple-500',
  marketing: 'bg-orange-500',
  transactional: 'bg-gray-500',
};

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  authentication: 'Authentication',
  welcome: 'Welcome',
  engagement: 'Engagement',
  marketing: 'Marketing',
  transactional: 'Transactional',
};

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<EmailCategory | 'all'>('all');
  const [testDialogOpen, setTestDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<EmailType | null>(null);
  const [testEmail, setTestEmail] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  // Get available templates
  const availableTypes = getAvailableEmailTypes();

  // Build template list with availability info
  const templates: TemplateInfo[] = React.useMemo(() => {
    return (Object.keys(TEMPLATE_INFO) as EmailType[]).map((type) => ({
      type,
      ...TEMPLATE_INFO[type],
      available: availableTypes.includes(type),
    }));
  }, [availableTypes]);

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, selectedCategory]);

  // Group by category
  const groupedTemplates = React.useMemo(() => {
    const groups: Record<EmailCategory, TemplateInfo[]> = {
      authentication: [],
      welcome: [],
      engagement: [],
      marketing: [],
      transactional: [],
    };

    filteredTemplates.forEach((t) => {
      groups[t.category].push(t);
    });

    return groups;
  }, [filteredTemplates]);

  const handleTestEmail = async () => {
    if (!selectedTemplate || !testEmail) return;

    setSending(true);
    setTestResult(null);

    try {
      const response = await fetchWithAuth('/api/email/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType: selectedTemplate,
          recipientEmail: testEmail,
          language: 'fr',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({ success: true, message: 'Test email sent successfully!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send test email' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'An error occurred' });
    } finally {
      setSending(false);
    }
  };

  const openTestDialog = (type: EmailType) => {
    setSelectedTemplate(type);
    setTestEmail(user?.email || '');
    setTestResult(null);
    setTestDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/email">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground">
              {availableTypes.length} of {templates.length} templates available
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {(Object.keys(CATEGORY_LABELS) as EmailCategory[]).map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates by Category */}
      {(Object.keys(groupedTemplates) as EmailCategory[]).map((category) => {
        const categoryTemplates = groupedTemplates[category];
        if (categoryTemplates.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${CATEGORY_COLORS[category]}`} />
                <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
              </div>
              <CardDescription>
                {categoryTemplates.filter((t) => t.available).length} of {categoryTemplates.length} templates implemented
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTemplates.map((template) => (
                  <div
                    key={template.type}
                    className={`rounded-lg border p-4 ${
                      template.available
                        ? 'bg-card hover:bg-accent/50 transition-colors'
                        : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                      {template.available ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Planned
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {template.description}
                    </p>
                    {template.available && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTestDialog(template.type)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Link href={`/admin/email/templates/${template.type}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test {selectedTemplate && TEMPLATE_INFO[selectedTemplate]?.name} email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            {testResult && (
              <div
                className={`p-4 rounded-lg ${
                  testResult.success
                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestEmail} disabled={sending || !testEmail}>
              {sending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
