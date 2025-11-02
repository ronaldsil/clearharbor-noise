"use client";

import { useState } from "react";
import Link from "next/link";
import { useMetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { useEip6963 } from "@/hooks/metamask/useEip6963";
import { truncateAddress } from "@/lib/utils";

export function Navigation() {
  const { account, chainId, connected, connect, disconnect } = useMetaMaskProvider();
  const { providers } = useEip6963();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnect = async () => {
    if (providers.length > 0) {
      setShowWalletModal(true);
    } else {
      // Fallback to window.ethereum
      await connect();
    }
  };

  const handleProviderSelect = async (providerDetail: { provider: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await connect(providerDetail.provider as any);
    setShowWalletModal(false);
  };

  const networkName = chainId === 31337 ? "Localhost" : chainId === 11155111 ? "Sepolia" : `Chain ${chainId}`;

  return (
    <nav className="bg-white dark:bg-harbor-900 border-b border-gray-200 dark:border-harbor-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                ClearHarbor
              </span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Link href="/report" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Report
              </Link>
              <Link href="/records" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                My Records
              </Link>
              <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 px-3 py-2 text-sm font-medium">
                Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {connected && chainId && (
              <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-harbor-800 rounded-md">
                {networkName}
              </span>
            )}
            
            {connected && account ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {truncateAddress(account)}
                </span>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-harbor-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Select Wallet</h3>
            <div className="space-y-2">
              {providers.map((provider) => (
                <button
                  key={provider.info.uuid}
                  onClick={() => handleProviderSelect(provider)}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-300 dark:border-harbor-700 rounded-md hover:bg-gray-50 dark:hover:bg-harbor-700"
                >
                  {provider.info.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={provider.info.icon} alt={provider.info.name} className="w-8 h-8" />
                  )}
                  <span>{provider.info.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletModal(false)}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-harbor-700 rounded-md hover:bg-gray-50 dark:hover:bg-harbor-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

