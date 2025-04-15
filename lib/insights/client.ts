/**
 * Client module for interacting with the LLM Insights backend
 * This leverages the existing MCP client authentication
 */

import { fetchMcpApi } from '../mcp/client';

// Types for insights
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: 'openai' | 'anthropic';
}

export type InsightType = 
  | 'summary' 
  | 'action-items' 
  | 'key-concepts' 
  | 'sentiment'
  | 'general';

export interface InsightRequest {
  query: string;
  insightTypes?: InsightType[];
  sourceTypes?: string[];
  matchThreshold?: number;
  matchCount?: number;
  llmOptions?: LLMOptions;
  userId?: string;
}

export interface Insight {
  type: InsightType;
  content: string;
  error?: string;
  metadata: {
    model: string;
    provider: string;
    insightType: string;
    [key: string]: any;
  };
}

export interface InsightsResponse {
  query: string;
  userId: string;
  timestamp: string;
  documentCount: number;
  insights: Insight[];
}

// Using Next.js API routes instead of direct LLM backend calls
const API_PREFIX = '/api/insights';

/**
 * Generate multiple insights based on a query
 * @param accessToken MCP access token
 * @param request Insight request parameters
 * @returns Insights response with multiple insight types
 */
export async function generateInsights(
  accessToken: string,
  request: InsightRequest
): Promise<InsightsResponse> {
  try {
    const { userId, ...restRequest } = request;
    
    // Use the Next.js API route as a proxy
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
    
    // Add X-User-ID header if userId is provided
    if (userId) {
      headers['X-User-ID'] = userId;
    }
    
    const response = await fetch(`${API_PREFIX}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(restRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Insights generation failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}

/**
 * Generate a summary insight based on a query
 * @param accessToken MCP access token
 * @param query The search query
 * @param options Additional options
 * @returns Summary insight response
 */
export async function generateSummary(
  accessToken: string,
  query: string,
  options: {
    sourceTypes?: string[];
    matchThreshold?: number;
    matchCount?: number;
    llmOptions?: LLMOptions;
  } = {}
): Promise<any> {
  try {
    const response = await fetch(`${API_PREFIX}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        query,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Summary generation failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

/**
 * Generate action items based on a query
 * @param accessToken MCP access token
 * @param query The search query
 * @param options Additional options
 * @returns Action items response
 */
export async function generateActionItems(
  accessToken: string,
  query: string,
  options: {
    sourceTypes?: string[];
    matchThreshold?: number;
    matchCount?: number;
    llmOptions?: LLMOptions;
  } = {}
): Promise<any> {
  try {
    const response = await fetch(`${API_PREFIX}/action-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        query,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Action items generation failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating action items:', error);
    throw error;
  }
} 