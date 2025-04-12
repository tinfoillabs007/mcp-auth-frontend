/**
 * @description
 * Next.js API route handlers for specific RAG data sources identified by ID.
 * Acts as an authenticated proxy to the RAG backend service.
 * - GET /api/rag/sources/[id]: Gets details of a specific source.
 * - PUT /api/rag/sources/[id]: Updates a specific source.
 * - DELETE /api/rag/sources/[id]: Deletes a specific source.
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
import { fetchRagService } from '../../../../../lib/rag/client'; // Adjust path
// No cookies import needed here

// Helper function no longer needed if using header
// async function getUserId(): Promise<string | null> { ... }

interface RouteParams {
    params: { id: string }; 
}

/**
 * Handles GET requests for a specific RAG data source.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    const { id } = params;
    console.log(`[API /api/rag/sources/${id} GET] Received request.`);
    try {
        const userId = req.headers.get('X-User-ID');
        if (!userId) {
            console.warn(`[API /api/rag/sources/${id} GET] Missing X-User-ID header.`);
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
        console.log(`[API /api/rag/sources/${id} GET] Authenticated via header. User ID: ${userId}`);
        if (!id) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing source ID.' }, { status: 400 });
        }

        console.log(`[API /api/rag/sources/${id} GET] Calling fetchRagService for user ${userId}`);
        const source = await fetchRagService<any>(`/sources/${id}?userId=${userId}`, 'GET', null);
        console.log(`[API /api/rag/sources/${id} GET] fetchRagService returned successfully.`);
        return NextResponse.json(source);

    } catch (error: any) {
        console.error(`[API /api/rag/sources/${id} GET] Error:`, error);
        const message = error.message?.includes("RAG Service Error") ? error.message : 'Failed to fetch data source.';
        const status = error.message?.includes("Not Found") ? 404 : (error.message?.includes("RAG Service Error") ? 502 : 500);
        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}

/**
 * Handles PUT requests to update a specific RAG data source.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
    const { id } = params;
     console.log(`[API /api/rag/sources/${id} PUT] Received request.`);
    try {
        // ---> Read User ID from custom header <--- 
        const userId = req.headers.get('X-User-ID');
         if (!userId) {
            console.warn(`[API /api/rag/sources/${id} PUT] Missing X-User-ID header.`);
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
        console.log(`[API /api/rag/sources/${id} PUT] Authenticated via header. User ID: ${userId}`);

        if (!id) {
             return NextResponse.json({ error: 'Bad Request', message: 'Missing source ID.' }, { status: 400 });
        }

        // PUT request still sends userId in the body
        const body = await req.json();
        if (!body || Object.keys(body).length === 0) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing update data in request body.' }, { status: 400 });
        }

        console.log(`[API /api/rag/sources/${id} PUT] Calling fetchRagService for user ${userId}`);
        const updatedSource = await fetchRagService<any>(`/sources/${id}`, 'PUT', { ...body, userId });
        console.log(`[API /api/rag/sources/${id} PUT] fetchRagService returned successfully.`);
        return NextResponse.json(updatedSource);

    } catch (error: any) {
        console.error(`[API /api/rag/sources/${id} PUT] Error:`, error);
         const message = error.message?.includes("RAG Service Error") ? error.message : 'Failed to update data source.';
        const status = error.message?.includes("Not Found") ? 404 : (error.message?.includes("RAG Service Error") ? 502 : 500);
        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}

/**
 * Handles DELETE requests for a specific RAG data source.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const { id } = params;
    console.log(`[API /api/rag/sources/${id} DELETE] Received request.`);
    try {
        const userId = req.headers.get('X-User-ID');
         if (!userId) {
            console.warn(`[API /api/rag/sources/${id} DELETE] Missing X-User-ID header.`);
            return NextResponse.json({ error: 'Unauthorized', message: 'User ID header missing or invalid.' }, { status: 401 });
        }
        console.log(`[API /api/rag/sources/${id} DELETE] Authenticated via header. User ID: ${userId}`);
        if (!id) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing source ID.' }, { status: 400 });
        }

        console.log(`[API /api/rag/sources/${id} DELETE] Calling fetchRagService for user ${userId}`);
        await fetchRagService<null>(`/sources/${id}?userId=${userId}`, 'DELETE', null);
        console.log(`[API /api/rag/sources/${id} DELETE] fetchRagService returned successfully.`);
        return new NextResponse(null, { status: 204 });

    } catch (error: any) {
        console.error(`[API /api/rag/sources/${id} DELETE] Error:`, error);
        const message = error.message?.includes("RAG Service Error") ? error.message : 'Failed to delete data source.';
        const status = error.message?.includes("Not Found") ? 404 : (error.message?.includes("RAG Service Error") ? 502 : 500);
        return NextResponse.json({ error: 'Proxy Error', message }, { status });
    }
}
