'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import InsightsForm from '@/components/insights/insights-form';
import InsightsDisplay from '@/components/insights/insights-display';
import { InsightsResponse } from '@/lib/insights/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function InsightsPage() {
  const { authState } = useAuth();
  const [insights, setInsights] = useState<InsightsResponse | null>(null);

  const handleInsightsGenerated = (newInsights: InsightsResponse) => {
    setInsights(newInsights);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">AI Insights</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate AI-powered insights from your knowledge base
        </p>
      </div>

      <div className="grid gap-8">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="history" disabled={true}>History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate">
            <InsightsForm onInsightsGenerated={handleInsightsGenerated} />
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Insights History</CardTitle>
                <CardDescription>View your previously generated insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Insights history is coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {insights && <InsightsDisplay insights={insights} />}
      </div>
    </div>
  );
} 