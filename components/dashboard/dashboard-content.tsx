'use client';

import { MCPClient } from "@/components/mcp/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function DashboardContent() {

  // Placeholder for fetching/displaying Hanko user info if needed later
  // const { user, loading: userLoading } = useUserData(); 

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Area for Hanko User Info (Optional) */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Hanko Session</CardTitle>
          <CardDescription>Your current passkey session status.</CardDescription>
        </CardHeader>
        <CardContent>
          {userLoading ? <p>Loading user...</p> : user ? <HankoProfile /> : <p>Not logged in via Hanko.</p>}
        </CardContent>
      </Card> */}

      {/* Area for MCP OAuth Client Flow */}
      <Card className="md:col-span-2"> { /* Span both columns for now */ }
        <CardHeader>
          <CardTitle>MCP Resource Access</CardTitle>
          <CardDescription>Use OAuth to authorize access to the protected MCP API.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Render the MCPClient component which handles the OAuth flow and API calls */}
          <MCPClient /> 
        </CardContent>
      </Card>

    </div>
  );
} 