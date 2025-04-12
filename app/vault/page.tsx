"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { VaultDisplay } from "@/components/vault/vault-display";
import { Separator } from "@/components/ui/separator";
import { ReloadIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { useAuth } from '@/context/auth-context';

export default function VaultPage() {
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [vaultData, setVaultData] = useState<object | null>(null);
  const { authState } = useAuth();
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
    if (!authState.supabaseUserId) {
      toast.error("Authentication Error", {
        description: "User ID not found. Please log in again.",
      });
      return;
    }
    setIsUpdating(true);
    let agentResultData: any = null;

    try {
      const taskName = "Update vault data";
      const agentResponse = await fetch(`${localAgentUrl}/run-task?task=${encodeURIComponent(taskName)}`);
      const agentResult = await agentResponse.json();

      if (!agentResponse.ok || !agentResult.success) {
        throw new Error(agentResult.error || `Agent HTTP error! status: ${agentResponse.status}`);
      }

      toast.success("Agent Task Successful", {
        description: agentResult.message || "Local agent task completed.",
      });
      agentResultData = agentResult.updatedVaultData || {};
      setVaultData(agentResultData);
      console.log("Agent task run, response:", agentResult);

    } catch (err: any) {
      console.error("Failed to run agent task:", err);
      toast.error("Agent Task Failed", {
        description: err.message || "Could not run the local agent.",
      });
      setIsUpdating(false);
      return;
    } finally {
      setIsUpdating(false);
    }

    console.log("[VaultPage] Data received from local agent (/run-task):", JSON.stringify(agentResultData, null, 2));

    if (agentResultData) {
        setIsIngesting(true);
        try {
            console.log(`[VaultPage] Attempting to ingest data for user: ${authState.supabaseUserId}`);
            const ingestResponse = await fetch('/api/rag/ingest/vault-helper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': authState.supabaseUserId
                },
                body: JSON.stringify({
                    sourceType: "vault-agent-run",
                    ...agentResultData
                })
            });

            const ingestResult = await ingestResponse.json();

            if (!ingestResponse.ok || !ingestResult.success) {
                throw new Error(ingestResult.message || ingestResult.error || `Ingest API HTTP error! status: ${ingestResponse.status}`);
            }

            toast.success("Data Ingestion Sent", {
                description: "Data successfully sent to the RAG service for ingestion.",
            });
            console.log("Ingestion API successful:", ingestResult);

        } catch (err: any) {
            console.error("Failed to ingest vault data via API:", err);
            toast.error("Data Ingestion Failed", {
                description: err.message || "Could not send data to the RAG service.",
            });
        } finally {
            setIsIngesting(false);
        }
    } else {
         console.warn("[VaultPage] No data returned from agent or data was empty, skipping ingestion.");
         toast.info("No New Data Found", {
             description: "The agent ran but didn't return new data to ingest.",
         });
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

  const isBusy = isLoadingVault || isUpdating || isClearing || isIngesting;

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-semibold">Vault Data</h1>
         <Button
           variant="outline"
           size="icon"
           onClick={fetchVaultData}
           disabled={isBusy}
           title="Refresh Vault Data"
          >
           <ReloadIcon className={`h-4 w-4 ${isLoadingVault ? 'animate-spin' : ''}`} />
         </Button>
      </div>
      <p className="text-muted-foreground">
        View your current vault data or trigger the agent to update it and ingest into RAG.
      </p>

      <Button
          onClick={handleRunAgent}
          disabled={isBusy}
          className="w-full md:w-auto"
        >
          {isUpdating ? "Running Agent..." : isIngesting ? "Ingesting Data..." : "Get & Ingest My Data"}
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
          disabled={isBusy}
        >
          {isClearing ? "Clearing..." : "Clear Vault Data"}
        </Button>
      </div>
    </section>
  );
}