"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useNoiseMonitor } from "@/hooks/useNoiseMonitor";
import { useFhevm } from "@/fhevm/useFhevm";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

interface NoiseRecord {
  index: number;
  timestamp: number;
  locationId: number;
  decibelHandle: string;
  durationHandle: string;
  decryptedDecibel?: number;
  decryptedDuration?: number;
  isDecrypting?: boolean;
}

export default function RecordsPage() {
  const { account, chainId, provider, connect } = useMetaMaskProvider();
  const signerPromise = useMetaMaskEthersSigner(provider, account);
  const { contract, address: contractAddress } = useNoiseMonitor(signerPromise, chainId);
  const { fhevmInstance, createInstance } = useFhevm();

  const [records, setRecords] = useState<NoiseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [signer, setSigner] = useState<Awaited<typeof signerPromise> | null>(null);

  // Resolve signer promise
  useEffect(() => {
    if (!signerPromise) {
      setSigner(null);
      return;
    }
    signerPromise.then(setSigner);
  }, [signerPromise]);

  useEffect(() => {
    if (!contract || !account) return;

    const fetchRecords = async () => {
      setLoading(true);
      try {
        const count = await contract.getUserRecordCount(account);
        const recordCount = Number(count);

        const fetchedRecords: NoiseRecord[] = [];
        for (let i = 0; i < recordCount; i++) {
          const [timestamp, locationId] = await contract.getUserRecord(account, i);
          const decibelHandle = await contract.getUserRecordDecibel(account, i);
          const durationHandle = await contract.getUserRecordDuration(account, i);

          fetchedRecords.push({
            index: i,
            timestamp: Number(timestamp),
            locationId: Number(locationId),
            decibelHandle: decibelHandle.toString(),
            durationHandle: durationHandle.toString(),
          });
        }

        setRecords(fetchedRecords);
      } catch (error) {
        console.error("Failed to fetch records:", error);
        setMessage("Failed to load records. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [contract, account]);

  const getLocationName = (locationId: number): string => {
    if (locationId >= 1001 && locationId <= 1003) {
      return `Block A - Building ${locationId - 1000}`;
    } else if (locationId >= 2001 && locationId <= 2002) {
      return `Block B - Building ${locationId - 2000}`;
    }
    return `Location ${locationId}`;
  };

  const decryptRecord = async (record: NoiseRecord) => {
    // Initialize FHEVM instance if not ready
    let instanceToUse = fhevmInstance;
    if (!instanceToUse && provider) {
      setMessage("Initializing FHEVM...");
      instanceToUse = await createInstance(provider, { 31337: "http://localhost:8545" });
      if (!instanceToUse) {
        setMessage("Failed to initialize FHEVM");
        return;
      }
    }

    if (!instanceToUse || !contractAddress || !account || !signer) {
      setMessage("FHEVM instance not ready");
      return;
    }

    setRecords((prev) =>
      prev.map((r) =>
        r.index === record.index ? { ...r, isDecrypting: true } : r
      )
    );
    setMessage(`Preparing to decrypt record #${record.index}...`);

    try {
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

      setMessage(`Decrypting record #${record.index}...`);
      
      // Decrypt both handles
      const results = await instanceToUse.userDecrypt(
        [
          { handle: record.decibelHandle, contractAddress: contractAddress as `0x${string}` },
          { handle: record.durationHandle, contractAddress: contractAddress as `0x${string}` },
        ],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      const decryptedDecibel = results[record.decibelHandle];
      const decryptedDuration = results[record.durationHandle];

      setRecords((prev) =>
        prev.map((r) =>
          r.index === record.index
            ? {
                ...r,
                decryptedDecibel: Number(decryptedDecibel),
                decryptedDuration: Number(decryptedDuration),
                isDecrypting: false,
              }
            : r
        )
      );
      setMessage(`✅ Record #${record.index} decrypted successfully!`);
    } catch (error) {
      console.error("Decryption failed:", error);
      setRecords((prev) =>
        prev.map((r) =>
          r.index === record.index ? { ...r, isDecrypting: false } : r
        )
      );
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessage(`❌ Failed to decrypt record #${record.index}: ${errorMessage}`);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Wallet to View Records
            </h1>
            <button
              onClick={() => connect()}
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700"
            >
              Connect Wallet
            </button>
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
            My Noise Reports
          </h1>

          {message && (
            <div className="mb-4 p-4 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-sm">
              {message}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No records yet. Start reporting to protect your community!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.index}
                  className="border border-gray-200 dark:border-harbor-700 rounded-lg p-4"
                >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Report #{record.index}
                              </div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                {getLocationName(record.locationId)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Location ID: {record.locationId}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {new Date(record.timestamp * 1000).toLocaleString()}
                              </div>
                      
                      {record.decryptedDecibel !== undefined && record.decryptedDuration !== undefined ? (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900 rounded-md">
                          <div className="text-sm font-medium text-green-900 dark:text-green-100">
                            🔓 Decrypted Data:
                          </div>
                          <div className="mt-1 text-sm text-green-800 dark:text-green-200">
                            Decibel: {record.decryptedDecibel} dB | Duration: {record.decryptedDuration} min
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          🔒 Encrypted
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => decryptRecord(record)}
                      disabled={record.isDecrypting || record.decryptedDecibel !== undefined}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {record.isDecrypting
                        ? "Decrypting..."
                        : record.decryptedDecibel !== undefined
                        ? "✓ Decrypted"
                        : "🔓 Decrypt"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

