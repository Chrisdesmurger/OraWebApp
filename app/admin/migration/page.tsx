'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function MigrationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
      <p className="text-gray-600 mb-8">
        Migrate legacy content documents to the new lessons collection format
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Content → Lessons Migration</CardTitle>
          <CardDescription>
            This will convert all documents from the <code className="bg-gray-100 px-1 rounded">content</code> collection
            to the new <code className="bg-gray-100 px-1 rounded">lessons</code> collection format with snake_case fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What will be migrated?</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>All fields will be converted to snake_case (e.g., <code>durationMinutes</code> → <code>duration_sec</code>)</li>
                <li>Video/audio URLs will be mapped to <code>renditions</code> / <code>audio_variants</code></li>
                <li>Tags will include category and instructor information</li>
                <li>Timestamps will be converted to ISO 8601 strings</li>
                <li>Status will be set to <code>ready</code> (or <code>draft</code> if inactive)</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button
              onClick={() => runMigration(true)}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Running...' : 'Preview (Dry Run)'}
            </Button>
            <Button
              onClick={() => runMigration(false)}
              disabled={loading}
              variant="default"
            >
              {loading ? 'Running...' : 'Run Migration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Migration Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">{result.message}</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><strong>Total migrated:</strong> {result.migrated || 0}</p>
                <p><strong>Errors:</strong> {result.errors?.length || 0}</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Errors:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {result.errors.map((err: any, i: number) => (
                    <li key={i} className="text-sm text-red-600">
                      {err.id}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.preview && (
              <div>
                <h3 className="font-semibold mb-2">Preview (first 3 lessons):</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(result.preview, null, 2)}
                </pre>
              </div>
            )}

            {!result.preview && result.migrated > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Next Steps</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal pl-5 mt-2 space-y-1">
                    <li>Verify lessons in Firebase Console</li>
                    <li>Test in Android app (debug screen should show migrated lessons)</li>
                    <li>If everything looks good, you can delete the old "content" collection</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
