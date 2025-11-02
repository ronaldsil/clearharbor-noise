import type { Eip1193Provider } from "ethers";

export interface HandleContractPair {
  handle: string;
  contractAddress: `0x${string}`;
}

export interface UserDecryptResults {
  [handle: string]: bigint | boolean;
}

// Backward compatibility alias
export interface DecryptedResults extends UserDecryptResults {}

export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: string;
    version: string;
  };
  types: {
    UserDecryptRequestVerification: Array<{ name: string; type: string }>;
  };
  primaryType: string;
  message: {
    publicKey: string;
    contractAddresses: string[];
    startTimestamp: number;
    durationDays: number;
  };
};

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number; // Unix timestamp in seconds
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
};

/**
 * FHEVM Instance returned by createInstance
 */
export interface FhevmInstance {
  encrypt_uint16(value: number): Promise<Uint8Array>;
  encrypt_uint32(value: number): Promise<Uint8Array>;
  encrypt_uint64(value: bigint): Promise<Uint8Array>;
  getPublicKey(): string;
  getPublicParams(size: number): string;
  createEncryptedInput(contractAddress: string, userAddress: string): EncryptedInputBuilder;
  generateKeypair(): { publicKey: string; privateKey: string };
  createEIP712(
    publicKey: string,
    contractAddresses: `0x${string}`[],
    startTimestamp: number,
    durationDays: number
  ): EIP712Type;
  userDecrypt(
    handleContractPairs: HandleContractPair[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ): Promise<UserDecryptResults>;
}

export interface EncryptedInputBuilder {
  add16(value: number): EncryptedInputBuilder;
  add32(value: number): EncryptedInputBuilder;
  add64(value: bigint): EncryptedInputBuilder;
  addAddress(address: string): EncryptedInputBuilder;
  addBool(value: boolean): EncryptedInputBuilder;
  encrypt(): Promise<{
    handles: string[];
    inputProof: string;
  }>;
}

/**
 * FHEVM Instance configuration
 */
export interface FhevmInstanceConfig {
  network: Eip1193Provider | string;
  aclContractAddress: string;
  kmsVerifierAddress: string;
  inputVerifierAddress: string;
  fhevmExecutorAddress: string;
  publicKey: string;
  publicParams: string;
}

/**
 * Status during FHEVM instance creation
 */
export type FhevmRelayerStatus =
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating"
  | "ready";

