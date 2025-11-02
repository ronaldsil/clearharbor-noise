"use client";

import { useState, useEffect, useCallback } from "react";
import type { Eip1193Provider } from "ethers";
import { storageGet, storageSet, storageRemove, WALLET_KEYS } from "@/fhevm/GenericStringStorage";
import { removeDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

export function useMetaMaskProvider() {
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  // Silent reconnect on mount
  useEffect(() => {
    const isConnected = storageGet(WALLET_KEYS.connected) === "true";
    if (!isConnected) return;

    const lastAccounts = storageGet(WALLET_KEYS.lastAccounts);
    if (!lastAccounts) return;

    // Try silent reconnect with eth_accounts
    if (typeof window !== "undefined" && window.ethereum) {
      const ethereum = window.ethereum as Eip1193Provider;
      
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts && (accounts as string[]).length > 0) {
            setProvider(ethereum);
            setAccount((accounts as string[])[0]);
            setConnected(true);

            // Get chainId
            ethereum.request({ method: "eth_chainId" }).then((chainIdHex) => {
              setChainId(Number.parseInt(chainIdHex as string, 16));
            });
          } else {
            // Failed to reconnect, clear storage
            storageRemove(WALLET_KEYS.connected);
            storageRemove(WALLET_KEYS.lastAccounts);
          }
        })
        .catch(() => {
          storageRemove(WALLET_KEYS.connected);
          storageRemove(WALLET_KEYS.lastAccounts);
        });
    }
  }, []);

  // Connect wallet (user-initiated)
  const connect = useCallback(async (selectedProvider?: Eip1193Provider) => {
    const ethereum = selectedProvider || (window.ethereum as Eip1193Provider);
    if (!ethereum) {
      throw new Error("No Ethereum provider found");
    }

    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const chainIdHex = await ethereum.request({ method: "eth_chainId" }) as string;
      const chainIdNum = Number.parseInt(chainIdHex, 16);

      setProvider(ethereum);
      setAccount(accounts[0]);
      setChainId(chainIdNum);
      setConnected(true);

      // Persist connection
      storageSet(WALLET_KEYS.connected, "true");
      storageSet(WALLET_KEYS.lastAccounts, JSON.stringify(accounts));
      storageSet(WALLET_KEYS.lastChainId, chainIdNum.toString());

      return accounts[0];
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    if (account) {
      removeDecryptionSignature(account);
    }

    setProvider(null);
    setAccount(null);
    setChainId(null);
    setConnected(false);

    storageRemove(WALLET_KEYS.connected);
    storageRemove(WALLET_KEYS.lastAccounts);
    storageRemove(WALLET_KEYS.lastChainId);
  }, [account]);

  // Listen to provider events
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountList = accounts as string[];
      if (accountList.length === 0) {
        disconnect();
      } else {
        // Clear old account's decryption signature
        if (account) {
          removeDecryptionSignature(account);
        }
        setAccount(accountList[0]);
        storageSet(WALLET_KEYS.lastAccounts, JSON.stringify(accountList));
      }
    };

    const handleChainChanged = (chainIdHex: unknown) => {
      const chainIdNum = Number.parseInt(chainIdHex as string, 16);
      setChainId(chainIdNum);
      storageSet(WALLET_KEYS.lastChainId, chainIdNum.toString());
      // Note: May need to prompt user to switch networks
    };

    const handleDisconnect = () => {
      disconnect();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providerWithEvents = provider as any;
    
    providerWithEvents.on?.("accountsChanged", handleAccountsChanged);
    providerWithEvents.on?.("chainChanged", handleChainChanged);
    providerWithEvents.on?.("disconnect", handleDisconnect);

    return () => {
      providerWithEvents.removeListener?.("accountsChanged", handleAccountsChanged);
      providerWithEvents.removeListener?.("chainChanged", handleChainChanged);
      providerWithEvents.removeListener?.("disconnect", handleDisconnect);
    };
  }, [provider, account, disconnect]);

  // Switch network
  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      if (!provider) throw new Error("No provider connected");

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } catch (error: any) {
        // Chain not added, try adding it
        if (error.code === 4902) {
          console.error("Network not configured in wallet");
        }
        throw error;
      }
    },
    [provider]
  );

  return {
    provider,
    account,
    chainId,
    connected,
    connect,
    disconnect,
    switchNetwork,
  };
}

