'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const { authState } = useAuth();
  const [query, setQuery] = useState('');
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDebugResult(null);

    try {
      if (!authState.accessToken || !authState.supabaseUserId) {
        throw new Error('Not authenticated or missing user ID');
      }

      const response = await fetch('/api/debug/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.accessToken}`,
          'X-User-ID': authState.supabaseUserId
        },
        body: JSON.stringify({ 
          query,
          matchThreshold: 0.8,
          matchCount: 10,
          sourceTypes: ['gmail']
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
      }

      setDebugResult(data);
    } catch (err: any) {
      console.error('Debug error:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">RAG System Debug</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the RAG system connectivity and functionality
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Test RAG Query</CardTitle>
            <CardDescription>Check if your content can be found in the RAG database</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query">Query</Label>
                <Input 
                  id="query"
                  placeholder="Enter a test query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || !query.trim() || !authState.supabaseUserId}
              >
                {isLoading ? 'Testing...' : 'Test RAG System'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-300 dark:border-red-800">
            <CardHeader className="text-red-600 dark:text-red-400">
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-red-600 dark:text-red-400">{error}</div>
            </CardContent>
          </Card>
        )}

        {debugResult && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Configuration</h3>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                    <div><span className="font-mono">RAG Service URL:</span> {debugResult.ragServiceUrl}</div>
                    <div><span className="font-mono">API Prefix:</span> {debugResult.apiPrefix}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Sources ({debugResult.sourceCount})</h3>
                  {debugResult.sources?.length > 0 ? (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto max-h-40">
                      <pre>{JSON.stringify(debugResult.sources, null, 2)}</pre>
                    </div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400 p-3 border border-amber-200 dark:border-amber-800 rounded">
                      No sources found for your user ID. You need to create sources first.
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Documents Found ({debugResult.documentCount})</h3>
                  {debugResult.documents?.length > 0 ? (
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-auto max-h-60">
                      <pre>{JSON.stringify(debugResult.documents, null, 2)}</pre>
                    </div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400 p-3 border border-amber-200 dark:border-amber-800 rounded">
                      No documents found matching your query. Try a different query or ingest content first.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 