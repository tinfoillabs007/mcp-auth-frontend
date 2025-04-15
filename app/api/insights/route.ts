import { NextRequest, NextResponse } from 'next/server';

const LLM_BACKEND_URL = process.env.LLM_BACKEND_URL || 'http://localhost:8100';

/**
 * POST /api/insights
 * Proxy for the LLM Insights backend.
 * Receives the request from client, forwards it to LLM backend with the access token.
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Get User ID from X-User-ID header if present
    const userIdHeader = request.headers.get('X-User-ID');

    // Extract request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Forward request to LLM backend
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      };
      
      // Add X-User-ID header if provided
      if (userIdHeader) {
        headers['X-User-ID'] = userIdHeader;
      }
      
      const response = await fetch(`${LLM_BACKEND_URL}/insights`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Get response from LLM backend
      const data = await response.json();

      // Return response to client
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to connect to LLM backend' }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 