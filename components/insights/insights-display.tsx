'use client';

import React from 'react';
import { InsightsResponse, Insight } from '@/lib/insights/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, BookOpen, BarChart4 } from 'lucide-react';

interface InsightsDisplayProps {
  insights: InsightsResponse;
}

// Display icon based on insight type
const InsightIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'summary':
      return <BookOpen className="h-5 w-5" />;
    case 'action-items':
      return <CheckCircle className="h-5 w-5" />;
    case 'key-concepts':
      return <BookOpen className="h-5 w-5" />;
    case 'sentiment':
      return <BarChart4 className="h-5 w-5" />;
    default:
      return null;
  }
};

// Format insight type label
const formatInsightType = (type: string): string => {
  switch (type) {
    case 'summary':
      return 'Summary';
    case 'action-items':
      return 'Action Items';
    case 'key-concepts':
      return 'Key Concepts';
    case 'sentiment':
      return 'Sentiment';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

const InsightsDisplay: React.FC<InsightsDisplayProps> = ({ insights }) => {
  // Default selected tab to the first insight type
  const defaultTab = insights.insights[0]?.type || 'summary';

  if (!insights || !insights.insights || insights.insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Insights</CardTitle>
          <CardDescription>No insights were generated</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Try a different query or select different insight types.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Insights for: "{insights.query}"</span>
          <Badge variant="outline">{insights.documentCount} sources</Badge>
        </CardTitle>
        <CardDescription>
          Generated on {new Date(insights.timestamp).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4">
            {insights.insights.map((insight) => (
              <TabsTrigger key={insight.type} value={insight.type} className="flex items-center gap-1">
                <InsightIcon type={insight.type} /> 
                {formatInsightType(insight.type)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {insights.insights.map((insight) => (
            <TabsContent key={insight.type} value={insight.type}>
              <InsightContent insight={insight} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Component to display a specific insight content
const InsightContent: React.FC<{ insight: Insight }> = ({ insight }) => {
  if (insight.error) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-950 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-medium">Error Generating Insight</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{insight.error}</p>
      </div>
    );
  }

  // Format content based on insight type
  switch (insight.type) {
    case 'summary':
      return (
        <div className="prose dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: formatContentForDisplay(insight.content) }} />
          <div className="text-xs text-gray-500 mt-4">
            Generated with {insight.metadata.model} ({insight.metadata.provider})
          </div>
        </div>
      );
    
    case 'action-items':
      return (
        <div className="prose dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: formatContentForDisplay(insight.content) }} />
          <div className="text-xs text-gray-500 mt-4">
            Generated with {insight.metadata.model} ({insight.metadata.provider})
          </div>
        </div>
      );
    
    // Handle other insight types similarly
    default:
      return (
        <div className="prose dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: formatContentForDisplay(insight.content) }} />
          <div className="text-xs text-gray-500 mt-4">
            Generated with {insight.metadata.model} ({insight.metadata.provider})
          </div>
        </div>
      );
  }
};

// Helper function to format content for display
// Converts newlines to <br> and detects bullet points
const formatContentForDisplay = (content: string): string => {
  if (!content) return '';
  
  // Replace single newlines with <br>
  let formattedContent = content.replace(/\n(?!\n)/g, '<br>');
  
  // Convert markdown style bullet points to HTML
  formattedContent = formattedContent.replace(/- (.*?)(<br>|$)/g, '<li>$1</li>');
  
  // Wrap consecutive list items in <ul> tags
  if (formattedContent.includes('<li>')) {
    formattedContent = formattedContent.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
  }
  
  return formattedContent;
};

export default InsightsDisplay; 