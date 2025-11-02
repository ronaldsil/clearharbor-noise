"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskProvider } from "@/hooks/metamask/useMetaMaskProvider";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useNoiseMonitor } from "@/hooks/useNoiseMonitor";
import { useFhevm } from "@/fhevm/useFhevm";

export default function ReportPage() {
  const { account, chainId, provider, connect } = useMetaMaskProvider();
  const signer = useMetaMaskEthersSigner(provider, account);
  const { contract } = useNoiseMonitor(signer, chainId);
  const { fhevmInstance, createInstance } = useFhevm();

  const [decibel, setDecibel] = useState(70);
  const [duration, setDuration] = useState(30);
  const [locationId, setLocationId] = useState(1001);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      await connect();
      return;
    }

    if (!contract) {
      setMessage("Contract not available. Please check network.");
      return;
    }

    setLoading(true);

    try {
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

      if (!instanceToUse) {
        setMessage("FHEVM instance not ready. Please try again.");
        return;
      }

      setMessage("Encrypting data...");
      const encryptedInput = instanceToUse.createEncryptedInput(
        contract.target as string,
        account
      );
      encryptedInput.add16(decibel);
      encryptedInput.add16(duration);
      const encrypted = await encryptedInput.encrypt();

      setMessage("Submitting transaction...");
      // Calculate if decibel exceeds threshold (70 dB)
      const NOISE_THRESHOLD = 70;
      const exceedsThreshold = decibel > NOISE_THRESHOLD;
      
      const tx = await contract.submitNoise(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.inputProof,
        Math.floor(Date.now() / 1000),
        locationId,
        exceedsThreshold
      );

      setMessage("Waiting for confirmation...");
      await tx.wait();

      setMessage("✅ Report submitted successfully!");
      setDecibel(70);
      setDuration(30);
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage = error instanceof Error ? error.message : "Transaction failed";
      setMessage(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-harbor-900">
      <Navigation />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-harbor-800 rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Submit Noise Report
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decibel Level (dB): {decibel}
              </label>
              <input
                type="range"
                min="0"
                max="120"
                value={decibel}
                onChange={(e) => setDecibel(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Quiet (0)</span>
                <span>Threshold (70)</span>
                <span>Loud (120)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-harbor-700 rounded-md bg-white dark:bg-harbor-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-harbor-700 rounded-md bg-white dark:bg-harbor-900 text-gray-900 dark:text-white"
              >
                <option value={1001}>Block A - Building 1</option>
                <option value={1002}>Block A - Building 2</option>
                <option value={1003}>Block A - Building 3</option>
                <option value={2001}>Block B - Building 1</option>
                <option value={2002}>Block B - Building 2</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Encrypt & Submit"}
            </button>

            {message && (
              <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 text-sm">
                {message}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}

