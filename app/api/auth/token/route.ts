/**
 * @description
 * API Route Handler for exchanging an authorization code for OAuth tokens.
 * This route acts as a backend-for-frontend (BFF) layer. It receives the code
 * and PKCE verifier from the client-side component (`MCPClient`) and performs
 * the server-to-server call to the actual Authorization Server's (`auth-worker`)
 * token endpoint.
 *
 * @dependencies
 * - next/server: Provides NextResponse and NextRequest types.
 * - lib/constants: Provides AUTH_WORKER_URL, OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI.
 *
 * @notes
 * - Handles POST requests to /api/auth/token.
 * - Expects 'code' and 'codeVerifier' in the JSON request body.
 * - Calls the auth-worker's /token endpoint.
 * - Returns token data or error details back to the client component.
 * - This approach keeps sensitive token exchange logic off the client-side,
 *   although for a public client like this demo, the benefit is mainly structure;
 *   for confidential clients, this is where the client secret would be used securely.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
	AUTH_WORKER_URL, // URL of your separate auth worker
	OAUTH_CLIENT_ID, // Client ID for this Next.js app
	OAUTH_REDIRECT_URI // Redirect URI used in the initial auth request
} from '@/lib/constants';
import { supabaseAdmin } from '@/utils/supabase-admin'; // Import your admin client

// Define expected request body structure
interface TokenRequestBody {
	code?: string;
	codeVerifier?: string;
}

// Define expected success response structure from auth-worker
interface AuthWorkerTokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_token?: string;
    scope: string;
}

// Define expected error response structure from auth-worker
interface AuthWorkerErrorResponse {
    error: string;
    error_description?: string;
}

/**
 * Handles POST requests to exchange authorization code for tokens.
 * @param request - The incoming NextRequest object.
 * @returns A NextResponse object with token data or error details.
 */
export async function POST(request: NextRequest) {
	console.log('API Route /api/auth/token received POST request.');

	let requestBody: TokenRequestBody;
	try {
		requestBody = await request.json();
	} catch (error) {
		console.error('Failed to parse request body:', error);
		return NextResponse.json({ error: 'invalid_request', error_description: 'Invalid request body. JSON expected.' }, { status: 400 });
	}

	const { code, codeVerifier } = requestBody;

	// Validate input
	if (!code || !codeVerifier) {
        console.error('Missing code or codeVerifier in request body.');
		return NextResponse.json({ error: 'invalid_request', error_description: 'Missing required parameters: code, codeVerifier.' }, { status: 400 });
	}

    // --- Prepare request to Auth Worker's Token Endpoint ---
    const tokenUrl = `${AUTH_WORKER_URL}/token`;
	const params = new URLSearchParams();
	params.append('grant_type', 'authorization_code');
	params.append('code', code);
	params.append('redirect_uri', OAUTH_REDIRECT_URI); // Must match the one used in /authorize
	params.append('client_id', OAUTH_CLIENT_ID);       // Client ID of this Next.js app
	params.append('code_verifier', codeVerifier);     // PKCE code verifier

    console.log(`Sending request to Auth Worker token endpoint: ${tokenUrl}`);
    console.log('Token request params:', {
        grant_type: 'authorization_code',
        code: '***', // Mask code
        redirect_uri: OAUTH_REDIRECT_URI,
        client_id: OAUTH_CLIENT_ID,
        code_verifier: '***' // Mask verifier
    });


	try {
		const tokenResponse = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
                // No Authorization header for public clients using PKCE
			},
			body: params.toString(),
            cache: 'no-store', // Ensure fresh request for token exchange
		});

        // Log raw response for debugging
        const responseText = await tokenResponse.text();
        console.log(`Auth Worker token response status: ${tokenResponse.status}`);
        // console.log(`Auth Worker token response body: ${responseText}`); // Maybe hide tokens in prod logs

        let responseData: AuthWorkerTokenResponse | AuthWorkerErrorResponse;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
             console.error("Failed to parse JSON response from auth-worker token endpoint.");
             return NextResponse.json({ error: 'server_error', error_description: 'Invalid response from authorization server.' }, { status: 502 });
        }


		if (!tokenResponse.ok || 'error' in responseData) {
            // Forward the error from the auth server
            console.error('Auth Worker token endpoint returned error:', responseData);
            const errorResponse = responseData as AuthWorkerErrorResponse;
			return NextResponse.json(errorResponse, { status: tokenResponse.status }); // Use status from auth worker response
		}

        // Token exchange successful, forward the token data
        console.log('Token exchange successful.');

        // --- REMOVE User Info Fetch Block ---
        /*
        const userInfoUrl = `${AUTH_WORKER_URL}/api/me`; 
        let userEmail: string | undefined;
        let userName: string | undefined; 
        try {
             console.log(`Fetching user info from: ${userInfoUrl}`);
             const userInfoResponse = await fetch(userInfoUrl, {
                 headers: {
                     'Authorization': `Bearer ${tokenData.access_token}` 
                 }
             });
             // ... rest of fetch and error handling ...
             userEmail = userInfo.email; 
             userName = userInfo.name;
        } catch (userInfoError: any) {
            // ... error handling ...
             return NextResponse.json({ error: 'userinfo_error', ... }, { status: 502 });
        }
        */
       // We will attempt find/create without email initially, relying on client to provide later if needed
       let userEmail: string | undefined = undefined; // No email fetched here
       let userName: string | undefined = undefined; // No name fetched here

        // --- REMOVE Find or Create Supabase User Block ---
        /* 
        let supabaseUserId: string | undefined;
        let userAlreadyExisted = false;
        try {
            if (!userEmail) { 
                throw new Error("Cannot find or create Supabase user without an email address.");
            }
            // ... rest of try block ...
        } catch (supabaseError: any) {
             // ... catch block ...
             return NextResponse.json({ error: 'supabase_user_error', ... }, { status: 500 });
        }
        if (userAlreadyExisted) {
             try {
                 // ... find block ...
            } catch(findError: any) {
                 // ... catch block ...
                 return NextResponse.json({ error: 'supabase_user_find_error', ... }, { status: 500 });
            }
        }
        if (!supabaseUserId) {
            // ... error check ...
             return NextResponse.json({ error: 'linking_error', ... }, { status: 500 });
        }
        */

        // --- Return ONLY Tokens to Client --- 
        // The linking happens in a separate step initiated by the client
        const tokenData = responseData as AuthWorkerTokenResponse;
        // The payload no longer includes supabase_user_id from this route
        const responsePayload = { ...tokenData }; 

        console.log('[Token Route] Returning tokens to client.');
        return NextResponse.json(responsePayload, { status: 200 });

	} catch (error: any) {
		console.error('Network or fetch error during token exchange:', error);
		return NextResponse.json({ error: 'server_error', error_description: `Failed to communicate with authorization server: ${error.message}` }, { status: 503 }); // Service Unavailable
	}
}
