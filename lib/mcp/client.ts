/**
 * @description
 * Client-side utilities for handling the **initiation** of the OAuth 2.1 flow
 * with the auth-worker and for making authenticated API calls to the mcp-worker.
 * The token exchange itself is now handled server-side in this Next.js app.
 *
 * Key functions:
 * - PKCE Generation: Creates code verifier and challenge.
 * - State Generation: Creates random state for CSRF protection.
 * - Authorization Redirect: Constructs the /authorize URL for auth-worker and redirects the user.
 * - API Fetch: Makes authenticated requests to the mcp-worker API using the access token.
 *
 * @dependencies
 * - lib/constants: Provides URLs, client ID, redirect URI, scopes, storage keys.
 *
 * @notes
 * - Uses browser's SubtleCrypto API for SHA256 and crypto.getRandomValues.
 * - Stores PKCE verifier and state temporarily in sessionStorage.
 */

import {
	AUTH_WORKER_URL,
	OAUTH_CLIENT_ID,
	OAUTH_REDIRECT_URI,
	OAUTH_DEFAULT_SCOPES,
	STORAGE_KEY_PKCE_VERIFIER,
	STORAGE_KEY_OAUTH_STATE,
	MCP_API_URL // Base URL + path for the MCP resource server API (e.g., http://localhost:8789/api)
} from '@/lib/constants';

// --- Type Definitions (Token types might be needed by components still) ---

export interface TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number; // Typically seconds
    refresh_token?: string;
    scope: string; // Space-separated list of granted scopes
    // We might add other fields returned by our backend API route
    expires_at?: number; // Expiry timestamp in ms (calculated client-side or returned by backend)
}

export interface TokenErrorResponse {
    error: string;
    error_description?: string;
}


// --- PKCE and State Generation Utilities (Still needed client-side) ---

/** Generates a cryptographically random string */
export function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < length; i++) {
            result += characters.charAt(randomValues[i] % characters.length);
        }
    } else {
        console.warn("crypto.getRandomValues not available during string generation.");
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
    }
    return result;
}

/** Calculates the SHA256 hash of a string */
async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
         return window.crypto.subtle.digest('SHA-256', data);
    } else {
         console.error("SubtleCrypto API not available for SHA256 calculation.");
         throw new Error("Crypto API unavailable.");
    }
}

/** Base64 URL encodes an ArrayBuffer */
function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
         return window.btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    } else {
         console.error("btoa function not available.");
         throw new Error("Cannot perform base64url encoding.");
    }
}

/** Generates PKCE code_verifier and corresponding code_challenge */
async function generatePkceChallenge(): Promise<{ verifier: string; challenge: string }> {
    const verifier = generateRandomString(64); // Generate a random verifier
    const challengeBuffer = await sha256(verifier); // Hash the verifier
    const challenge = base64UrlEncode(challengeBuffer); // Encode the hash
    return { verifier, challenge };
}

// --- Authorization Flow Initiation ---

/**
 * Generates PKCE/state, stores them, and redirects user to the authorization server (auth-worker).
 */
export async function redirectToAuthorization() {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
        console.error("redirectToAuthorization called in non-browser environment.");
        return;
    }
    try {
        // 1. Generate PKCE verifier and challenge
        const { verifier, challenge } = await generatePkceChallenge();

        // 2. Generate state
        const state = generateRandomString(32);

        // 3. Store verifier and state in sessionStorage using keys from constants
        sessionStorage.setItem(STORAGE_KEY_PKCE_VERIFIER, verifier);
        sessionStorage.setItem(STORAGE_KEY_OAUTH_STATE, state);
        console.log(`Stored PKCE verifier ('${STORAGE_KEY_PKCE_VERIFIER}') and state ('${STORAGE_KEY_OAUTH_STATE}') in sessionStorage.`);

        // 4. Construct the authorization URL using constants
        const authUrl = new URL(`${AUTH_WORKER_URL}/authorize`);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', OAUTH_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', OAUTH_REDIRECT_URI); // Use correct callback URL
        authUrl.searchParams.append('scope', OAUTH_DEFAULT_SCOPES.join(' '));
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('code_challenge', challenge);
        authUrl.searchParams.append('code_challenge_method', 'S256');

        // 5. Redirect the user
        console.log('Redirecting to authorization server:', authUrl.toString());
        window.location.href = authUrl.toString();

    } catch (error) {
        console.error("Failed to initiate authorization flow:", error);
        alert("Could not start the login process. Please check the console.");
    }
}


// --- Token Exchange (REMOVED) ---
// The exchangeCodeForToken function is removed. This logic now resides in
// the Next.js backend API route (e.g., app/api/auth/token/route.ts).


// --- Authenticated API Calls ---

/**
 * Makes an authenticated request to the MCP Resource Server API (mcp-worker).
 * @param accessToken The OAuth access token obtained via the backend token exchange.
 * @param relativeApiPath The relative path of the API endpoint starting from the API base (e.g., '/data').
 * @param options Optional Fetch options (method, body, etc.).
 * @returns The raw Fetch Response object.
 */
export async function fetchMcpApi(accessToken: string, relativeApiPath: string, options: RequestInit = {}): Promise<Response> {
    // Construct full API URL using MCP_API_URL from constants
    const apiUrl = `${MCP_API_URL}${relativeApiPath.startsWith('/') ? relativeApiPath : '/' + relativeApiPath}`;
    console.log(`Making authenticated API call to MCP Resource Server: ${apiUrl}`);

    const headers = new Headers(options.headers || {});
    headers.append('Authorization', `Bearer ${accessToken}`);

    try {
        const response = await fetch(apiUrl, {
            ...options, // Spread existing options (method, body, etc.)
            headers: headers, // Add the Authorization header
        });
        return response; // Return the raw response for the caller to handle
    } catch (error) {
        console.error(`Network error fetching MCP API (${relativeApiPath}):`, error);
        throw error; // Re-throw network errors
    }
}
