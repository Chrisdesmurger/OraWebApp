'use client';

/**
 * Magic Link Verification Page
 *
 * With Supabase, magic links natively redirect to /auth/callback
 * which handles session establishment. This page handles the legacy
 * custom token verification flow via the API and redirects to dashboard.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';

type VerificationStatus = 'verifying' | 'success' | 'error';

interface VerificationResult {
  success: boolean;
  email?: string;
  isNewUser?: boolean;
  error?: string;
}

function MagicLinkVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No token provided');
      return;
    }

    verifyToken(token);
  }, [token]);

  async function verifyToken(token: string) {
    try {
      setStatus('verifying');

      // Call verify API - with Supabase, the API route handles
      // session establishment via cookies automatically
      const response = await fetch(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`);
      const data: VerificationResult = await response.json();

      if (!response.ok || !data.success) {
        setStatus('error');
        setErrorMessage(data.error || 'Invalid or expired link');
        return;
      }

      setEmail(data.email || '');
      setStatus('success');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (error) {
      console.error('Magic link verification error:', error);
      setStatus('error');
      setErrorMessage('An error occurred. Please try again.');
    }
  }

  function handleRetry() {
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && (
              <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'verifying' && 'Verifying your link...'}
            {status === 'success' && 'Successfully signed in!'}
            {status === 'error' && 'Verification failed'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your magic link.'}
            {status === 'success' && (
              <>
                Welcome back{email ? `, ${email}` : ''}! Redirecting you to the dashboard...
              </>
            )}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                The magic link may have expired or already been used.
                Please request a new one.
              </p>
              <Button
                onClick={handleRetry}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                <Mail className="mr-2 h-4 w-4" />
                Request new link
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                If you are not redirected automatically, click below.
              </p>
              <Button
                onClick={() => router.push('/admin')}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <MagicLinkVerifyContent />
    </Suspense>
  );
}
