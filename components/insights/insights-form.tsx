'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateInsights, InsightType } from '@/lib/insights/client';
import { toast } from 'sonner';

interface InsightsFormProps {
  onInsightsGenerated?: (insights: any) => void;
}

const InsightsForm: React.FC<InsightsFormProps> = ({ onInsightsGenerated }) => {
  const { authState } = useAuth();
  const [query, setQuery] = useState('');
  const [insightTypes, setInsightTypes] = useState<InsightType[]>(['summary', 'action-items' as InsightType]);
  const [sourceTypes, setSourceTypes] = useState<string[]>(['gmail']); // Default to gmail but allow changing
  const [isLoading, setIsLoading] = useState(false);

  // Available insight types
  const availableInsightTypes = [
    { value: 'summary', label: 'Summary' },
    { value: 'action-items', label: 'Action Items' },
    { value: 'key-concepts', label: 'Key Concepts' },
    { value: 'sentiment', label: 'Sentiment Analysis' },
    { value: 'general', label: 'General Insights' },
  ];

  // Available source types
  const availableSourceTypes = [
    { value: 'gmail', label: 'Gmail' },
    { value: 'test', label: 'Test Data' }
    // Add more as needed
  ];

  // Toggle insight type selection
  const toggleInsightType = (type: InsightType) => {
    setInsightTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Toggle source type selection
  const toggleSourceType = (type: string) => {
    setSourceTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    if (insightTypes.length === 0) {
      toast.error('Please select at least one insight type');
      return;
    }

    if (authState.status !== 'authenticated' || !authState.accessToken || !authState.supabaseUserId) {
      toast.error('You must be logged in to generate insights');
      return;
    }

    setIsLoading(true);

    try {
      const result = await generateInsights(authState.accessToken, {
        query,
        insightTypes,
        sourceTypes,
        matchThreshold: 0.8,
        userId: authState.supabaseUserId // Pass user ID explicitly
      });

      toast.success('Insights generated successfully');
      
      // Call callback with results
      if (onInsightsGenerated) {
        onInsightsGenerated(result);
      }
    } catch (error: any) {
      console.error('Error generating insights:', error);
      
      // Check if this is the "No relevant documents" error
      if (error.message?.includes('No relevant documents found')) {
        toast.error('No relevant documents found', {
          description: 'Try a different query or add more data to your RAG database through the RAG Management page.'
        });
      } else {
        toast.error('Failed to generate insights', { 
          description: error.message || 'An unknown error occurred'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authState.status !== 'authenticated') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate Insights</CardTitle>
          <CardDescription>Use AI to analyze your data</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You must be logged in to generate insights.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Insights</CardTitle>
        <CardDescription>Use AI to analyze your data and generate insights</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Query</Label>
            <Textarea 
              id="query"
              placeholder="What would you like to know about?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              Your query will search your personal knowledge base. Make sure you've added data via the RAG Management page first.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Insight Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableInsightTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`insight-${type.value}`}
                    checked={insightTypes.includes(type.value as InsightType)}
                    onCheckedChange={() => toggleInsightType(type.value as InsightType)}
                  />
                  <label 
                    htmlFor={`insight-${type.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Source Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableSourceTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`source-${type.value}`}
                    checked={sourceTypes.includes(type.value)}
                    onCheckedChange={() => toggleSourceType(type.value)}
                  />
                  <label 
                    htmlFor={`source-${type.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !query.trim() || insightTypes.length === 0}
          >
            {isLoading ? 'Generating...' : 'Generate Insights'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InsightsForm; 