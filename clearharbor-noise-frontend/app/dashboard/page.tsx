"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { JsonRpcProvider, Contract } from "ethers";
import { useMetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useNoiseMonitor } from "@/hooks/useNoiseMonitor";
import { useFhevm } from "@/fhevm/useFhevm";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

interface LocationStats {
  locationId: number;
  totalReports: number;
  lastUpdated: number;
  alertCount: number;
  totalExceededCountHandle?: string;
  totalDurationHandle?: string;
  decryptedExceededCount?: number;
  decryptedDuration?: number;
  isDecrypting?: boolean;
}

export default function DashboardPage() {
  const { account, chainId, provider } = useMetaMaskProvider();
  const signerPromise = useMetaMaskEthersSigner(provider, account);
  const { address: contractAddress } = useNoiseMonitor(signerPromise, chainId);
  const { fhevmInstance, createInstance } = useFhevm();

  const [locations, setLocations] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReports, setTotalReports] = useState(0);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Dynamically import ABI and addresses
        const { NoiseMonitorABI } = await import("@/abi/NoiseMonitorABI");
        const { NoiseMonitorAddresses } = await import("@/abi/NoiseMonitorAddresses");

        // Use localhost by default (Hardhat node)
        const rpcUrl = "http://localhost:8545";
        const chainId = 31337;

        console.log("[Dashboard] Connecting to RPC:", rpcUrl);
        console.log("[Dashboard] Chain ID:", chainId);

        // Create readonly provider
        const provider = new JsonRpcProvider(rpcUrl);
        
        // Get contract address
        const addressInfo = NoiseMonitorAddresses[chainId.toString() as keyof typeof NoiseMonitorAddresses];
        if (!addressInfo || addressInfo.address === "0x0000000000000000000000000000000000000000") {
          console.log("[Dashboard] Contract not deployed on chain", chainId);
          setLoading(false);
          return;
        }

        console.log("[Dashboard] Contract address:", addressInfo.address);

        // Create contract instance
        const contract = new Contract(addressInfo.address, NoiseMonitorABI.abi, provider);

        console.log("[Dashboard] Fetching location count...");
        // Get total number of locations
        const locationCount = await contract.getLocationCount();
        const count = Number(locationCount);
        console.log("[Dashboard] Location count:", count);

        if (count === 0) {
          setLoading(false);
          console.log("[Dashboard] No locations found");
          return;
        }

        // Get all location IDs
        const locationIds = await contract.getAllLocationIds();
        console.log("[Dashboard] Location IDs:", locationIds);

        // Fetch summary for each location
        const locationStats: LocationStats[] = [];
        let totalReportsSum = 0;
        let totalAlertsSum = 0;

        for (let i = 0; i < locationIds.length; i++) {
          const locationId = Number(locationIds[i]);
          const [totalReports, lastUpdated, alertCount] = await contract.getLocationSummary(locationId);
          // Use public function to get aggregated data handles (no authorization required)
          const [totalExceededCountHandle, totalDurationHandle] = await contract.getLocationAggregatedDataPublic(locationId);

          const stats = {
            locationId,
            totalReports: Number(totalReports),
            lastUpdated: Number(lastUpdated),
            alertCount: Number(alertCount),
            totalExceededCountHandle: totalExceededCountHandle.toString(),
            totalDurationHandle: totalDurationHandle.toString(),
          };

          locationStats.push(stats);
          totalReportsSum += stats.totalReports;
          totalAlertsSum += stats.alertCount;
        }

        console.log("[Dashboard] Location stats:", locationStats);
        setLocations(locationStats);
        setTotalReports(totalReportsSum);
        setTotalAlerts(totalAlertsSum);
        setError(null);
      } catch (error) {
        console.error("[Dashboard] Failed to fetch data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setError(`Failed to load data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const decryptLocationData = async (location: LocationStats) => {
    if (!account) {
      setMessage("⚠️ Please connect your wallet to decrypt aggregated data");
      return;
    }

    // Initialize FHEVM instance if not ready
    let instanceToUse = fhevmInstance;
    if (!instanceToUse && provider) {
      setMessage("Initializing FHEVM...");
      instanceToUse = await createInstance(provider, { 31337: "http://localhost:8545" });
      
      if (!instanceToUse) {
        setMessage("❌ Failed to initialize FHEVM. Please try again.");
        return;
      }
    }

    if (!instanceToUse || !contractAddress || !account || !signerPromise) {
      setMessage("FHEVM instance not ready. Please ensure your wallet is connected and try again.");
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
      
      setMessage(`Authorizing decryption access...`);
      
      // Try to authorize user for this location (if they have submitted reports)
      // This is a no-op if already authorized or if user hasn't submitted reports
      try {
        const { NoiseMonitorABI } = await import("@/abi/NoiseMonitorABI");
        const { NoiseMonitorAddresses } = await import("@/abi/NoiseMonitorAddresses");
        const chainIdStr = chainId?.toString() || "31337";
        const addressInfo = NoiseMonitorAddresses[chainIdStr as keyof typeof NoiseMonitorAddresses];
        
        if (addressInfo && addressInfo.address !== "0x0000000000000000000000000000000000000000") {
          const noiseContract = new Contract(addressInfo.address, NoiseMonitorABI.abi, signer);
          // This will fail silently if user hasn't submitted reports for this location
          // That's OK - the decryption will fail with a clearer error message
          try {
            const tx = await noiseContract.authorizeSelfForLocation(location.locationId);
            await tx.wait();
            setMessage(`✅ Authorization granted. Generating keypair...`);
          } catch (authError) {
            // User may not have submitted reports, continue anyway
            console.log("[Dashboard] Authorization attempt (user may not have reports):", authError);
            setMessage(`Generating keypair (note: you may need to submit a report first)...`);
          }
        }
      } catch (authError) {
        console.log("[Dashboard] Authorization step skipped:", authError);
        setMessage(`Generating keypair...`);
      }
      
      setMessage(`Generating keypair and requesting signature...`);
      
      // Generate new keypair for each decryption
      const { publicKey, privateKey } = instanceToUse.generateKeypair();
      
      // Always create new signature (no caching)
      const sig = await FhevmDecryptionSignature.new(
        instanceToUse,
        [contractAddress],
        publicKey,
        privateKey,
        signer
      );

      if (!sig) {
        throw new Error("Unable to build FHEVM decryption signature");
      }

      setMessage(`Decrypting location ${location.locationId} data...`);
      
      const results = await instanceToUse.userDecrypt(
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
      
      // Provide helpful error message based on error type
      if (errorMessage.includes("not authorized")) {
        setMessage(`❌ Decryption failed: You are not authorized to decrypt this location's data. Please submit at least one noise report for Location ${location.locationId} first, then try again.`);
      } else {
        setMessage(`❌ Failed to decrypt: ${errorMessage}`);
      }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Community Noise Dashboard
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 rounded-lg">
            <p className="text-red-900 dark:text-red-100">❌ {error}</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
              Make sure you&apos;re connected to the correct network and the contract is deployed.
            </p>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Total Reports
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalReports}</p>
              </div>
              <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Active Alerts
                </h3>
                <p className="text-3xl font-bold text-red-600">{totalAlerts}</p>
              </div>
              <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Blocks Monitored
                </h3>
                <p className="text-3xl font-bold text-green-600">{locations.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Location Status
              </h2>
              
              {locations.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No data available yet. Reports will appear here once submitted.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div
                      key={location.locationId}
                      className="border border-gray-200 dark:border-harbor-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-harbor-700 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {getLocationName(location.locationId)}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Location ID: {location.locationId}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => decryptLocationData(location)}
                          disabled={location.isDecrypting || location.decryptedExceededCount !== undefined}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {location.isDecrypting
                            ? "Decrypting..."
                            : location.decryptedExceededCount !== undefined
                            ? "✓ Decrypted"
                            : "🔓 Decrypt Data"}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
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

                      {location.alertCount > 0 && (
                        <div className="mb-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            ⚠️ Alert
                          </span>
                        </div>
                      )}

                      {location.decryptedExceededCount !== undefined && location.decryptedDuration !== undefined ? (
                        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-md">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
                            🔓 Decrypted Aggregated Statistics:
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-green-700 dark:text-green-300">Total Exceeded Count</p>
                              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                {location.decryptedExceededCount} times
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Number of times noise exceeded 70 dB threshold
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-green-700 dark:text-green-300">Total Duration</p>
                              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                {location.decryptedDuration} minutes
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Total duration of all noise reports
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-md">
                          <p className="text-xs text-blue-900 dark:text-blue-100">
                            🔒 <strong>Encrypted Aggregated Data:</strong> Click &quot;🔓 Decrypt Data&quot; button above to view statistics.
                            {!account && " Connect your wallet first."}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

