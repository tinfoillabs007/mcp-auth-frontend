import { NextRequest, NextResponse } from 'next/server';

const LLM_BACKEND_URL = process.env.LLM_BACKEND_URL || 'http://localhost:8100';

/**
 * POST /api/insights/summary
 * Proxy for the LLM Insights summary endpoint.
 * Receives the request from client, forwards it to LLM backend with the access token.
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    // Extract request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Forward request to LLM backend summary endpoint
    try {
      console.log(`Forwarding request to LLM backend: ${LLM_BACKEND_URL}/insights/summary`);
      
      const response = await fetch(`${LLM_BACKEND_URL}/insights/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      // Get response from LLM backend
      const data = await response.json();

      // Return response to client
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      console.error('Error forwarding request to LLM backend:', error);
      return NextResponse.json({ error: 'Failed to connect to LLM backend' }, { status: 502 });
    }
  } catch (error) {
    console.error('Unexpected error in summary API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 