"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { DataSource } from '@/app/rag/sources/page'; // Reuse type

// Components for multi-select filter (optional, based on shadcn examples)
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // Assuming you have cn utility

interface SearchFormProps {
    onSearch: (queryText: string, selectedSourceTypes: string[]) => void;
    isLoading: boolean;
    sources: DataSource[]; // For filtering options
}

export function SearchForm({ onSearch, isLoading, sources }: SearchFormProps) {
    const [queryText, setQueryText] = useState('');
    const [selectedSourceTypes, setSelectedSourceTypes] = useState<string[]>([]);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!queryText.trim() || isLoading) return;
        onSearch(queryText, selectedSourceTypes);
    };

    // Create a unique list of source types from the available sources
    const availableSourceTypes = React.useMemo(() => {
        const types = new Set(sources.map(s => s.sourceType));
        return Array.from(types);
    }, [sources]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Query Input */}
            <div className="space-y-2">
                <Label htmlFor="queryText">Search Query</Label>
                <div className="flex gap-2">
                    <Input
                        id="queryText"
                        value={queryText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQueryText(e.target.value)}
                        placeholder="Ask a question about your knowledge base..."
                        required
                        disabled={isLoading}
                        className="flex-grow"
                    />
                    <Button type="submit" disabled={isLoading || !queryText.trim()} className="w-28">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                </div>
            </div>

            {/* Source Type Filter (Multi-select Popover) */}
            <div className="space-y-2">
                <Label>Filter by Source Type (Optional)</Label>
                 <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between"
                        disabled={isLoading || availableSourceTypes.length === 0}
                        >
                        <span className="truncate">
                            {selectedSourceTypes.length === 0
                                ? "Select source types..."
                                : selectedSourceTypes.join(', ')}
                        </span>

                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                        <CommandInput placeholder="Search source types..." />
                        <CommandList>
                            <CommandEmpty>No source types found.</CommandEmpty>
                            <CommandGroup>
                                {availableSourceTypes.map((type) => (
                                <CommandItem
                                    key={type}
                                    value={type}
                                    onSelect={(currentValue) => {
                                        // Toggle selection
                                        setSelectedSourceTypes(prev =>
                                            prev.includes(currentValue)
                                            ? prev.filter(t => t !== currentValue)
                                            : [...prev, currentValue]
                                        );
                                         // Keep popover open for multi-select
                                        // setPopoverOpen(false);
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedSourceTypes.includes(type) ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {type}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
                {/* Display selected types as badges */}
                <div className="space-x-1 space-y-1">
                    {selectedSourceTypes.map(type => (
                         <Badge
                            variant="secondary"
                            key={type}
                            className="cursor-pointer"
                            onClick={() => setSelectedSourceTypes(prev => prev.filter(t => t !== type))}
                         >
                             {type} &times; {/* Simple remove on click */}
                         </Badge>
                    ))}
                </div>
            </div>
        </form>
    );
}
