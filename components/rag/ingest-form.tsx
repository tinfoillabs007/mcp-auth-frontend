"use client";

import React, { useState } from 'react';
import { DataSource } from '@/app/rag/sources/page'; // Reuse type
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // For selecting source
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from '@/context/auth-context'; // <-- Import useAuth

interface IngestFormProps {
    sources: DataSource[]; // List of available sources to associate content with
    onSuccess: (response: any) => void; // Callback on successful ingestion
}

export function IngestForm({ sources, onSuccess }: IngestFormProps) {
    const { authState } = useAuth(); // <-- Use the hook
    const userId = authState.supabaseUserId; // <-- Get userId from context

    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [documentId, setDocumentId] = useState<string>(''); // e.g., filename, URL, unique ID
    const [content, setContent] = useState<string>('');
    const [metadataString, setMetadataString] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Check for userId first
        if (!userId) {
             setError("User is not authenticated or user ID is missing.");
             return;
        }

        setIsLoading(true);
        setError(null);

        // --- Validation ---
        if (!selectedSourceId) {
            setError("Please select a data source.");
            setIsLoading(false);
            return;
        }
        if (!documentId.trim()) {
             setError("Please provide a Document ID (e.g., filename, title).");
            setIsLoading(false);
            return;
        }
         if (!content.trim()) {
            setError("Content cannot be empty.");
            setIsLoading(false);
            return;
        }

        let metadataObject: Record<string, any> | null = null;
        if (metadataString.trim()) {
            try {
                metadataObject = JSON.parse(metadataString);
                if (typeof metadataObject !== 'object' || metadataObject === null || Array.isArray(metadataObject)) {
                    throw new Error("Metadata must be a valid JSON object.");
                }
            } catch (parseError) {
                setError("Invalid JSON format for metadata.");
                setIsLoading(false);
                return;
            }
        }

        // --- API Call ---
        try {
            console.log("Submitting ingestion request:", { userId: userId, sourceId: selectedSourceId, documentId, content: '...', accountType: 'manual', metadata: metadataObject });
            const response = await fetch('/api/rag/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                     'X-User-ID': userId // <-- Add User ID header
                 },
                body: JSON.stringify({
                    sourceId: selectedSourceId,
                    documentId: documentId.trim(),
                    content: content.trim(),
                    accountType: 'manual',
                    metadata: metadataObject
                }),
            });

             const responseData = await response.json().catch(() => ({}));

            if (!response.ok || response.status !== 201) {
                 console.error("Ingestion API Error Response:", responseData);
                throw new Error(responseData.message || `Ingestion failed. Status: ${response.status}`);
            }

            console.log("Ingestion successful:", responseData);
            // Clear form on success?
            setDocumentId('');
            setContent('');
            setMetadataString('');
            // Keep source selected? Maybe not.
            // setSelectedSourceId('');

            onSuccess(responseData); // Notify parent component

        } catch (err: any) {
            console.error("Error submitting ingestion form:", err);
            setError(err.message || "An unknown error occurred during ingestion.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                 <Alert variant="destructive">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Ingestion Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Source Selection */}
            <div className="space-y-2">
                 <Label htmlFor="sourceSelect">Associate with Data Source *</Label>
                 <Select
                    value={selectedSourceId}
                    onValueChange={setSelectedSourceId}
                    required
                    disabled={isLoading || sources.length === 0}
                 >
                    <SelectTrigger id="sourceSelect">
                        <SelectValue placeholder={sources.length === 0 ? "No sources available" : "Select a source..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {sources.map(source => (
                            <SelectItem key={source.id} value={source.id}>
                                {source.sourceType}: {source.sourceIdentifier || `(ID: ${source.id.substring(0, 6)}...)`}
                            </SelectItem>
                        ))}
                        {sources.length === 0 && <SelectItem value="-" disabled>Create a source first</SelectItem>}
                    </SelectContent>
                </Select>
                 <p className="text-sm text-muted-foreground">
                    Link this content to an existing data source.
                </p>
            </div>

             {/* Document ID */}
             <div className="space-y-2">
                 <Label htmlFor="documentId">Document ID *</Label>
                 <Input
                    id="documentId"
                    value={documentId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentId(e.target.value)}
                    placeholder="Unique identifier for this document (e.g., filename, article title)"
                    required
                    disabled={isLoading}
                />
                 <p className="text-sm text-muted-foreground">
                    Used to group related chunks together.
                </p>
            </div>

            {/* Content Input */}
             <div className="space-y-2">
                 <Label htmlFor="content">Content *</Label>
                 <Textarea
                    id="content"
                    value={content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                    placeholder="Paste the text content you want to ingest here..."
                    rows={10}
                    required
                    disabled={isLoading}
                />
                 <p className="text-sm text-muted-foreground">
                    The main text that will be chunked and embedded.
                </p>
            </div>

            {/* Metadata Input */}
             <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON object)</Label>
                <Textarea
                    id="metadata"
                    value={metadataString}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMetadataString(e.target.value)}
                    placeholder='Optional: e.g., { "url": "...", "author": "...", "tags": ["tag1"] }'
                    rows={4}
                    disabled={isLoading}
                    className="font-mono text-sm"
                />
                 <p className="text-sm text-muted-foreground">
                    Additional structured data associated with this content. Must be valid JSON.
                </p>
            </div>

             {/* Submit Button */}
             <div className="flex justify-end pt-4">
                 <Button type="submit" disabled={isLoading || !userId || !selectedSourceId || !documentId || !content}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Ingest Content
                </Button>
            </div>
        </form>
    );
}
