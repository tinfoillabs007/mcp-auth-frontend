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
        console.log(`Auth Worker token response body: ${responseText}`);

        let responseData: AuthWorkerTokenResponse | AuthWorkerErrorResponse;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
             console.error("Failed to parse JSON response from auth-worker token endpoint.");
             return NextResponse.json({ error: 'server_error', error_description: 'Invalid response from authorization server.' }, { status: 502 }); // Bad Gateway
        }


		if (!tokenResponse.ok) {
            // Forward the error from the auth server
            console.error('Auth Worker token endpoint returned error:', responseData);
			return NextResponse.json(responseData, { status: tokenResponse.status }); // Use status from auth worker response
		}

        // Token exchange successful, forward the token data
        console.log('Token exchange successful. Forwarding token data to client.');
		return NextResponse.json(responseData as AuthWorkerTokenResponse, { status: 200 });

	} catch (error: any) {
		console.error('Network or fetch error during token exchange:', error);
		return NextResponse.json({ error: 'server_error', error_description: `Failed to communicate with authorization server: ${error.message}` }, { status: 503 }); // Service Unavailable
	}
}
