"use client";

import { type ReactNode } from "react";
import { FhevmProvider } from "@/fhevm/useFhevm";

/**
 * Root providers component for the ClearHarbor Noise dApp
 * Wraps the application with FHEVM context provider
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <FhevmProvider>
      {children}
    </FhevmProvider>
  );
}

