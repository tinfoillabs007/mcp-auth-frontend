/**
 * @description
 * Centralized constants and configuration settings for the MCP Auth application.
 * Uses environment variables (prefixed with NEXT_PUBLIC_) for URLs and Client ID.
 * Provides defaults suitable for local development.
 *
 * @notes
 * - NEXT_PUBLIC_ variables are exposed to the browser.
 * - Ensure corresponding environment variables are set in .env.local or deployment environment.
 */

export const APP_NAME = 'MCP Auth Demo';

// --- Worker URLs ---
// Base URL of the Authentication Server Worker (auth-worker)
export const AUTH_WORKER_URL = process.env.NEXT_PUBLIC_AUTH_WORKER_URL || 'http://localhost:8788';
// Base URL for the MCP Resource Server API (mcp-worker)
export const MCP_API_BASE_URL = process.env.NEXT_PUBLIC_MCP_WORKER_URL || 'http://localhost:8789';
// Full base path for API calls
export const MCP_API_URL = `${MCP_API_BASE_URL}/api`; // Assuming APIs are under /api path

// --- Hanko Configuration ---
// URL for the Hanko API Backend (used by frontend components)
export const HANKO_API_URL = process.env.NEXT_PUBLIC_HANKO_API_URL || ''; // Get this from your Hanko project

// --- OAuth Settings ---
// The issuer URL is the base URL of the auth-worker
export const OAUTH_ISSUER_URL = AUTH_WORKER_URL;
// The Client ID for *this* Next.js application, as registered in the auth-worker
export const OAUTH_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'mcp-auth-demo-client';
// The *exact* redirect URI registered for this client in the auth-worker config
// Should point to the page in this Next.js app that handles the callback
export const OAUTH_REDIRECT_URI = typeof window !== 'undefined'
    ? `${window.location.origin}/client` // Use browser's origin + /client path
    : process.env.NEXT_PUBLIC_APP_BASE_URL // Fallback for server-side (use env var for base URL)
    ? `${process.env.NEXT_PUBLIC_APP_BASE_URL}/client`
    : 'http://localhost:3000/client'; // Default for local dev server

// Default scopes to request during the OAuth flow
export const OAUTH_DEFAULT_SCOPES = ['openid', 'profile', 'email', 'mcp:data:read', 'offline_access'];

// --- Storage Keys (Used in Browser sessionStorage/localStorage) ---
// Keys for storing temporary OAuth state during the redirect flow
export const STORAGE_KEY_OAUTH_STATE = 'oauth_state';
export const STORAGE_KEY_PKCE_VERIFIER = 'oauth_pkce_verifier';
// Keys for storing tokens (Consider more secure storage for production)
// export const STORAGE_KEY_ACCESS_TOKEN = 'mcp_access_token';
// export const STORAGE_KEY_REFRESH_TOKEN = 'mcp_refresh_token';

// --- Other Constants ---
// export const DEFAULT_SESSION_TIMEOUT_SECONDS = 3600; // 1 hour (Example)

// Ensure required frontend env vars are present (optional build-time check)
if (typeof window !== 'undefined') { // Only run checks in the browser
    if (!HANKO_API_URL) {
        console.warn("Warning: NEXT_PUBLIC_HANKO_API_URL is not set. Hanko components might not work.");
    }
    if (!process.env.NEXT_PUBLIC_AUTH_WORKER_URL) {
         console.warn("Warning: NEXT_PUBLIC_AUTH_WORKER_URL not set. Defaulting to http://localhost:8788. OAuth flow might fail if this is incorrect.");
    }
     if (!process.env.NEXT_PUBLIC_MCP_WORKER_URL) {
         console.warn("Warning: NEXT_PUBLIC_MCP_WORKER_URL not set. Defaulting to http://localhost:8789. API calls might fail if this is incorrect.");
    }
}