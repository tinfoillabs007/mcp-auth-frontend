/**
 * @description
 * Next.js API route handler for proxying search query requests
 * to the RAG backend service.
 * - POST /api/rag/query: Performs vector search for the authenticated user.
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
 * Handles POST requests to perform a vector search for the authenticated user.
 * Proxies the request to the RAG service backend, adding the user ID.
 */
export async function POST(req: NextRequest) {
    console.log("[API /api/rag/query POST] Received request.");
    try {
        // ---> Read User ID from custom header <--- 
        const userId = req.headers.get('X-User-ID');
        if (!userId) {
            console.warn("[API /api/rag/query POST] Missing X-User-ID header.");
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
        console.log(`[API /api/rag/query POST] Authenticated via header. User ID: ${userId}`);

        // Extract query data from the request body
        const body = await req.json();
        const { queryText /*, matchThreshold, matchCount, sourceTypes */ } = body;

        // Basic validation
        if (!queryText) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing required field: queryText.' }, { status: 400 });
        }

        // Call the RAG service, merging the authenticated userId
        console.log(`[API /api/rag/query POST] Calling fetchRagService for user ${userId}`);
        const queryResponse = await fetchRagService<any[]>('/query', 'POST', { ...body, userId });
        console.log(`[API /api/rag/query POST] fetchRagService returned successfully.`);

        return NextResponse.json(queryResponse);

    } catch (error: any) {
        console.error('[API /api/rag/query POST] Error:', error);
        const message = error.message?.includes("RAG Service Error")
            ? error.message 
            : 'Failed to execute query.';
        let status = 500;
        if (error.message?.includes("Bad Request")) status = 400;
        else if (error.message?.includes("RAG Service Error")) status = 502;

        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}
