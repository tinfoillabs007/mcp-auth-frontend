'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Define props for the component
interface VaultDisplayProps {
  vaultData: object | null; // Accept vault data as an object or null
  isLoading: boolean;
}

export function VaultDisplay({ vaultData, isLoading }: VaultDisplayProps) {
  // Format the vault content from props
  const vaultContent = vaultData ? JSON.stringify(vaultData, null, 2) : '{ "message": "No data loaded or vault is empty." }';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Vault Data</CardTitle>
        <CardDescription>Read-only view of your current vault content.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[220px]" />
          </div>
        ) : (
          <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto">
            <code className="text-white">{vaultContent}</code>
          </pre>
        )}
        {/* Authentication status can be handled in the parent component if needed */}
      </CardContent>
    </Card>
  );
} 