"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from "@/components/ui/button";
import { SourcesList } from "@/components/rag/sources-list"; // Will create this next
import { AddSourceDialog } from "@/components/rag/add-source-dialog"; // Will create this next
import { toast } from "sonner"; // Assuming sonner is used for toasts
import { PlusCircledIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

// Define a basic type for the source data - align with API response
// Add more specific types for metadata if possible
export interface DataSource {
    id: string;
    userId: string;
    sourceType: string;
    sourceIdentifier: string | null;
    metadata: Record<string, any> | null;
    enabled: boolean;
    lastSyncedAt: string | null; // Assuming string from API for now
    createdAt: string;
}

export default function SourcesPage() {
    const { authState } = useAuth();
    const userId = authState.supabaseUserId;
    const accessToken = authState.accessToken;

    const [sources, setSources] = useState<DataSource[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);

    const fetchSources = useCallback(async () => {
        if (authState.status !== 'authenticated' || !accessToken || !userId) {
            const msg = `User not fully authenticated or details missing (Status: ${authState.status}, Token: ${accessToken ? 'OK' : 'Missing'}, SupabaseID: ${userId ? 'OK' : 'Missing'}). Cannot fetch sources.`;
            console.warn(msg);
            if (authState.status === 'error' || authState.status === 'idle') {
                setError("User is not properly authenticated. Please log in again.");
            } else {
                setError("Waiting for authentication details...");
            }
            setIsLoading(false);
            setSources([]);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        console.log(`Fetching sources for user ${userId} (using context)...`);

        try {
            const response = await fetch('/api/rag/sources', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-User-ID': userId
                }
            });
            
            console.log("Fetch response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Fetch error data:", errorData);
                throw new Error(errorData.message || `Failed to fetch sources (Status: ${response.status}).`);
            }

            const data: DataSource[] = await response.json();
            console.log("Fetched sources:", data);
            setSources(data);
        } catch (err: any) {
            console.error("Error fetching sources:", err);
            setError(err.message || "An unknown error occurred while fetching sources.");
            toast.error("Failed to fetch sources", { description: err.message });
            setSources([]);
        } finally {
            setIsLoading(false);
        }
    }, [authState.status, authState.accessToken, authState.supabaseUserId]);

    useEffect(() => {
        console.log(`SourcesPage useEffect triggered. Auth Status: ${authState.status}, SupabaseUserID: ${authState.supabaseUserId}`);
        if (authState.status === 'authenticated' && authState.supabaseUserId) {
            fetchSources();
        } else if (authState.status === 'idle' || authState.status === 'error') {
            setError("User not authenticated.");
            setIsLoading(false);
            setSources([]);
        }
    }, [authState.status, authState.supabaseUserId, fetchSources]);

    const handleAddSuccess = () => {
        setIsAddDialogOpen(false);
        fetchSources();
        toast.success("Data source added successfully!");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                 <h2 className="text-2xl font-semibold">Manage Data Sources</h2>
                 <div className='flex items-center gap-2'>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchSources}
                        disabled={isLoading || authState.status !== 'authenticated'}
                        title="Refresh Sources"
                    >
                        <ReloadIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                     <Button 
                        onClick={() => setIsAddDialogOpen(true)}
                        disabled={authState.status !== 'authenticated'}
                     >
                        <PlusCircledIcon className="mr-2 h-4 w-4" /> Add New Source
                    </Button>
                 </div>

            </div>
            <p className="text-muted-foreground">
                Connect and manage the sources for your RAG knowledge base. Only enabled sources will be used for ingestion and querying.
            </p>

            {/* Display sources list */}
            <SourcesList sources={sources} isLoading={isLoading} error={error} onRefresh={fetchSources} />

            {/* Add Source Dialog */}
            <AddSourceDialog
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={handleAddSuccess}
            />
        </div>
    );
}
