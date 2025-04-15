import { NextRequest, NextResponse } from 'next/server';

const LLM_BACKEND_URL = process.env.LLM_BACKEND_URL || 'http://localhost:8100';

/**
 * POST /api/debug/rag
 * Debug helper to diagnose RAG service issues
 */
export async function POST(request: NextRequest) {
  try {
    // Get token and user ID from headers
    const authHeader = request.headers.get('Authorization');
    const userIdHeader = request.headers.get('X-User-ID');
    
    if (!userIdHeader) {
      return NextResponse.json({ error: 'Missing X-User-ID header' }, { status: 400 });
    }

    // Extract request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Add userId to body
    const bodyWithUserId = {
      ...requestBody,
      userId: userIdHeader
    };

    console.log(`Debug RAG request for user ${userIdHeader}:`, bodyWithUserId);
    
    // Forward to debug endpoint on LLM backend
    try {
      const response = await fetch(`${LLM_BACKEND_URL}/debug/query-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {})
        },
        body: JSON.stringify(bodyWithUserId),
      });

      // Get response from LLM backend
      const data = await response.json();
      console.log("Debug RAG response:", data);

      // Return response to client
      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      console.error('Error communicating with LLM backend:', error);
      return NextResponse.json({ 
        error: 'Failed to connect to LLM backend',
        message: error instanceof Error ? error.message : String(error)
      }, { status: 502 });
    }
  } catch (error) {
    console.error('Unexpected error in debug RAG route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 