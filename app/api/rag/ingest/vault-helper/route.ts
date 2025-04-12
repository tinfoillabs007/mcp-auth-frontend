import { NextRequest, NextResponse } from 'next/server';
import { fetchRagService } from '@/lib/rag/client'; // Adjust path if needed
import { randomUUID } from 'crypto'; // Import randomUUID

// Helper to get or create the RAG source ID via the proxy route
async function getOrCreateRagSourceId(userId: string, accountType: string, sourceIdentifier: string = 'vault-agent'): Promise<string | null> {
    const proxyUrlBase = '/api/rag/sources'; // Relative URL to the proxy in mcp-auth
    const fetchOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId // Pass user ID for proxy authentication
        }
    };

    try {
        // 1. Try to GET existing sources for this type
        console.log(`[getOrCreateRagSourceId] Checking for existing source: userId=${userId}, accountType=${accountType}`);
        // Note: The proxy GET /api/rag/sources doesn't filter by accountType directly in the current implementation.
        // It relies on fetchRagService to move userId to query params.
        // We might need to filter the results client-side or update the proxy GET later.
        const getResponse = await fetchRagService<any[]>(
             // Using fetchRagService correctly handles moving userId to query param for GET
            '/sources',
            'GET',
            { userId: userId } // Pass userId here
            // We will filter client-side for now
        );

        // Client-side filtering (adjust if proxy GET is updated)
        const existingSource = getResponse.find(source => source.sourceType === accountType);

        if (existingSource) {
            console.log(`[getOrCreateRagSourceId] Found existing source ID: ${existingSource.id}`);
            return existingSource.id;
        }

        // 2. If not found, POST to create a new source
        console.log(`[getOrCreateRagSourceId] No existing source found for type ${accountType}. Creating new one...`);
        const createBody = {
            userId: userId, // RAG service POST /sources expects userId in body
            sourceType: accountType,
            sourceIdentifier: sourceIdentifier // e.g., 'vault-agent-gmail'
            // Add any default metadata if needed
        };
        const newSource = await fetchRagService<any>(
            '/sources', // Target RAG service endpoint
            'POST',
            createBody    // Body for the RAG service POST
        );

        if (newSource && newSource.id) {
             console.log(`[getOrCreateRagSourceId] Created new source ID: ${newSource.id}`);
            return newSource.id;
        } else {
             console.error(`[getOrCreateRagSourceId] Failed to create source or extract ID from response.`);
             return null;
        }

    } catch (error: any) {
        console.error(`[getOrCreateRagSourceId] Error fetching/creating source:`, error);
         // Log the specific error message if available
        console.error(`[getOrCreateRagSourceId] Underlying error message: ${error.message}`);
        return null;
    }
}

