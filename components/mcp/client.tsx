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

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from "sonner"; // Import toast from sonner
// Import only fetchMcpApi and type definitions from client lib
import { fetchMcpApi, TokenResponse, TokenErrorResponse } from '@/lib/mcp/client';
import { Button } from '@/components/ui/button';
// Import storage key constants
import { STORAGE_KEY_PKCE_VERIFIER, STORAGE_KEY_OAUTH_STATE } from '@/lib/constants';
// Import the Auth Button to render when idle
import MCPAuthButton from '@/lib/mcp/auth-button';
import { useAuth } from '@/context/auth-context'; // Import useAuth

// Assume a simple CodeBlock component exists for display
const CodeBlock = ({ data }: { data: any }) => <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md text-xs overflow-x-auto"><code>{JSON.stringify(data, null, 2)}</code></pre>;

export function MCPClient() {
  const searchParams = useSearchParams();
  const { authState, setAuthState } = useAuth(); // Use context state
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);

  // Effect to handle the OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for errors returned from the authorization server
    if (error) {
        console.error(`OAuth Error received: ${error} - ${errorDescription}`);
        const errorMsg = `Authorization failed: ${error} (${errorDescription || 'No description provided'})`;
        setAuthState({
            status: 'error',
            error: errorMsg,
            accessToken: null, refreshToken: null, expiresAt: null, scope: null,
        });
        toast.error("OAuth Error", { description: errorMsg }); // Add toast
        // Clear stored state if an error occurred related to the flow
        sessionStorage.removeItem(STORAGE_KEY_PKCE_VERIFIER); // Use constant
        sessionStorage.removeItem(STORAGE_KEY_OAUTH_STATE);   // Use constant
         // Clear URL params to avoid reprocessing on refresh
         if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
         }
        return;
    }


    // Only proceed if we have a code and state, and are currently idle (to prevent loops)
    if (code && state && authState.status === 'idle') {
      console.log('OAuth callback detected. Code:', code, 'State:', state);
      setAuthState(prev => ({ ...prev, status: 'loading', error: null }));

      // Retrieve stored values
      const storedVerifier = sessionStorage.getItem(STORAGE_KEY_PKCE_VERIFIER);
      const storedState = sessionStorage.getItem(STORAGE_KEY_OAUTH_STATE);
      
      // Log retrieved values and state from URL
      console.log(`[MCPClient] State from URL: ${state}`);
      console.log(`[MCPClient] Stored state from sessionStorage (key: ${STORAGE_KEY_OAUTH_STATE}):`, storedState);
      console.log(`[MCPClient] Stored verifier from sessionStorage (key: ${STORAGE_KEY_PKCE_VERIFIER}):`, storedVerifier);

      // Clean up sessionStorage immediately after retrieval
      sessionStorage.removeItem(STORAGE_KEY_PKCE_VERIFIER);
      sessionStorage.removeItem(STORAGE_KEY_OAUTH_STATE);
      console.log(`[MCPClient] Cleared sessionStorage items for keys: ${STORAGE_KEY_PKCE_VERIFIER}, ${STORAGE_KEY_OAUTH_STATE}`);

      // Validate state parameter for CSRF protection
      if (!storedState || storedState !== state) {
        console.error('OAuth state mismatch! Potential CSRF attack.');
        const errorMsg = 'State mismatch. Authorization process aborted.';
        setAuthState({
          status: 'error',
          error: errorMsg,
          accessToken: null, refreshToken: null, expiresAt: null, scope: null,
        });
        toast.error("Security Alert", { description: errorMsg }); // Add toast
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        return;
      }
      console.log('OAuth state parameter validated successfully.');

      if (!storedVerifier) {
         console.error('OAuth PKCE verifier not found in session storage.');
         const errorMsg = 'PKCE verifier missing. Authorization process aborted.';
         setAuthState({
           status: 'error',
           error: errorMsg,
           accessToken: null, refreshToken: null, expiresAt: null, scope: null,
         });
         toast.error("Authorization Error", { description: errorMsg }); // Add toast
          if (typeof window !== 'undefined') {
             window.history.replaceState({}, '', window.location.pathname);
          }
         return;
      }
       console.log('PKCE verifier retrieved successfully.');

      // --- Initiate Server-Side Token Exchange ---
      console.log('Calling backend API route (/api/auth/token) to exchange code...');
      fetch('/api/auth/token', { // Call own backend route
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              code: code,
              codeVerifier: storedVerifier,
          }),
      })
      .then(async (res) => {
          // Try to parse JSON regardless of status code
          let responseData;
          try {
               responseData = await res.json();
          } catch (parseError) {
                console.error("Failed to parse JSON response from /api/auth/token:", parseError);
                // Throw a new error or handle appropriately
                 throw new Error(`Received non-JSON response (${res.status}) from token exchange endpoint.`);
          }

          if (!res.ok) {
              // If response not OK, treat responseData as TokenErrorResponse
              console.error('Token exchange API route error:', responseData);
              // Throw an error to be caught by the .catch block below
              const errorPayload = responseData as TokenErrorResponse;
              throw new Error(errorPayload.error_description || errorPayload.error || `Token exchange failed with status ${res.status}`);
          }
          // If response OK, treat responseData as TokenResponse
          console.log('Token exchange via API route successful:', responseData);
          toast.success("Authentication Successful", { description: "Tokens obtained.", duration: 2000 }); // Add toast
          return responseData as TokenResponse; // Assume backend returns compatible structure
      })
      .then(tokenData => {
            // Handle token exchange success (response from backend API route)
            const expiresIn = tokenData.expires_in;
            // Ensure expires_in is a valid number before calculation
            const expiresAtMs = typeof expiresIn === 'number' && expiresIn > 0 
                                ? Date.now() + expiresIn * 1000 
                                : null;
            console.log(`Tokens obtained via backend. Access token expires in ${expiresIn} seconds (at ${expiresAtMs ? new Date(expiresAtMs).toLocaleString() : 'N/A'}).`);
            setAuthState({
              status: 'authenticated',
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || null,
              expiresAt: expiresAtMs,
              scope: tokenData.scope,
              error: null,
            });
            // **Security Note:** Storing tokens in React state/sessionStorage is for demo ONLY.

            // Clear URL parameters ONLY AFTER successful authentication state update
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
                console.log('[MCPClient] Cleared auth code and state from URL after successful auth.');
            }
      })
      .catch(err => {
          // Handle errors from the fetch call itself (network) OR errors thrown from .then block
          console.error('Error during backend token exchange fetch:', err);
          const errorMsg = `Token exchange failed: ${err.message}`;
           setAuthState({
             status: 'error',
             error: errorMsg,
             accessToken: null, refreshToken: null, expiresAt: null, scope: null,
           });
           toast.error("Token Exchange Failed", { description: errorMsg }); // Add toast
           // Optional: Clear URL params on error too
           // if (typeof window !== 'undefined') {
           //    window.history.replaceState({}, '', window.location.pathname);
           // }
      })
      .finally(() => {
           // --- REMOVED URL Clearing from here --- 
           // Ensure loading state stops if needed, but URL clear is now conditional
           console.log("[MCPClient] Token exchange fetch flow finished.");
      });
      // --- End Server-Side Token Exchange ---

    } else if (authState.status === 'idle' && !code && !error) {
        console.log('Client page loaded, no OAuth callback detected.');
    }
  }, [searchParams, authState.status, setAuthState]); // Add setAuthState to dependency array

  // Handler for making an example API call to the mcp-worker
  const handleApiCall = useCallback(async () => {
    if (authState.status !== 'authenticated' || !authState.accessToken) {
        setApiError('Not authenticated or access token missing.');
        toast.warning("Authentication Required", { description: "Please authenticate first.", duration: 3000 }); // Add toast
        return;
    }
    if (authState.expiresAt && Date.now() > authState.expiresAt) {
        setApiError('Access token expired. Please re-authenticate or refresh.');
        setAuthState(prev => ({ ...prev, status: 'error', error: 'Access token expired.' }));
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
  }, [authState.status, authState.accessToken, authState.expiresAt, setAuthState]); // Add setAuthState

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
