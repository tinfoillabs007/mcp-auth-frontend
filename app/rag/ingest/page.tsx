"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { IngestForm } from '@/components/rag/ingest-form'; // The form component
import { DataSource } from '@/app/rag/sources/page'; // Reuse type
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from '@/context/auth-context'; // <-- Import useAuth

export default function IngestPage() {
    const { authState } = useAuth(); // <-- Use the hook
    const userId = authState.supabaseUserId; // <-- Get userId from context

    const [sources, setSources] = useState<DataSource[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);
    const [sourcesError, setSourcesError] = useState<string | null>(null);

    const fetchSources = useCallback(async () => {
        if (!userId) {
            // Don't fetch if user ID isn't available yet
            setIsLoadingSources(false);
            setSourcesError("User not authenticated.");
            setSources([]);
            return;
        }
        setIsLoadingSources(true);
        setSourcesError(null);
        console.log("Fetching sources for ingest form...");
        try {
            const response = await fetch('/api/rag/sources', {
                 headers: {
                     'X-User-ID': userId // <-- Add User ID header
                 }
            });
            console.log("Sources fetch status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Sources fetch error data:", errorData);
                throw new Error(errorData.message || `Failed to fetch sources. Status: ${response.status}`);
            }

            const data: DataSource[] = await response.json();
            console.log("Fetched sources for dropdown:", data);
            setSources(data);
        } catch (err: any) {
            console.error("Error fetching sources:", err);
            setSourcesError(err.message || "An unknown error occurred while fetching sources.");
            setSources([]); // Clear sources on error
        } finally {
            setIsLoadingSources(false);
        }
    }, [userId]); // <-- Add userId dependency

     useEffect(() => {
        // Fetch only when authenticated and userId is present
        if (authState.status === 'authenticated' && userId) {
            fetchSources();
        } else if (authState.status !== 'loading') {
             setIsLoadingSources(false);
             setSourcesError("User not authenticated.");
             setSources([]);
        }
     }, [authState.status, userId, fetchSources]); // <-- Add dependencies

     const handleIngestSuccess = (responseData: any) => {
        console.log("Ingestion successful from page:", responseData);
        toast.success("Content Ingested Successfully", {
            description: `${responseData?.chunksCreated ?? 0} chunks created for document ID: ${responseData?.documentId ?? ''}`,
        });
    };

    const renderContent = () => {
        if (isLoadingSources) {
            return (
                <div className='space-y-4'>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-8 w-1/4" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-32 w-full" />
                </div>
            );
        }

        if (sourcesError) {
             return (
                 <Alert variant="destructive">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Error Loading Data Sources</AlertTitle>
                    <AlertDescription>
                        Could not load data sources needed for ingestion. Please try refreshing or ensure sources exist.
                        <br />({sourcesError})
                    </AlertDescription>
                </Alert>
            );
        }

         return <IngestForm sources={sources} onSuccess={handleIngestSuccess} />;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Ingest New Content</h2>
            <p className="text-muted-foreground">
                Manually add text content to your knowledge base. Select the data source to associate it with, provide a unique document ID, and paste the content.
            </p>

            <div className="max-w-2xl"> {/* Limit form width */}
                 {renderContent()}
            </div>
        </div>
    );
}
