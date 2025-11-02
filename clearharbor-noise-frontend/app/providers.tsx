"use client";

import { type ReactNode } from "react";
import { FhevmProvider } from "@/fhevm/useFhevm";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FhevmProvider>
      {children}
    </FhevmProvider>
  );
}

