/**
 * @description
 * Page component for the OAuth Client route (`/client`).
 * This page acts as the redirect target for the OAuth authorization flow.
 * It renders the `MCPClient` component, which handles extracting the
 * authorization code and state from the URL search parameters and
 * initiates the token exchange process via the backend API route.
 * Uses React Suspense as required when a component uses `useSearchParams`.
 *
 * @dependencies
 * - react: Core React library (Suspense).
 * - next/navigation: Provides useSearchParams hook.
 * - components/mcp/client: The component containing the client logic.
 * - lib/mcp/auth-button: Button to initiate the OAuth flow.
 */

'use client';

import React from 'react';
import { MCPClient } from '@/components/mcp/client';
// MCPAuthButton is now rendered *inside* MCPClient when idle
// import { MCPAuthButton } from '@/lib/mcp/auth-button'; 
// No longer need useSearchParams directly here
// import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react'; // Still need Suspense because MCPClient uses useSearchParams

// Removed useIsHandlingCallback hook

// Loading component shown while checking URL params within MCPClient
function LoadingPlaceholder() {
    return <p>Loading client state...</p>;
}

// Removed ClientPageContent wrapper

export default function ClientPage() {
  // Removed check for isHandlingCallback

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">MCP Client Demo</h1>
      {/* Wrap the component using useSearchParams in Suspense */}
      {/* Always render MCPClient; it will handle showing button or status */}
      <Suspense fallback={<LoadingPlaceholder />}>
        <MCPClient />
      </Suspense>
    </div>
  );
}
