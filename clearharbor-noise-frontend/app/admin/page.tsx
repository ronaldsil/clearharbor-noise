"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useNoiseMonitor } from "@/hooks/useNoiseMonitor";
import { useFhevm } from "@/fhevm/useFhevm";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

interface LocationData {
  locationId: number;
  totalReports: number;
  alertCount: number;
  lastUpdated: number;
  totalExceededCountHandle?: string;
  totalDurationHandle?: string;
  decryptedExceededCount?: number;
  decryptedDuration?: number;
  isDecrypting?: boolean;
}

export default function AdminPage() {
  const { account, chainId, provider, connect } = useMetaMaskProvider();
  const signerPromise = useMetaMaskEthersSigner(provider, account);
  const { contract, address: contractAddress } = useNoiseMonitor(signerPromise, chainId);
  const { fhevmInstance, createInstance } = useFhevm();

  const [isOwner, setIsOwner] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newManagerAddress, setNewManagerAddress] = useState("");

  // Check authorization
  useEffect(() => {
    if (!contract || !account) {
      setLoading(false);
      return;
    }

    const checkAuthorization = async () => {
      try {
        const owner = await contract.owner();
        const ownerLower = owner.toLowerCase();
        const accountLower = account.toLowerCase();
        
        setIsOwner(ownerLower === accountLower);
        
        const authorized = await contract.authorizedManagers(account);
        setIsAuthorized(authorized || ownerLower === accountLower);
        
        if (authorized || ownerLower === accountLower) {
          await fetchLocations();
        }
      } catch (error) {
        console.error("Failed to check authorization:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  const fetchLocations = async () => {
    if (!contract) return;

    try {
      const locationIds = await contract.getAllLocationIds();
      const locationData: LocationData[] = [];

      for (let i = 0; i < locationIds.length; i++) {
        const locationId = Number(locationIds[i]);
        const [totalReports, lastUpdated, alertCount] = await contract.getLocationSummary(locationId);
        const [totalExceededCountHandle, totalDurationHandle] = await contract.getLocationAggregatedData(locationId);

        locationData.push({
          locationId,
          totalReports: Number(totalReports),
          alertCount: Number(alertCount),
          lastUpdated: Number(lastUpdated),
          totalExceededCountHandle: totalExceededCountHandle.toString(),
          totalDurationHandle: totalDurationHandle.toString(),
        });
      }

      setLocations(locationData);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const decryptLocationData = async (location: LocationData) => {
    if (!fhevmInstance && provider) {
      setMessage("Initializing FHEVM...");
      const instance = await createInstance(provider, { 31337: "http://localhost:8545" });
      if (!instance) {
        setMessage("Failed to initialize FHEVM");
        return;
      }
    }

    if (!fhevmInstance || !contractAddress || !account || !signerPromise) {
      setMessage("FHEVM instance not ready");
      return;
    }

    setLocations((prev) =>
      prev.map((loc) =>
        loc.locationId === location.locationId ? { ...loc, isDecrypting: true } : loc
      )
    );
    setMessage(`Decrypting data for Location ${location.locationId}...`);

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error("Signer not available");
      }
      
      setMessage(`Generating keypair and requesting signature...`);
      
      // Generate new keypair for each decryption
      const { publicKey, privateKey } = fhevmInstance.generateKeypair();
      
      // Always create new signature (no caching)
      const sig = await FhevmDecryptionSignature.new(
        fhevmInstance,
        [contractAddress],
        publicKey,
        privateKey,
        signer
      );

      if (!sig) {
        throw new Error("Unable to build FHEVM decryption signature");
      }

      setMessage(`Decrypting location ${location.locationId} data...`);
      
      const results = await fhevmInstance.userDecrypt(
        [
          { handle: location.totalExceededCountHandle!, contractAddress: contractAddress as `0x${string}` },
          { handle: location.totalDurationHandle!, contractAddress: contractAddress as `0x${string}` },
        ],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const decryptedExceededCount = Number(results[location.totalExceededCountHandle!]);
      const decryptedDuration = Number(results[location.totalDurationHandle!]);

      setLocations((prev) =>
        prev.map((loc) =>
          loc.locationId === location.locationId
            ? {
                ...loc,
                decryptedExceededCount,
                decryptedDuration,
                isDecrypting: false,
              }
            : loc
        )
      );
      setMessage(`✅ Location ${location.locationId} data decrypted successfully!`);
    } catch (error) {
      console.error("Decryption failed:", error);
      setLocations((prev) =>
        prev.map((loc) =>
          loc.locationId === location.locationId ? { ...loc, isDecrypting: false } : loc
        )
      );
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessage(`❌ Failed to decrypt: ${errorMessage}`);
    }
  };

  const authorizeManager = async () => {
    if (!contract || !newManagerAddress) return;

    try {
      setMessage("Authorizing manager...");
      const tx = await contract.allowManagerAllLocations(newManagerAddress);
      await tx.wait();
      setMessage(`✅ Manager ${newManagerAddress} authorized successfully!`);
      setNewManagerAddress("");
    } catch (error) {
      console.error("Authorization failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessage(`❌ Authorization failed: ${errorMessage}`);
    }
  };

  const getLocationName = (locationId: number): string => {
    if (locationId >= 1001 && locationId <= 1003) {
      return `Block A - Building ${locationId - 1000}`;
    } else if (locationId >= 2001 && locationId <= 2002) {
      return `Block B - Building ${locationId - 2000}`;
    }
    return `Location ${locationId}`;
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Wallet for Admin Access
            </h1>
            <button
              onClick={() => connect()}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
            >
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Checking authorization...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <div className="border-l-4 border-red-400 bg-red-50 dark:bg-red-900 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                ❌ Your address <code className="font-mono">{account}</code> is not authorized to access this page.
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                Please contact the contract owner to request authorization.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Urban Management Dashboard
          </h1>

          <div className="border-l-4 border-green-400 bg-green-50 dark:bg-green-900 p-4 mb-6">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Authorized Access - {isOwner ? "Contract Owner" : "Authorized Manager"}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-mono">
              {account}
            </p>
          </div>

          {message && (
            <div className="mb-6 p-4 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-sm">
              {message}
            </div>
          )}

          {isOwner && (
            <div className="mb-8 p-6 border border-gray-200 dark:border-harbor-700 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Authorize New Manager
              </h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Manager Address (0x...)"
                  value={newManagerAddress}
                  onChange={(e) => setNewManagerAddress(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-harbor-700 rounded-md bg-white dark:bg-harbor-900 text-gray-900 dark:text-white"
                />
                <button
                  onClick={authorizeManager}
                  disabled={!newManagerAddress}
                  className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Authorize
                </button>
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Encrypted Location Data
          </h2>

          {locations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No location data available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <div
                  key={location.locationId}
                  className="border border-gray-200 dark:border-harbor-700 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getLocationName(location.locationId)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Location ID: {location.locationId}
                      </p>
                    </div>
                    <button
                      onClick={() => decryptLocationData(location)}
                      disabled={location.isDecrypting || location.decryptedExceededCount !== undefined}
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {location.isDecrypting
                        ? "Decrypting..."
                        : location.decryptedExceededCount !== undefined
                        ? "✓ Decrypted"
                        : "🔓 Decrypt Aggregated Data"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Reports</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {location.totalReports}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Alerts</p>
                      <p className="text-lg font-semibold text-red-600">
                        {location.alertCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {location.lastUpdated > 0
                          ? new Date(location.lastUpdated * 1000).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {location.decryptedExceededCount !== undefined && location.decryptedDuration !== undefined ? (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-md">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                        🔓 Decrypted Aggregated Statistics:
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-green-700 dark:text-green-300">Total Exceeded Count</p>
                          <p className="text-lg font-bold text-green-900 dark:text-green-100">
                            {location.decryptedExceededCount} times
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-700 dark:text-green-300">Total Duration</p>
                          <p className="text-lg font-bold text-green-900 dark:text-green-100">
                            {location.decryptedDuration} minutes
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        🔒 Aggregated data is encrypted. Click &quot;Decrypt&quot; button to view.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

