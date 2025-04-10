/**
 * @description
 * Button component specifically for initiating the OAuth 2.1 Authorization Code flow
 * with PKCE against the configured Authentication Server (`auth-worker`).
 *
 * Key features:
 * - Renders a button using shadcn/ui.
 * - Calls the `redirectToAuthorization` utility function on click.
 *
 * @dependencies
 * - react: Core React library.
 * - @/lib/mcp/client: Provides the `redirectToAuthorization` function.
 * - @/components/ui/button: The shadcn/ui button component.
 *
 * @notes
 * - This component is intended to be used on pages where the user needs to start the OAuth login flow.
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button
import { redirectToAuthorization } from './client'; // Import the function

const MCPAuthButton: React.FC = () => {
  const handleLoginClick = async () => {
    try {
      // No need to construct URL here, redirectToAuthorization handles it
      await redirectToAuthorization();
      // The page will redirect, so no further action needed here
    } catch (error) {
      console.error('MCP Auth Error:', error);
      // Handle error display for the user if needed
    }
  };

  return (
    <Button onClick={handleLoginClick} variant="outline">
      Login with MCP
    </Button>
  );
};

export default MCPAuthButton;
