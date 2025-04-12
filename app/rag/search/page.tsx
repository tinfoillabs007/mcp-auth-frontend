"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SearchForm } from '@/components/rag/search-form';
import { SearchResults } from '@/components/rag/search-results';
import { DataSource } from '@/app/rag/sources/page'; // Reuse type
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from '@/context/auth-context'; // <-- Import useAuth

// Define SearchResult type (can stay the same)
type SearchResult = React.ComponentProps<typeof SearchResults>['results'] extends (infer U)[] | null ? U : never;

export default function SearchPage() {
    const { authState } = useAuth(); // <-- Use the hook
    const userId = authState.supabaseUserId; // <-- Get userId from context

    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [sources, setSources] = useState<DataSource[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState<boolean>(true);
    const [sourcesError, setSourcesError] = useState<string | null>(null);

    // Fetch sources for the filter dropdown
    const fetchSources = useCallback(async () => {
        if (!userId) {
             setIsLoadingSources(false);
             setSourcesError("User not authenticated.");
             setSources([]);
             return;
        }
        setIsLoadingSources(true);
        setSourcesError(null);
        console.log("Fetching sources for search filter...");
        try {
             const response = await fetch('/api/rag/sources', {
                 headers: {
                     'X-User-ID': userId // <-- Add User ID header
                 }
             });
             if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch sources. Status: ${response.status}`);
            }
            const data: DataSource[] = await response.json();
            setSources(data);
        } catch (err: any) {
            console.error("Error fetching sources for filter:", err);
            setSourcesError(err.message || "Could not load sources for filtering.");
            setSources([]);
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

    // Function to handle the search submission
    const handleSearch = async (queryText: string, selectedSourceTypes: string[]) => {
        if (!userId) {
             setSearchError("User not authenticated or user ID is missing.");
             toast.error("Authentication Error", { description: "Cannot perform search."});
             return;
        }
        setIsSearching(true);
        setSearchError(null);
        setResults(null);
        console.log("Initiating search for:", queryText, "Filters:", selectedSourceTypes);

        try {
             const response = await fetch('/api/rag/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': userId // <-- Add User ID header
                },
                body: JSON.stringify({
                    queryText,
                    sourceTypes: selectedSourceTypes.length > 0 ? selectedSourceTypes : null,
                }),
            });

            const responseData = await response.json().catch(() => ({}));

             if (!response.ok) {
                console.error("Search API Error Response:", responseData);
                throw new Error(responseData.message || `Search failed. Status: ${response.status}`);
            }

            console.log("Search successful, results:", responseData);
            setResults(responseData as SearchResult[]);
            toast.success("Search complete", { description: `${responseData.length} results found.` });

        } catch (err: any) {
             console.error("Error performing search:", err);
             setSearchError(err.message || "An unknown error occurred during search.");
             toast.error("Search failed", { description: err.message });
             setResults([]);
        } finally {
             setIsSearching(false);
        }
    };

    const renderSearchForm = () => {
         if (isLoadingSources) {
             return (
                 <div className='space-y-4'>
                     <Skeleton className="h-8 w-1/4" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-8 w-1/4" />
                     <Skeleton className="h-10 w-full" />
                 </div>
            );
        }
         if (sourcesError) {
             return (
                 <Alert variant="destructive">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Error Loading Filters</AlertTitle>
                    <AlertDescription>{sourcesError}</AlertDescription>
                </Alert>
            );
        }
        return <SearchForm onSearch={handleSearch} isLoading={isSearching} sources={sources} />;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Search Knowledge Base</h2>
             <p className="text-muted-foreground">
                Ask questions or enter keywords to retrieve relevant information from your ingested documents.
            </p>

            {/* Search Form Area */}
            <div className="max-w-3xl"> {/* Limit form width */}
                {renderSearchForm()}
            </div>


             {/* Search Results Area */}
             <div className="mt-8">
                <SearchResults results={results} isLoading={isSearching} error={searchError} />
            </div>
        </div>
    );
}
