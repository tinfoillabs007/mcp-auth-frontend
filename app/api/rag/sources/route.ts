/**
 * @description
 * Next.js API route handlers for managing RAG data sources (list and create).
 * Acts as an authenticated proxy to the RAG backend service.
 * - GET /api/rag/sources: Lists sources for the authenticated user.
 * - POST /api/rag/sources: Creates a new source for the authenticated user.
 *
 * @dependencies
 * - @supabase/ssr: For server-side authentication.
 * - next/server: For Next.js API route types (NextRequest, NextResponse).
 * - ../../../../lib/rag/client: Utility function to call the RAG service.
 * - cookies: Required by @supabase/ssr.
 */

import { NextRequest, NextResponse } from 'next/server';
// Remove Supabase Admin import if only used for auth
// import { supabaseAdmin } from '../../../../utils/supabase-admin';
import { fetchRagService } from '../../../../lib/rag/client'; // Adjust path
// No cookies import needed here

/**
 * Handles GET requests to list RAG data sources for the authenticated user.
 * Proxies the request to the RAG service backend.
 */
export async function GET(req: NextRequest) {
    console.log("[API /api/rag/sources GET] Received request.");
    try {
        const userId = req.headers.get('X-User-ID');
        if (!userId) {
            console.warn("[API /api/rag/sources GET] Missing X-User-ID header.");
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
        console.log(`[API /api/rag/sources GET] Authenticated via header. User ID: ${userId}`);

        // ---> Call fetchRagService, PASSING userId in BODY for GET <--- 
        // fetchRagService will now handle moving it to query param
        console.log(`[API /api/rag/sources GET] Calling fetchRagService for user ${userId}`);
        const sources = await fetchRagService<any[]>('/sources', 'GET', { userId });
        console.log(`[API /api/rag/sources GET] fetchRagService returned successfully.`);
        return NextResponse.json(sources);

    } catch (error: any) {
        console.error('[API /api/rag/sources GET] Error:', error);
        const message = error.message?.includes("RAG Service Error")
            ? error.message
            : 'Failed to fetch data sources.';
        const status = error.message?.includes("RAG Service Error") ? 502 : 500;
        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}

/**
 * Handles POST requests to create a new RAG data source for the authenticated user.
 * Proxies the request to the RAG service backend.
 */
export async function POST(req: NextRequest) {
    console.log("[API /api/rag/sources POST] Received request.");
    try {
        // ---> Read User ID from custom header <--- 
        const userId = req.headers.get('X-User-ID');

        if (!userId) {
            console.warn("[API /api/rag/sources POST] Missing X-User-ID header.");
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
         console.log(`[API /api/rag/sources POST] Authenticated via header. User ID: ${userId}`);

        // Extract source data from the request body
        const body = await req.json();
        const { sourceType, sourceIdentifier, metadata } = body;

        // Basic validation
        if (!sourceType) {
             return NextResponse.json({ error: 'Bad Request', message: 'Missing required field: sourceType.' }, { status: 400 });
        }

        // Call the RAG service, merging the authenticated userId
        console.log(`[API /api/rag/sources POST] Calling fetchRagService for user ${userId}`);
        const createdSource = await fetchRagService<any>('/sources', 'POST', { ...body, userId });
        console.log(`[API /api/rag/sources POST] fetchRagService returned successfully.`);

        return NextResponse.json(createdSource, { status: 201 });

    } catch (error: any) {
        console.error('[API /api/rag/sources POST] Error:', error);
        const message = error.message?.includes("RAG Service Error")
            ? error.message
            : 'Failed to create data source.';
         const status = error.message?.includes("RAG Service Error") ? 502 : 500;
        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}
