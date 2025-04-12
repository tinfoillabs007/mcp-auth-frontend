/**
 * @description
 * Main component for the MCP Client Demo. Handles the OAuth callback from the auth-worker,
 * initiates the server-side token exchange via a Next.js API route, stores authentication state,
 * and provides UI for interacting with the protected MCP Resource Server API.
 *
 * Key features:
 * - Handles redirect callback from the auth-worker.
 * - Extracts authorization code and state from URL query parameters.
 * - Retrieves PKCE verifier and state from sessionStorage using constants.
 * - Validates state parameter for CSRF protection.
 * - Calls the backend API route (`/api/auth/token`) to exchange code for tokens.
 * - Manages authentication state (tokens, errors, loading).
 * - Displays authentication status and token information.
 * - Provides a button to make authenticated API calls to the mcp-worker.
 *
 * @dependencies
 * - react: Core React library (useState, useEffect, useCallback).
 * - next/navigation: Provides useSearchParams hook to read URL params.
 * - lib/mcp/client: Utilities for API calls (`fetchMcpApi`). Type definitions.
 * - lib/constants: Provides storage keys (STORAGE_KEY_PKCE_VERIFIER, STORAGE_KEY_OAUTH_STATE).
 * - components/ui/button: shadcn/ui button component.
 * - sonner: Toast notifications library.
 *
 * @notes
 * - Token exchange now happens server-side via `/api/auth/token`.
 * - Assumes a simple component `CodeBlock` exists for displaying JSON.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from "sonner"; // Import toast from sonner
// Import only fetchMcpApi and type definitions from client lib
import { fetchMcpApi, TokenResponse, TokenErrorResponse } from '@/lib/mcp/client';
import { Button } from '@/components/ui/button';
// Import storage key constants
import { STORAGE_KEY_PKCE_VERIFIER, STORAGE_KEY_OAUTH_STATE } from '@/lib/constants';
// Import the Auth Button to render when idle
import MCPAuthButton from '@/lib/mcp/auth-button';
import { useAuth } from '@/context/auth-context'; // Import useAuth
// Import Hanko SDK
import { Hanko } from "@teamhanko/hanko-elements";
// Read env var directly
const hankoApiUrl = process.env.NEXT_PUBLIC_HANKO_API_URL; 

// Assume a simple CodeBlock component exists for display
const CodeBlock = ({ data }: { data: any }) => <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md text-xs overflow-x-auto"><code>{JSON.stringify(data, null, 2)}</code></pre>;

export function MCPClient() {
  const searchParams = useSearchParams();
  const router = useRouter(); // <-- Get router instance
  const { authState, login, logout, setAuthState } = useAuth(); // Use context state AND the login/logout functions
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);

  // Use useRef for Hanko instance to avoid re-triggering effect on setHanko
  const hankoRef = useRef<Hanko | null>(null); 
  const exchangeAttemptedRef = useRef(false);

  // Initialize Hanko SDK ONCE on mount and store in ref
  useEffect(() => {
    if (hankoApiUrl && !hankoRef.current) { // Initialize only if URL exists and ref is null
        console.log("Initializing Hanko SDK instance...");
        try {
            hankoRef.current = new Hanko(hankoApiUrl);
            console.log("Hanko SDK instance created.");
        } catch (sdkError) {
             console.error("Failed to initialize Hanko SDK:", sdkError);
             // Handle error appropriately (e.g., show error to user)
        }
    } else if (!hankoApiUrl) {
        console.error("NEXT_PUBLIC_HANKO_API_URL is not configured.");
    }
  }, []); // Empty dependency array - runs only once on mount

  // Function to handle linking after login (now uses hankoRef)
  const linkHankoToSupabase = useCallback(async (currentAuthState: typeof authState): Promise<string | null> => {
    const hanko = hankoRef.current; // Get instance from ref
    
    // Check ref for Hanko instance
    if (!hanko || currentAuthState.status !== 'authenticated' || !currentAuthState.accessToken) {
        console.warn(`linkHankoToSupabase: Preconditions not met (Hanko SDK Ready: ${!!hanko}, Status: ${currentAuthState.status}, Token: ${!!currentAuthState.accessToken})`);
        return null;
    }

    console.log("linkHankoToSupabase: Attempting to fetch Hanko user details...");
    try {
        const hankoUser = await hanko.user.getCurrent();
        console.log("Hanko user details fetched client-side:", hankoUser);

        if (hankoUser && hankoUser.id && hankoUser.email) {
            // Now we have Hanko ID, Email, and the authState (which might have supabaseUserId undefined)
            // Call the linking API route
            console.log(`Calling linking API with Hanko User ${hankoUser.id}, Email ${hankoUser.email}, Current Supabase User ${currentAuthState.supabaseUserId}`);
            try {
                const linkResponse = await fetch('/api/auth/link-supabase', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentAuthState.accessToken}` 
                    },
                    body: JSON.stringify({
                        hankoUserId: hankoUser.id,
                        hankoEmail: hankoUser.email,
                        currentSupabaseUserId: currentAuthState.supabaseUserId 
                    })
                });
                const linkData = await linkResponse.json();

                if (!linkResponse.ok) {
                    throw new Error(linkData.message || `Linking failed: ${linkResponse.status}`);
                }

                console.log("Supabase user linking successful/confirmed:", linkData);
                const confirmedUserId = linkData.supabaseUserId; // Get ID from response

                if (confirmedUserId && confirmedUserId !== currentAuthState.supabaseUserId) {
                    console.log("Updating auth context with confirmed Supabase User ID.");
                    // Update the existing auth state with the confirmed ID
                    setAuthState(prev => ({ ...prev, supabaseUserId: confirmedUserId }));
                } else if (!confirmedUserId) {
                     console.warn("Linking API did not return a Supabase User ID.");
                }

                // Return the confirmed/fetched ID (or null if missing)
                return confirmedUserId || null; 

            } catch (linkError: any) {
                console.error("Failed to link Hanko user to Supabase user:", linkError);
                toast.error("Account Linking Error", { description: linkError.message });
            }
        } else {
             console.error("Could not get valid Hanko user details client-side.");
        }
    } catch (err) {
        console.error("Failed to fetch Hanko user details client-side:", err);
        // Handle error fetching Hanko details if needed
    }
    
    return null; // Return null if any error occurred
  }, [setAuthState]); // Removed hanko state from deps, using ref now

  // Effect to handle the OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // --- Handle redirect errors ---
    if (error) {
        if (!exchangeAttemptedRef.current) { // Process error only once
            console.error(`OAuth Error received: ${error} - ${errorDescription}`);
            const errorMsg = `Authorization failed: ${error} (${errorDescription || 'No description provided'})`;
            logout(); // Clear auth state
            toast.error("OAuth Error", { description: errorMsg });
            // Clear storage just in case
            sessionStorage.removeItem(STORAGE_KEY_PKCE_VERIFIER);
            sessionStorage.removeItem(STORAGE_KEY_OAUTH_STATE);
            // Clear URL params
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
            }
            exchangeAttemptedRef.current = true; // Mark error as processed
        }
        return;
    }

    // --- Handle successful redirect ---
    // Only proceed if code/state exist, auth is idle, AND exchange not yet attempted
    if (code && state && authState.status === 'idle' && !exchangeAttemptedRef.current && hankoRef.current) {
        
        // Mark attempt *before* async operations
        exchangeAttemptedRef.current = true; 
        console.log('OAuth callback detected. Hanko SDK ready. Starting process...');

        // Use an async IIFE to handle the entire flow
        (async () => {
            try {
                // Retrieve and validate state/verifier
                const storedVerifier = sessionStorage.getItem(STORAGE_KEY_PKCE_VERIFIER);
                const storedState = sessionStorage.getItem(STORAGE_KEY_OAUTH_STATE);
                sessionStorage.removeItem(STORAGE_KEY_PKCE_VERIFIER);
                sessionStorage.removeItem(STORAGE_KEY_OAUTH_STATE);
                console.log(`[MCPClient] Read/Cleared sessionStorage.`);

                if (!storedState || storedState !== state) { throw new Error('State mismatch.'); }
                console.log('OAuth state parameter validated.');
                if (!storedVerifier) { throw new Error('PKCE verifier missing.'); }
                console.log('PKCE verifier retrieved.');

                // Set loading state
                setAuthState(prev => ({ ...prev, status: 'loading', error: null }));

                // --- Exchange Token ---
                console.log('Calling /api/auth/token...');
                const tokenRes = await fetch('/api/auth/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: code, codeVerifier: storedVerifier }),
                });
                const tokenData = await tokenRes.json();
                if (!tokenRes.ok) {
                    throw new Error(tokenData.error_description || tokenData.error || `Token exchange failed: ${tokenRes.status}`);
                }
                console.log('Token exchange successful:', tokenData);
                
                // --- Store initial token data (might lack supabaseUserId) ---
                login(tokenData); 
                console.log(`Tokens stored. Initial Supabase User ID: ${tokenData.supabase_user_id}`);
                
                // --- Link Hanko and get final state (with definite supabaseUserId) ---
                const initialAuthState = { 
                    ...authState, // Spread previous state for safety
                    status: 'authenticated', 
                    accessToken: tokenData.access_token, 
                    refreshToken: tokenData.refresh_token || null,
                    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
                    scope: tokenData.scope || null,
                    supabaseUserId: tokenData.supabase_user_id || null
                } as typeof authState; // Assert type
                const finalSupabaseUserId = await linkHankoToSupabase(initialAuthState);
                console.log(`Linking process completed. Final Supabase User ID: ${finalSupabaseUserId}`);
                
                // --- Success ---
                toast.success("Authentication Successful", { description: "Session initialized."});
                
                // Clear URL AFTER everything is done
                if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', window.location.pathname);
                    console.log('[MCPClient] Cleared auth code/state from URL.');
                }
                
                // Redirect AFTER linking and state update
                console.log("Redirecting to dashboard...");
                router.replace("/dashboard"); // Or appropriate page

            } catch (err: any) {
                // Handle ANY error in the flow
                console.error('Error during OAuth callback processing:', err);
                logout(); // Reset state
                toast.error("Authentication Failed", { description: err.message });
                exchangeAttemptedRef.current = false; // Allow retry on error
            }
        })(); // Immediately invoke the async function

    } else if (authState.status === 'idle' && !code && !error) {
        // Normal page load without callback params
        if (exchangeAttemptedRef.current) {
            // Reset ref if we land here after a previous attempt (e.g., error occurred, user navigated away/back)
            exchangeAttemptedRef.current = false; 
        }
        console.log('Client page loaded, no OAuth callback detected.');
    } else if (code && state && authState.status === 'authenticated') {
         // Callback params still present, but already authenticated. Clear URL.
         console.log("Already authenticated, clearing stale callback params from URL.");
         if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
         }
    } else if (code && state && authState.status === 'idle' && !exchangeAttemptedRef.current && !hankoRef.current) {
        // Condition added: Callback detected but Hanko SDK isn't ready yet
        console.warn("OAuth callback detected, but Hanko SDK not yet initialized. Waiting...");
        // Optional: Set a loading state specific to SDK initialization?
    }

  // Only include dependencies that trigger re-evaluation when necessary
  // Avoid including setAuthState directly if possible
  }, [searchParams, authState.status, login, logout, setAuthState, router, linkHankoToSupabase]); 

  // Handler for making an example API call to the mcp-worker
  const handleApiCall = useCallback(async () => {
    if (authState.status !== 'authenticated' || !authState.accessToken) {
        setApiError('Not authenticated or access token missing.');
        toast.warning("Authentication Required", { description: "Please authenticate first.", duration: 3000 }); // Add toast
        return;
    }
    if (authState.expiresAt && Date.now() > authState.expiresAt) {
        setApiError('Access token expired. Please re-authenticate or refresh.');
        // Use logout to reset state on expiry
        logout(); 
        toast.error("Token Expired", { description: "Your session has expired. Please log in again.", duration: 3000 }); // Add toast
        return;
    }

    setIsApiLoading(true);
    setApiError(null);
    setApiResponse(null);
    console.log('Making API call to mcp-worker...');

    try {
        // Use fetchMcpApi which now points to MCP_API_URL from constants
        // Call the /data endpoint created in mcp-worker/src/index.ts
        const response = await fetchMcpApi(authState.accessToken, '/data'); // Use relative path

        const data = await response.json(); // Attempt to parse JSON regardless of status

        if (!response.ok) {
            console.error(`API call failed (${response.status}):`, data);
            const errorMsg = `API Error (${response.status}): ${data.error || data.message || response.statusText}`;
            setApiError(errorMsg);
            toast.error("API Call Failed", { description: errorMsg }); // Add toast
        } else {
            console.log('API call successful:', data);
            setApiResponse(data);
            toast.success("API Call Successful", { duration: 2000 }); // Add toast
        }
    } catch (error) {
        console.error('Network error during API call:', error);
        const errorMsg = error instanceof Error ? error.message : 'Network error during API call';
        setApiError(errorMsg);
        toast.error("Network Error", { description: errorMsg }); // Add toast
    } finally {
        setIsApiLoading(false);
    }
  }, [authState.status, authState.accessToken, authState.expiresAt, logout]); // Add logout to dependency array

  // --- Conditional Rendering --- 
  if (authState.status === 'idle') {
    // If idle (initial state or after logout/error without callback), show login button
    return (
      <div className="mt-6">
        <p className="mb-4 text-gray-600 dark:text-gray-400">
            Click the button below to start the OAuth flow.
        </p>
        <MCPAuthButton />
      </div>
    );
  }

  // If not idle, show the status display (loading, authenticated, error)
  return (
    <div className="space-y-4">
        <h2 className="text-lg font-semibold">OAuth Client Status</h2>
        <div className="p-4 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <p>Status: <span className={`font-medium ${
                authState.status === 'authenticated' ? 'text-green-600 dark:text-green-400'
                : authState.status === 'error' ? 'text-red-600 dark:text-red-400'
                : authState.status === 'loading' ? 'text-blue-600 dark:text-blue-400'
                : ''
            }`}>
                {authState.status}
            </span></p>
            {authState.error && (
                <p className="text-red-600 dark:text-red-400 mt-2 text-sm">Error: {authState.error}</p>
            )}
            {authState.status === 'authenticated' && authState.accessToken && (
                <div className="mt-4 space-y-3">
                    <div>
                        <p className="text-sm font-medium mb-1">Access Token:</p>
                        <CodeBlock data={authState.accessToken} />
                    </div>
                     {authState.refreshToken && (
                         <div>
                            <p className="text-sm font-medium mb-1">Refresh Token:</p>
                            <CodeBlock data={authState.refreshToken} />
                            <p className="text-xs text-muted-foreground mt-1">Note: Refresh flow not implemented in demo.</p>
                         </div>
                     )}
                     <div>
                         <p className="text-sm">Scope(s): <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1 rounded">{authState.scope || 'N/A'}</span></p>
                     </div>
                     <div>
                        <p className="text-sm">Expires At: {authState.expiresAt ? new Date(authState.expiresAt).toLocaleString() : 'N/A'}</p>
                     </div>

                    <div className="pt-4">
                        <Button onClick={handleApiCall} disabled={isApiLoading}>
                            {isApiLoading ? 'Loading API Response...' : 'Call MCP API (/api/data)'}
                        </Button>
                         {apiError && <p className="text-red-600 dark:text-red-400 mt-2 text-sm">API Call Error: {apiError}</p>}
                         {apiResponse && (
                             <div className="mt-2">
                                 <p className="text-sm font-medium mb-1">API Response:</p>
                                <CodeBlock data={apiResponse} />
                             </div>
                         )}
                    </div>
                </div>
            )}
             {authState.status === 'loading' && (
                <p className="text-blue-600 dark:text-blue-400 mt-2 text-sm">Exchanging code for token via backend...</p>
             )}
        </div>
    </div>
  );
}
