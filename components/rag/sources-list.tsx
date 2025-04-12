"use client";

import React from 'react';
import { DataSource } from '@/app/rag/sources/page'; // Import type from parent
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting
import { TrashIcon, Pencil1Icon, ReloadIcon } from "@radix-ui/react-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SourcesListProps {
    sources: DataSource[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void; // Function to trigger a refresh from parent
}

export function SourcesList({ sources, isLoading, error, onRefresh }: SourcesListProps) {

    const handleToggleEnable = async (sourceId: string, currentEnabledStatus: boolean) => {
        console.log(`Toggling enable status for source ${sourceId} to ${!currentEnabledStatus}`);
        
        try {
            // Get authentication token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            if (!token) {
                throw new Error("No authentication token available. Please log in again.");
            }

            const response = await fetch(`/api/rag/sources/${sourceId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Add auth token
                },
                body: JSON.stringify({ enabled: !currentEnabledStatus }),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `Failed to update source status. Status: ${response.status}`);
            }

            toast.success(`Source ${!currentEnabledStatus ? 'enabled' : 'disabled'}.`);
            onRefresh();

        } catch (err: any) {
            console.error(`Failed to toggle enable for source ${sourceId}:`, err);
            toast.error("Update failed", { description: err.message });
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
         console.log(`Attempting to delete source ${sourceId}`);
         try {
            // Get authentication token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            if (!token) {
                throw new Error("No authentication token available. Please log in again.");
            }

            const response = await fetch(`/api/rag/sources/${sourceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}` // Add auth token
                }
            });

             if (!response.ok && response.status !== 204) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `Failed to delete source. Status: ${response.status}`);
             }

            toast.success("Source deleted successfully.");
            onRefresh();

        } catch (err: any) {
            console.error(`Failed to delete source ${sourceId}:`, err);
            toast.error("Deletion failed", { description: err.message });
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            // Format nicely, e.g., "about 5 hours ago" or full date if older
            const date = new Date(dateString);
            const now = new Date();
            // If more than ~3 days ago, show full date, otherwise relative
            if (now.getTime() - date.getTime() > 3 * 24 * 60 * 60 * 1000) {
                return date.toLocaleDateString();
            }
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return 'Invalid Date';
        }
    };

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Data Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border-b last:border-b-0">
                             <div className="flex items-center gap-4">
                                 <Skeleton className="h-8 w-24" />
                                 <Skeleton className="h-4 w-40" />
                             </div>
                              <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className='text-destructive'>Error Loading Sources</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-destructive space-y-4">
                     <p>{error}</p>
                      <Button variant="destructive" onClick={onRefresh}>
                        <ReloadIcon className="mr-2 h-4 w-4" /> Retry
                      </Button>
                </CardContent>
            </Card>
        );
    }

    if (sources.length === 0) {
        return (
             <Card>
                 <CardHeader>
                    <CardTitle>Data Sources</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground py-8">
                    No data sources found. Click "Add New Source" to get started.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead>Identifier</TableHead>
                             <TableHead className="w-[100px] text-center">Enabled</TableHead>
                             <TableHead className="w-[180px]">Last Synced</TableHead>
                            <TableHead className="w-[180px]">Created</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sources.map((source) => (
                            <TableRow key={source.id}>
                                <TableCell>
                                    <Badge variant="secondary">{source.sourceType || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell className="font-medium truncate max-w-xs">
                                    {source.sourceIdentifier || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                     <Switch
                                        checked={source.enabled}
                                        onCheckedChange={() => handleToggleEnable(source.id, source.enabled)}
                                        aria-label={source.enabled ? 'Disable Source' : 'Enable Source'}
                                        id={`switch-${source.id}`}
                                    />
                                </TableCell>
                                 <TableCell>{formatDate(source.lastSyncedAt)}</TableCell>
                                <TableCell>{formatDate(source.createdAt)}</TableCell>
                                <TableCell className="text-right">
                                    {/* Edit Button (Placeholder) */}
                                     <Button variant="ghost" size="icon" disabled title="Edit (coming soon)">
                                        <Pencil1Icon className="h-4 w-4" />
                                    </Button>
                                     {/* Delete Button with Confirmation */}
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" title="Delete Source">
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the data source
                                                and all associated document chunks and embeddings.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDeleteSource(source.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete Source
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
