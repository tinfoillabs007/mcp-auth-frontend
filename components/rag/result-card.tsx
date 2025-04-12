/**
 * @description
 * Component to display a single RAG search result item.
 * Shows similarity score, source information, content snippet, and metadata.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // For metadata

// Define the expected structure of a single search result from the API
interface SearchResult {
    id: string;
    documentId: string | null;
    chunkSequence: number | null;
    similarity: number;
    sourceType: string | null;
    content: string | null; // Decrypted content
    metadata: Record<string, any> | null; // Decrypted metadata
}

interface ResultCardProps {
    result: SearchResult;
}

export function ResultCard({ result }: ResultCardProps) {
    // Format similarity score
    const similarityPercentage = (result.similarity * 100).toFixed(1);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <CardTitle className="text-lg">
                            Source: {result.sourceType || 'N/A'}
                        </CardTitle>
                        <CardDescription>
                            Doc: {result.documentId || 'N/A'} {result.chunkSequence !== null ? `(Chunk ${result.chunkSequence})` : ''}
                        </CardDescription>
                    </div>
                     <Badge variant={result.similarity > 0.8 ? "default" : (result.similarity > 0.6 ? "secondary" : "outline")}>
                        Similarity: {similarityPercentage}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                 {/* Display main content - potentially truncate or use collapsible */}
                 <p className="text-sm whitespace-pre-wrap">
                     {result.content || <span className="text-muted-foreground italic">Content not available or decryption failed.</span>}
                 </p>
            </CardContent>
             {result.metadata && Object.keys(result.metadata).length > 0 && (
                <CardFooter>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="metadata">
                            <AccordionTrigger className="text-sm">View Metadata</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                                    {JSON.stringify(result.metadata, null, 2)}
                                </pre>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardFooter>
            )}
        </Card>
    );
}