export async function POST(request: NextRequest) {
  console.log("[API /api/rag/ingest/vault-helper POST] Received request.");
  let userId: string | null = null;
  try {
    // 1. Authenticate
    userId = request.headers.get('X-User-ID');
    if (!userId) {
      console.warn("[API /api/rag/ingest/vault-helper POST] Missing X-User-ID header.");
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'User ID header missing.' }, { status: 401 });
    }
    console.log(`[API /api/rag/ingest/vault-helper POST] Authenticated via header. User ID: ${userId}`);

    // 2. Parse incoming data from the vault helper (contains vaultData format)
    let extractedData: any;
    try {
        extractedData = await request.json();
        if (!extractedData || typeof extractedData !== 'object' || !extractedData.last_agent_update) {
             throw new Error("Invalid data format received from vault/page.tsx.");
        }
        console.log("[API /api/rag/ingest/vault-helper POST] Parsed request body.");
    } catch (parseError: any) {
        console.error('[API /api/rag/ingest/vault-helper POST] Body Parse Error:', parseError);
        return NextResponse.json({ success: false, error: `Bad Request: ${parseError.message}` }, { status: 400 });
    }

    // ---> Extract the agent result string <---
    const agentResultString = extractedData.last_agent_update?.result;
    const taskTrigger = extractedData.last_agent_update?.task_trigger || 'Unknown task';

    if (!agentResultString || typeof agentResultString !== 'string' || agentResultString.trim() === '') {
        console.warn("[API /api/rag/ingest/vault-helper POST] No valid agent result string found in agent data. Skipping RAG ingest.");
        // Return success as the API call itself worked
        return NextResponse.json({ success: true, message: "Agent ran, but no result content found to ingest.", generatedSourceId: null, generatedDocumentId: null }, { status: 200 });
    }

    // 3. Determine accountType and Get Persistent Source ID via Helper
    const accountType = "gmail"; // Still hardcoded, TODO: make dynamic
    const persistentSourceId = await getOrCreateRagSourceId(userId, accountType); // Call the helper

    if (!persistentSourceId) {
        console.error(`[API /api/rag/ingest/vault-helper POST] Failed to get or create persistent sourceId for user ${userId}, accountType ${accountType}. Aborting ingest.`);
        // Use 502 Bad Gateway, as we failed to talk to a dependency (the RAG source endpoint)
        return NextResponse.json({ success: false, error: 'Bad Gateway', message: 'Failed to resolve data source ID with RAG service.' }, { status: 502 });
    }
    console.log(`[API /api/rag/ingest/vault-helper POST] Using persistent sourceId: ${persistentSourceId}`);

    // 4. Prepare payload for the RAG service - ADD accountType
    const documentId = randomUUID();
    const ragPayload = {
      userId: userId,
      sourceId: persistentSourceId,
      documentId: documentId,
      source: "vault-agent-run", // Keep top-level source identifier if needed by RAG
      accountType: accountType, // <-- ADDED accountType
      // ---> Move content to the TOP LEVEL <---
      content: agentResultString,
      // ---> Move other metadata into a dedicated 'metadata' object <---
      metadata: {
          task_trigger: taskTrigger
          // Add any other relevant metadata here
      }
      // The 'data' field is removed unless the RAG service specifically needs it
    };

    console.log(`[API /api/rag/ingest/vault-helper POST] Sending data to RAG /ingest (SourceID: ${persistentSourceId}, DocumentID: ${documentId})`);
    // Log the new payload structure
    console.log("[API /api/rag/ingest/vault-helper POST] Prepared ragPayload for /ingest:", JSON.stringify(ragPayload, null, 2));
    // Log snippet of content being sent
    console.log(`[API /api/rag/ingest/vault-helper POST] Content Snippet: ${agentResultString.substring(0, 100)}...`);

    // 5. Call the RAG service's ingest endpoint
    const ingestResult = await fetchRagService<any>(
      '/ingest',
      'POST',
      ragPayload // Send the *newly structured* payload
    );

    // 6. Return success response
    console.log(`[API /api/rag/ingest/vault-helper POST] Successfully ingested document ${documentId} into source ${persistentSourceId} for user ${userId}`);
    return NextResponse.json({ success: true, data: ingestResult, sourceId: persistentSourceId, documentId: documentId }, { status: 200 });

  } catch (error: any) {
    console.error(`[API /api/rag/ingest/vault-helper POST] Processing Error for user ${userId || 'UNKNOWN'}:`, error);
    const errorMessage = error.message?.includes("RAG Service Error")
        ? error.message
        : error.message || 'Internal Server Error';
    let statusCode = 500;
    if (error.message?.includes("Bad Request")) statusCode = 400;
    else if (error.message?.includes("Unauthorized")) statusCode = 401;
    else if (error.message?.includes("Not Found")) statusCode = 404;
    else if (error.message?.includes("RAG Service Error")) statusCode = 502;

    return NextResponse.json({ success: false, error: 'Proxy Error', message: errorMessage }, { status: statusCode });
  }
}

// Optional: Add GET/PUT/DELETE handlers if needed, otherwise they default to 405 Method Not Allowed
