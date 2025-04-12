"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Trigger is handled by button on parent page
  DialogFooter, // Added for consistency, though form has buttons
  DialogClose, // Can be used for implicit cancel
} from "@/components/ui/dialog";
import { SourceForm } from './source-form'; // Import the form

interface AddSourceDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSuccess: () => void; // Callback after successful form submission
}

export function AddSourceDialog({ isOpen, onOpenChange, onSuccess }: AddSourceDialogProps) {

    const handleCancel = () => {
        onOpenChange(false); // Close the dialog
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {/* <DialogTrigger>Optional Trigger if needed here</DialogTrigger> */}
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Add New Data Source</DialogTitle>
                    <DialogDescription>
                        Configure a new source for ingesting documents into your RAG knowledge base.
                        Fill in the details below.
                    </DialogDescription>
                </DialogHeader>

                {/* Embed the form */}
                <div className="py-4">
                     <SourceForm onSuccess={onSuccess} onCancel={handleCancel} />
                </div>

                 {/* Optional: Footer if form didn't have its own buttons */}
                {/* <DialogFooter> */}
                    {/* <Button type="submit" form="source-form-id">Save changes</Button> */}
                {/* </DialogFooter> */}
            </DialogContent>
        </Dialog>
    );
}
