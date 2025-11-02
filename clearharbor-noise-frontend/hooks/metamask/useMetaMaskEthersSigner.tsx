"use client";

import { useMemo } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Eip1193Provider } from "ethers";

export function useMetaMaskEthersSigner(provider: Eip1193Provider | null, account: string | null) {
  const signer = useMemo(() => {
    if (!provider || !account) return null;

    try {
      const ethersProvider = new BrowserProvider(provider);
      return ethersProvider.getSigner(account);
    } catch (error) {
      console.error("Failed to create signer:", error);
      return null;
    }
  }, [provider, account]);

  return signer;
}

export type { JsonRpcSigner };

