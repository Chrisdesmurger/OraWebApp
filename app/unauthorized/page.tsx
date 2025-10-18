'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Access Denied</CardTitle>
          <CardDescription className="text-center">
            You don&apos;t have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            This area requires admin or teacher privileges. Please contact your administrator if you
            believe you should have access.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()} className="flex-1">
              Go Back
            </Button>
            <Button onClick={() => router.push('/login')} className="flex-1">
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
