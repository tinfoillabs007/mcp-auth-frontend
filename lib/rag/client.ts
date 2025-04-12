/**
 * @description
 * Utility function for making authenticated requests from the mcp-auth backend
 * (e.g., Next.js API routes) to the separate RAG service backend.
 * Handles URL construction, adding the internal API key header, and basic response processing.
 *
 * @dependencies
 * - Node.js 'fetch': For making HTTP requests. (Available globally in Node.js/Next.js)
 *
 * @notes
 * - Reads RAG_SERVICE_URL and RAG_SERVICE_API_KEY from environment variables.
 * - RAG_SERVICE_API_KEY MUST be configured as a server-side environment variable (not prefixed with NEXT_PUBLIC_).
 * - This function should ONLY be called from server-side code (e.g., API routes)
 *   to avoid exposing the RAG_SERVICE_API_KEY.
 * - Throws an error if critical environment variables are missing or if the fetch fails.
 */

// Type definition for the fetch options
interface FetchOptions extends RequestInit {
    // Add any specific custom options if needed later
}

// Type definition for the expected response structure (can be refined)
interface RagServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    // Add other potential fields from RAG service responses
}

// Retrieve environment variables
// NEXT_PUBLIC_RAG_SERVICE_URL is accessible on both client and server
const ragServiceUrl = process.env.NEXT_PUBLIC_RAG_SERVICE_URL;
// RAG_SERVICE_API_KEY should ONLY be available on the server
const ragServiceApiKey = process.env.RAG_SERVICE_API_KEY;

/**
 * Sends an authenticated request to the RAG service backend.
 * Intended for use only in server-side code (Next.js API routes).
 *
 * @param {string} endpoint - The specific API endpoint path (e.g., '/sources', '/ingest'). Should start with '/'.
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
 * @param {Record<string, any> | null} [body=null] - The request body object for POST/PUT requests.
 * @returns {Promise<T>} A promise that resolves to the parsed JSON response data from the RAG service.
 * @throws {Error} If environment variables are missing, fetch fails, or RAG service returns an error response.
 */
export async function fetchRagService<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', // Enforce valid methods
    body: Record<string, any> | null = null
): Promise<T> {

    // --- Environment Variable Checks ---
    if (!ragServiceUrl) {
        console.error("fetchRagService Error: NEXT_PUBLIC_RAG_SERVICE_URL environment variable is not set.");
        throw new Error("RAG service URL is not configured.");
    }
    if (!ragServiceApiKey) {
        // This check prevents accidental client-side calls and ensures server config is correct
        console.error("fetchRagService Error: RAG_SERVICE_API_KEY environment variable is not set on the server.");
        throw new Error("RAG service API key is not configured.");
    }

    // --- Construct Request ---
    // Start with base URL and endpoint
    let url = `${ragServiceUrl}/api/v1${endpoint}`;
    let finalBody = body; // Use this for POST/PUT/PATCH

    // ---> Check if method is GET/DELETE and userId exists in body <--- 
    if (body && body.userId && (method === 'GET' || method === 'DELETE')) {
        console.log(`[fetchRagService] Moving userId from body to query param for ${method} request.`);
        // Append userId as query parameter
        const separator = url.includes('?') ? '&' : '?'; 
        url = `${url}${separator}userId=${encodeURIComponent(body.userId)}`;
        // Ensure body is NOT sent for GET/DELETE
        finalBody = null; 
    }

    const headers: Record<string, string> = {
        'X-Internal-API-Key': ragServiceApiKey,
    };

    const options: FetchOptions = {
        method: method,
        headers: headers,
    };

    // Only add body for methods that typically support it, using finalBody
    if (finalBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) { 
        headers['Content-Type'] = 'application/json'; 
        options.body = JSON.stringify(finalBody);
        console.log(`[fetchRagService] Added body for ${method} request.`); 
    } else if (finalBody) {
         // This case should ideally not happen now if GET/DELETE nullified finalBody
         console.warn(`[fetchRagService] Non-null body ignored for ${method} request.`);
    } else {
         console.log(`[fetchRagService] No body added for ${method} request.`);
    }

    // --- Make Request ---
    const finalUrl = url; // Capture the URL right before fetch
    const finalOptions = options; // Capture options right before fetch
    console.log(`[fetchRagService] FINAL Check before fetch: URL=${finalUrl}, Options=${JSON.stringify(finalOptions)}`); 
    try {
        const response = await fetch(finalUrl, finalOptions);

        // --- Handle Response ---
        if (!response.ok) {
            // Attempt to parse error details from the RAG service response body
            let errorData: { error?: string; message?: string } = {};
            try {
                errorData = await response.json() as { error?: string; message?: string };
            } catch (parseError) {
                // Ignore parse error if body is not JSON or empty
                console.warn(`[fetchRagService] Failed to parse error response body for ${method} ${url} (Status: ${response.status})`);
            }
            const errorMessage = errorData?.message || errorData?.error || response.statusText || `HTTP error! Status: ${response.status}`;
            console.error(`[fetchRagService] Error response from ${method} ${url}: ${response.status} - ${errorMessage}`, errorData);
            throw new Error(`RAG Service Error (${response.status}): ${errorMessage}`);
        }

        // Handle successful responses (including 204 No Content)
        if (response.status === 204) {
            console.log(`[fetchRagService] Success (204 No Content): ${method} ${url}`);
            // For 204, there's no body to parse, return something meaningful if needed, like null or success status
            return null as T; // Or adjust based on expected return type for DELETE etc.
        }

        // Attempt to parse successful JSON response
        try {
            const responseData = await response.json();
            console.log(`[fetchRagService] Success: ${method} ${url}`);
            return responseData as T;
        } catch (jsonError) {
             console.error(`[fetchRagService] Failed to parse successful JSON response from ${method} ${url}:`, jsonError);
            throw new Error("Failed to parse successful response from RAG service.");
        }

    } catch (error: any) {
        // Handle network errors or errors thrown during response processing
        console.error(`[fetchRagService] Fetch failed for ${method} ${url}:`, error);
        // Re-throw a generic error or the specific error if needed
        throw new Error(`Failed to fetch from RAG service: ${error.message || 'Network error'}`);
    }
}
