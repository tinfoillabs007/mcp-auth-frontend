'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { fetchMcpApi } from '@/lib/mcp/client'; // Import API helper

export function VaultEditor() {
  const { authState } = useAuth(); // Use context
  const [vaultContent, setVaultContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);

  // Use authState from context
  const isAuthenticated = authState.status === 'authenticated' && !!authState.accessToken;

  // Function to invoke local agent helper
  const handleInvokeHelper = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Authentication Required", { description: "You must be logged in to use the helper." });
      return;
    }

    const task = 'Update vault data';
    const helperApiUrl = `http://localhost:8990/run-task?task=${encodeURIComponent(task)}`;
    console.log(`Invoking helper API: ${helperApiUrl}`)
    toast.info("Invoking local helper...", { description: `Task: ${task}` });

    try {
      const response = await fetch(helperApiUrl, {
        method: 'GET', // Or POST if you prefer sending data in body
        mode: 'cors'   // Important for cross-origin requests from browser to localhost
      });

      // Check if the response is ok (status code 200-299)
      if (!response.ok) {
        // Attempt to parse error message from helper
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Ignore if response is not JSON */ }
        throw new Error(errorMsg);
      }

      // Handle successful response (e.g., show a success message)
      const result = await response.json(); // Assuming helper returns JSON
      console.log("Helper response:", result);
      toast.success("Helper Action Successful", { description: result.message || "Task processed." });
      // Optionally update vault content based on result.vaultData if returned
      if(result.vaultData) {
        setVaultContent(JSON.stringify(result.vaultData, null, 2));
      }

    } catch (error: any) {
      console.error("Error invoking helper:", error);
      toast.error("Helper Invocation Failed", { description: error.message || "Could not connect to local helper or task failed." });
    }

    // --- Old custom URL scheme logic (REMOVE or comment out) ---
    // Construct the custom URL scheme to invoke the local agent helper
    // const helperUrl = `mcp-helper://run?task=${encodeURIComponent('Update vault data')}`;
    // window.location.href = helperUrl;
    // --- End old logic ---

  }, [isAuthenticated]);

  // Fetch existing vault data
  const fetchVaultData = useCallback(async () => {
    if (!isAuthenticated) {
       console.log("Not authenticated, cannot fetch vault data.");
       setIsFetching(false);
       return;
    }
    console.log("Fetching existing vault data...");
    setIsFetching(true);
    try {
        // Use existing /api/data endpoint which includes vaultData
        const response = await fetchMcpApi(authState.accessToken!, '/data');

        if (!response.ok) {
            let errorMessage = 'Unknown error';
            try {
                const errorData = await response.json().catch(() => ({ message: "Failed to parse error" }));
                if (errorData && typeof errorData === 'object' && 'message' in errorData) {
                    errorMessage = (errorData as { message: string }).message;
                }
            } catch (e) { /* Ignore parsing errors */ }
            throw new Error(`Failed to fetch vault data: ${errorMessage}`);
        }
        const data = await response.json();

        // Extract vaultData from the response
        const content = data?.vaultData ? JSON.stringify(data.vaultData, null, 2) : '';
        setVaultContent(content);
        console.log("Fetched vault data.");
        // toast.success("Vault data loaded.");

    } catch (error: any) {
        console.error("Error fetching vault data:", error);
        toast.error("Failed to Load Vault", { description: error.message });
        setVaultContent('');
    } finally {
        setIsFetching(false);
    }
  }, [isAuthenticated, authState.accessToken]); // Dependency on token

  // Fetch data on component mount
  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);


  // Function to save vault data
  const handleSaveVault = useCallback(async () => {
      if (!isAuthenticated) {
         toast.error("Authentication Required", { description: "You must be logged in to save vault data." });
         return;
      }
      if (authState.expiresAt && Date.now() > authState.expiresAt) {
          toast.error("Token Expired", { description: "Your session has expired. Please log in again." });
          // Optionally trigger re-auth or update context status
          return;
      }

      let parsedData;
      try {
          parsedData = JSON.parse(vaultContent || '{}');
      } catch (e) {
          toast.error("Invalid JSON", { description: "Please ensure the vault content is valid JSON." });
          return;
      }

      console.log("Saving vault data...");
      setIsLoading(true);

      try {
          // Call the POST /api/vault endpoint on mcp-worker
          const response = await fetchMcpApi(authState.accessToken!, '/vault', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedData),
          });

          if (!response.ok) {
              let errorMessage = 'Unknown error';
              try {
                 const errorData = await response.json().catch(() => ({ message: "Failed to parse error" }));
                 if (errorData && typeof errorData === 'object' && ('message' in errorData || 'error_description' in errorData)) {
                    errorMessage = (errorData as any).message || (errorData as any).error_description;
                 }
              } catch(e) { /* Ignore */ }
              throw new Error(`Failed to save vault data: ${errorMessage}`);
          }

          console.log("Vault data saved successfully.");
          toast.success("Vault Saved", { description: "Your data has been securely saved." });

      } catch (error: any) {
          console.error("Error saving vault data:", error);
          toast.error("Save Failed", { description: error.message });
      } finally {
          setIsLoading(false);
      }
  }, [vaultContent, isAuthenticated, authState.accessToken, authState.expiresAt]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Vault Editor</CardTitle>
        <CardDescription>Manage your encrypted vault data here. Content must be valid JSON.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         {isFetching ? (
            <p>Loading vault data...</p>
         ) : (
            <Textarea
                placeholder='Enter your vault data as JSON object here... e.g., {"secretKey":"value"}'
                value={vaultContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVaultContent(e.target.value)} // Added type for event
                rows={10}
                disabled={isLoading || !isAuthenticated} // Disable if loading or not authenticated
            />
         )}
        <div className="flex gap-2">
          <Button onClick={handleSaveVault} disabled={isLoading || isFetching || !isAuthenticated}>
            {isLoading ? "Saving..." : "Save Vault Data"}
          </Button>
          <Button onClick={handleInvokeHelper} disabled={!isAuthenticated} variant="outline">
            Use Helper
          </Button>
        </div>
        {!isAuthenticated && <p className="text-sm text-red-500">Please authenticate via the Dashboard to manage vault data.</p>}
      </CardContent>
    </Card>
  );
}
