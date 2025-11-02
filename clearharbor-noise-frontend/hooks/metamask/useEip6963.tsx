"use client";

import { useState, useEffect } from "react";
import type { EIP6963ProviderDetail } from "./Eip6963Types";

export function useEip6963() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);

  useEffect(() => {
    const handleAnnouncement = (event: Event) => {
      const customEvent = event as CustomEvent<EIP6963ProviderDetail>;
      setProviders((prev) => {
        // Avoid duplicates
        const exists = prev.some((p) => p.info.uuid === customEvent.detail.info.uuid);
        if (exists) return prev;
        return [...prev, customEvent.detail];
      });
    };

    window.addEventListener("eip6963:announceProvider", handleAnnouncement);

    // Request providers to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
    };
  }, []);

  return { providers };
}

