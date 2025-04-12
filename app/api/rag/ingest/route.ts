/**
 * @description
 * Next.js API route handler for proxying document ingestion requests
 * to the RAG backend service.
 * - POST /api/rag/ingest: Ingests content for the authenticated user.
 *
 * @dependencies
 * - @supabase/ssr: For server-side authentication.
 * - next/server: For Next.js API route types.
 * - ../../../../lib/rag/client: Utility function to call the RAG service.
 * - cookies: Required by @supabase/ssr.
 */

import { NextRequest, NextResponse } from 'next/server';
// Remove Supabase Admin import if only used for auth
// import { supabaseAdmin } from '../../../../utils/supabase-admin';
import { fetchRagService } from '../../../../lib/rag/client'; // Adjust path
// No cookies import needed here

/**
 * Handles POST requests to ingest content for the authenticated user.
 * Proxies the request to the RAG service backend, adding the user ID.
 */
export async function POST(req: NextRequest) {
    console.log("[API /api/rag/ingest POST] Received request.");
    try {
        // ---> Read User ID from custom header <--- 
        const userId = req.headers.get('X-User-ID');
        if (!userId) {
            console.warn("[API /api/rag/ingest POST] Missing X-User-ID header.");
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
        console.log(`[API /api/rag/ingest POST] Authenticated via header. User ID: ${userId}`);

        // Extract ingestion data from the request body
        const body = await req.json();
        const { sourceId, documentId, content, accountType, metadata } = body;

        // Basic validation for required fields expected by RAG service
        if (!sourceId) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing required field: sourceId.' }, { status: 400 });
        }
        if (!documentId) {
             return NextResponse.json({ error: 'Bad Request', message: 'Missing required field: documentId.' }, { status: 400 });
        }
        if (!content) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing required field: content.' }, { status: 400 });
        }
         if (!accountType) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing required field: accountType.' }, { status: 400 });
        }
        // Metadata is optional, no specific validation here unless needed

        // Call the RAG service, merging the authenticated userId
        console.log(`[API /api/rag/ingest POST] Calling fetchRagService for user ${userId}`);
        const ingestResponse = await fetchRagService<any>('/ingest', 'POST', { ...body, userId });
        console.log(`[API /api/rag/ingest POST] fetchRagService returned successfully.`);

        return NextResponse.json(ingestResponse, { status: 201 }); 

    } catch (error: any) {
        console.error('[API /api/rag/ingest POST] Error:', error);
        const message = error.message?.includes("RAG Service Error")
            ? error.message
            : 'Failed to ingest document.';
        let status = 500; // Default internal server error
        if (error.message?.includes("Not Found")) status = 404; // e.g., if sourceId doesn't exist in RAG service
        else if (error.message?.includes("Bad Request")) status = 400; // e.g., if RAG service validation fails
        else if (error.message?.includes("RAG Service Error")) status = 502; // Bad Gateway if RAG service itself errored

        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}
