/**
 * FHEVM SDK CDN URL (v0.3.0-5, UMD format)
 * Dynamically loaded for real Relayer mode
 */
export const SDK_CDN_URL = "https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs";

/**
 * Local fallback URL for SDK
 */
export const SDK_LOCAL_URL = "/relayer-sdk-js.umd.cjs";

/**
 * Default mock chain configuration
 */
export const DEFAULT_MOCK_CHAINS: Record<number, string> = {
  31337: "http://localhost:8545",
};

