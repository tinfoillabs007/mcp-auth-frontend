"use client";

import React from 'react';
import { ResultCard } from './result-card'; // Import the single result card
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon, InfoCircledIcon } from "@radix-ui/react-icons";

// Define the type for search results array, using the type from ResultCard
type SearchResult = React.ComponentProps<typeof ResultCard>['result'];

interface SearchResultsProps {
    results: SearchResult[] | null; // Can be null initially
    isLoading: boolean;
    error: string | null;
}

export function SearchResults({ results, isLoading, error }: SearchResultsProps) {

    if (isLoading) {
        return (
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold">Searching...</h3>
                 {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-5 w-1/4" />
                            </div>
                             <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-5/6" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
         return (
            <Alert variant="destructive" className="mt-6">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Search Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!results) {
        // Initial state before any search is performed
        return (
            <div className="text-center text-muted-foreground pt-10">
                 <InfoCircledIcon className="mx-auto h-8 w-8 mb-2" />
                Enter a query above to search your knowledge base.
            </div>
        );
    }

     if (results.length === 0) {
        return (
             <div className="text-center text-muted-foreground pt-10">
                <InfoCircledIcon className="mx-auto h-8 w-8 mb-2" />
                No relevant documents found for your query. Try refining your search or ingesting more content.
            </div>
        );
    }

    // Display results
    return (
        <div className="space-y-4 pt-4">
             <h3 className="text-lg font-semibold">Results ({results.length})</h3>
            {results.map((result) => (
                <ResultCard key={result.id} result={result} />
            ))}
        </div>
    );
}
