"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // For metadata input
import { Loader2 } from "lucide-react"; // Loading spinner icon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from '@/context/auth-context'; // <-- Import useAuth

interface SourceFormProps {
    onSuccess: () => void; // Callback when source is successfully created
    onCancel: () => void; // Callback to close the dialog/form
}

export function SourceForm({ onSuccess, onCancel }: SourceFormProps) {
    const { authState } = useAuth(); // <-- Use the hook
    const userId = authState.supabaseUserId; // <-- Get userId from context

    const [sourceType, setSourceType] = useState('');
    const [sourceIdentifier, setSourceIdentifier] = useState('');
    const [metadataString, setMetadataString] = useState(''); // Store metadata as JSON string
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Check if userId is available
        if (!userId) {
             setError("User is not authenticated or user ID is missing.");
             return;
        }

        setIsLoading(true);
        setError(null);

        let metadataObject: Record<string, any> | null = null;

        // Validate and parse metadata JSON string
        if (metadataString.trim()) {
            try {
                metadataObject = JSON.parse(metadataString);
                if (typeof metadataObject !== 'object' || metadataObject === null || Array.isArray(metadataObject)) {
                    throw new Error("Metadata must be a valid JSON object (e.g., {\"key\": \"value\"}).");
                }
            } catch (parseError) {
                setError("Invalid JSON format for metadata. Please check syntax.");
                setIsLoading(false);
                return;
            }
        }

        try {
            const response = await fetch('/api/rag/sources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': userId // <-- Add User ID header
                 },
                body: JSON.stringify({
                    sourceType,
                    sourceIdentifier: sourceIdentifier || null, // Send null if empty
                    metadata: metadataObject // Send parsed object or null
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to add source. Status: ${response.status}`);
            }

            onSuccess(); // Notify parent component (e.g., close dialog, refresh list)

        } catch (err: any) {
            console.error("Error adding source:", err);
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                 <Alert variant="destructive">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="space-y-2">
                <Label htmlFor="sourceType">Source Type *</Label>
                <Input
                    id="sourceType"
                    value={sourceType}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSourceType(e.target.value)}
                    placeholder="e.g., manual, twitter, gmail"
                    required
                    disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                    Category of the data source (used for filtering).
                </p>
            </div>
             <div className="space-y-2">
                <Label htmlFor="sourceIdentifier">Source Identifier</Label>
                <Input
                    id="sourceIdentifier"
                    value={sourceIdentifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSourceIdentifier(e.target.value)}
                    placeholder="e.g., filename, @username, email@example.com (optional)"
                    disabled={isLoading}
                />
                 <p className="text-sm text-muted-foreground">
                    Specific handle or name for the source, if applicable.
                </p>
            </div>
             <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON object)</Label>
                <Textarea
                    id="metadata"
                    value={metadataString}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMetadataString(e.target.value)}
                    placeholder='e.g., { "category": "project-alpha", "priority": "high" } (optional)'
                    rows={4}
                    disabled={isLoading}
                    className="font-mono text-sm"
                />
                 <p className="text-sm text-muted-foreground">
                    Store additional structured data (must be valid JSON).
                </p>
            </div>
             <div className="flex justify-end gap-2 pt-4">
                 <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !userId}> {/* Disable if no userId */}
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Add Source
                </Button>
            </div>
        </form>
    );
}
