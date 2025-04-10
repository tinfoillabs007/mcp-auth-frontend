"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { VaultDisplay } from "@/components/vault/vault-display";
import { Separator } from "@/components/ui/separator";
import { ReloadIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";

export default function VaultPage() {
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [vaultData, setVaultData] = useState<object | null>(null);

  const localAgentUrl = 'http://localhost:8990';

  const fetchVaultData = useCallback(async () => {
    setIsLoadingVault(true);
    try {
      const response = await fetch(`${localAgentUrl}/get-vault`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      setVaultData(result.vaultData || {});
    } catch (err: any) {
      console.error("Failed to fetch vault data:", err);
      toast.error("Failed to fetch vault data", {
        description: err.message || "An unknown error occurred.",
      });
      setVaultData(null);
    } finally {
      setIsLoadingVault(false);
    }
  }, [localAgentUrl]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  const handleRunAgent = async () => {
    setIsUpdating(true);
    try {
      const taskName = "Update vault data";
      const response = await fetch(`${localAgentUrl}/run-task?task=${encodeURIComponent(taskName)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      toast.success("Agent Task Successful", {
        description: result.message || "Agent task completed successfully!",
      });
      setVaultData(result.updatedVaultData || {});
      console.log("Agent task run, response:", result);

    } catch (err: any) {
      console.error("Failed to run agent task:", err);
      toast.error("Agent Task Failed", {
        description: err.message || "An unknown error occurred while running the agent.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearVault = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`${localAgentUrl}/clear-vault`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      toast.success("Vault Cleared", {
        description: result.message || "Vault cleared successfully!",
      });
      setVaultData({});
      console.log("Vault cleared, response:", result);

    } catch (err: any) {
      console.error("Failed to clear vault:", err);
      toast.error("Failed to Clear Vault", {
        description: err.message || "An unknown error occurred while clearing.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-semibold">Vault Data</h1>
         <Button 
           variant="outline" 
           size="icon" 
           onClick={fetchVaultData} 
           disabled={isLoadingVault || isUpdating || isClearing}
           title="Refresh Vault Data"
          >
           <ReloadIcon className={`h-4 w-4 ${isLoadingVault ? 'animate-spin' : ''}`} />
         </Button>
      </div>
      <p className="text-muted-foreground">
        View your current vault data or trigger the agent to update it.
      </p>

      <Button
          onClick={handleRunAgent}
          disabled={isLoadingVault || isUpdating || isClearing}
          className="w-full md:w-auto"
        >
          {isUpdating ? "Getting Data..." : "Get My Data"}
        </Button>

      <Separator className="my-8" />

      <VaultDisplay vaultData={vaultData} isLoading={isLoadingVault} />

      <Separator className="my-8" />
      <div>
        <h2 className="text-lg font-semibold mb-2">Clear Vault</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This will permanently remove all data stored in your vault. This action cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleClearVault}
          disabled={isLoadingVault || isUpdating || isClearing}
        >
          {isClearing ? "Clearing..." : "Clear Vault Data"}
        </Button>
      </div>
    </section>
  );
}