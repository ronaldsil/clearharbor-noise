"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createFhevmInstance } from "./internal/fhevm";
import type { FhevmInstance, FhevmRelayerStatus } from "./fhevmTypes";
import type { Eip1193Provider } from "ethers";

interface FhevmContextValue {
  fhevmInstance: FhevmInstance | null;
  status: FhevmRelayerStatus;
  error: Error | null;
  createInstance: (provider: Eip1193Provider, mockChains?: Record<number, string>) => Promise<FhevmInstance | null>;
  reset: () => void;
}

const FhevmContext = createContext<FhevmContextValue | null>(null);

export function FhevmProvider({ children }: { children: ReactNode }) {
  const [fhevmInstance, setFhevmInstance] = useState<FhevmInstance | null>(null);
  const [status, setStatus] = useState<FhevmRelayerStatus>("sdk-loading");
  const [error, setError] = useState<Error | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const createInstance = useCallback(
    async (provider: Eip1193Provider, mockChains?: Record<number, string>) => {
      // Cancel previous instance creation if in progress
      if (abortController) {
        abortController.abort();
      }

      const controller = new AbortController();
      setAbortController(controller);
      setError(null);
      setStatus("sdk-loading");

      try {
        const instance = await createFhevmInstance({
          provider,
          mockChains,
          signal: controller.signal,
          onStatusChange: (newStatus) => {
            setStatus(newStatus);
          },
        });

        if (!controller.signal.aborted) {
          setFhevmInstance(instance);
          setStatus("ready");
          return instance;
        }
        return null;
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to create FHEVM instance:", err);
          setError(err as Error);
          setStatus("sdk-loading");
        }
        return null;
      }
    },
    [abortController]
  );

  const reset = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setFhevmInstance(null);
    setStatus("sdk-loading");
    setError(null);
  }, [abortController]);

  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  return (
    <FhevmContext.Provider
      value={{
        fhevmInstance,
        status,
        error,
        createInstance,
        reset,
      }}
    >
      {children}
    </FhevmContext.Provider>
  );
}

export function useFhevm(): FhevmContextValue {
  const context = useContext(FhevmContext);
  if (!context) {
    throw new Error("useFhevm must be used within FhevmProvider");
  }
  return context;
}

