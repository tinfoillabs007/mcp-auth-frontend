import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../utils/supabase-admin'; // Keep for find/create user
import { AUTH_WORKER_URL } from '@/lib/constants'; // Import worker URL

interface LinkRequestBody {
    hankoUserId?: string;
    hankoEmail?: string;
    currentSupabaseUserId?: string;
}

// Define structure of a successful Introspection response from auth-worker
interface IntrospectionResponse {
    active: boolean;
    scope?: string;
    client_id?: string;
    sub?: string; // Subject (user identifier used by auth-worker, likely hankoUserId)
    exp?: number;
    iat?: number;
    token_type?: string;
    // --- Crucially includes props embedded in the token ---
    email?: string;
    hankoUserId?: string; // Should match sub
    name?: string;
    // ... any other props you added ...
}

export async function POST(req: NextRequest) {
    console.log("[link-supabase] Received POST request.");
    let requestingUser: any = null; // <-- Declare outside try block
    let introspectionData: IntrospectionResponse; // <-- Declare outside try block

    try {
        // 1. Get the token from the header
        const token = req.headers.get('authorization')?.replace('Bearer ', '') || null;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized', message: 'No token provided for linking.' }, { status: 401 });
        }

        // 2. Call the Auth Worker's Introspection Endpoint
        const introspectionUrl = `${AUTH_WORKER_URL}/introspect`;
        const introspectParams = new URLSearchParams();
        introspectParams.append('token', token);
        // Optional: Add client credentials if your introspection endpoint requires them (unlikely for public client flow)
        // introspectParams.append('client_id', 'YOUR_MCP_AUTH_CLIENT_ID'); 
        
        console.log(`[link-supabase] Calling introspection endpoint: ${introspectionUrl}`);
        try { // <-- Inner try for introspection fetch
            const introspectResponse = await fetch(introspectionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: introspectParams.toString(),
                cache: 'no-store',
            });
            
            introspectionData = await introspectResponse.json();
            
            if (!introspectResponse.ok || !introspectionData.active) {
                 console.error("[link-supabase] Token introspection failed or token inactive:", introspectionData);
                 const message = introspectionData?.active === false ? 'Token is inactive or invalid.' : 'Token introspection failed.';
                 return NextResponse.json({ error: 'Unauthorized', message: message }, { status: 401 });
            }
            console.log("[link-supabase] Token introspection successful:", introspectionData);

            // ---> Assign requestingUser from introspection data if successful <---
            // Use the 'sub' (subject) from introspection, assuming it's the unique ID used by Supabase admin
            // Or adapt if your introspection returns the Supabase User ID directly
            const introspectedSub = introspectionData.sub; // Or another relevant field
            if (!introspectedSub) {
                 console.error("[link-supabase] Subject (sub) missing from introspection response.");
                 return NextResponse.json({ error: 'linking_error', message: 'Could not verify token subject.' }, { status: 500 });
            }
            // We don't have the full Supabase user object here, just the ID (sub) verified by introspection
            // Let's use the 'sub' as the effective user ID confirmed by the token.
            requestingUser = { id: introspectedSub }; // Simulate user object with just ID
            console.log(`[link-supabase] Linking request validated for subject: ${requestingUser.id}`);

        } catch (introspectionError: any) {
             console.error("[link-supabase] Error calling introspection endpoint:", introspectionError);
             return NextResponse.json({ error: 'server_error', message: 'Failed to validate token with authorization server.' }, { status: 502 }); // Bad Gateway
        }

        // 3. Parse original request body to get email and hankoId sent by client
        const body: LinkRequestBody = await req.json();
        const { hankoUserId: hankoIdFromBody, hankoEmail: emailFromBody, currentSupabaseUserId } = body;

        if (!hankoIdFromBody || !emailFromBody) {
            return NextResponse.json({ error: 'Bad Request', message: 'Missing Hanko user ID or email in request body.' }, { status: 400 });
        }

        // 4. Extract validated Hanko ID from Introspection & Cross-Reference
        // Use introspectionData.sub (subject) or introspectionData.hankoUserId if you added it to props
        const validatedHankoId = introspectionData.hankoUserId || introspectionData.sub;
        if (!validatedHankoId) {
             console.error("[link-supabase] Hanko User ID missing from introspection response props/sub.");
             return NextResponse.json({ error: 'linking_error', message: 'Could not retrieve user identifier from token.' }, { status: 500 });
        }
        // Security check: Ensure the Hanko ID from the validated token matches the one sent in the body
        if (validatedHankoId !== hankoIdFromBody) {
            console.error(`[link-supabase] SECURITY ALERT: Hanko ID mismatch! Token sub/prop=${validatedHankoId}, Body=${hankoIdFromBody}`);
            return NextResponse.json({ error: 'Mismatch Error', message: 'User identifier mismatch during linking.' }, { status: 400 });
        }

        // ---> Use email from the REQUEST BODY for linking <--- 
        const emailToLink = emailFromBody; 
        console.log(`[link-supabase] Proceeding to link/find Supabase user for email: ${emailToLink} (Hanko ID: ${validatedHankoId})`);

        // 5. Find or Create Supabase User (using emailToLink)
        let finalSupabaseUserId: string | undefined = currentSupabaseUserId;
        let userAlreadyExisted = false;
        
        if (!finalSupabaseUserId) {
            try {
                console.log(`[link-supabase] Attempting create for: ${emailToLink}`);
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: emailToLink,
                    email_confirm: true,
                    app_metadata: { hanko_id: validatedHankoId }
                });

                // Log the result explicitly, even if there's an error object
                console.log('[link-supabase] createUser response:', { data: newUser, error: createError });

                if (createError) {
                    if (createError.status === 422 || /already registered|duplicate key/i.test(createError.message)) {
                        console.log(`[link-supabase] User with email ${emailToLink} already exists.`);
                        userAlreadyExisted = true;
                    } else {
                        // Rethrow *other* unexpected creation errors
                        console.error("[link-supabase] createUser threw an unexpected error:", createError);
                        throw createError; 
                    }
                } else if (newUser?.user?.id) { // Success case
                    finalSupabaseUserId = newUser.user.id;
                    console.log(`[link-supabase] Created new Supabase user: ${finalSupabaseUserId}`);
                } else {
                    // Handle unexpected success response without user data
                     console.error("[link-supabase] createUser succeeded but returned no user data.");
                     throw new Error("User creation succeeded but no user data returned.");
                }
            } catch (supabaseError: any) {
                 // Log the caught error more clearly
                 console.error("[link-supabase] EXCEPTION during Supabase user creation:", supabaseError);
                 // Log the error name and message
                 console.error(`[link-supabase] Error Name: ${supabaseError.name}, Message: ${supabaseError.message}`);
                 // Optionally log the stack trace if helpful
                 // console.error(supabaseError.stack);

                 return NextResponse.json({ 
                     error: 'supabase_user_error', 
                     message: `Could not process Supabase user: ${supabaseError.message || 'Unknown creation error'}` 
                 }, { status: 500 });
            }

            if (userAlreadyExisted) {
                 try {
                    console.log(`[link-supabase] Fetching existing ID for: ${emailToLink}`);
                    // ... list/find logic using emailToLink ...
                    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
                    if (listError) throw listError;
                    const existingUser = usersList?.users.find(u => u.email === emailToLink);
                    if (existingUser) {
                        finalSupabaseUserId = existingUser.id;
                        console.log(`[link-supabase] Found existing Supabase user ID: ${finalSupabaseUserId}`);
                        await supabaseAdmin.auth.admin.updateUserById(finalSupabaseUserId, { app_metadata: { hanko_id: validatedHankoId } });
                    } else { throw new Error(`Failed to find existing user ${emailToLink} after duplicate error.`); }
                } catch(findError: any) { /* ... return 500 ... */ }
            }
        } else {
             console.log(`[link-supabase] Using provided Supabase User ID: ${finalSupabaseUserId}`);
             await supabaseAdmin.auth.admin.updateUserById(finalSupabaseUserId, { app_metadata: { hanko_id: validatedHankoId } });
        }

        // 6. Verify ID exists
        if (!finalSupabaseUserId) { 
            console.error("[link-supabase] Failed to determine final Supabase User ID.");
            return NextResponse.json({ error: 'Internal Server Error', message: 'Could not determine Supabase User ID.' }, { status: 500 });
         }
        
        // 7. REMOVE Security Check comparing token sub and Supabase ID
        /* 
        if(validatedTokenSubjectId !== finalSupabaseUserId) { 
            console.error(`[link-supabase] SECURITY ALERT: Token subject ID (${validatedTokenSubjectId}) does not match linked Supabase user ID (${finalSupabaseUserId}) for email ${emailToLink}.`);
             return NextResponse.json({ error: 'Mismatch Error', message: 'User identifier mismatch during linking.' }, { status: 400 });
        }
        */

        // 8. Return Success
        console.log(`[link-supabase] Linking successful. Supabase User ID: ${finalSupabaseUserId}`);
        return NextResponse.json({ success: true, supabaseUserId: finalSupabaseUserId });

    } catch (error: any) {
        console.error('[link-supabase] Unhandled Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
