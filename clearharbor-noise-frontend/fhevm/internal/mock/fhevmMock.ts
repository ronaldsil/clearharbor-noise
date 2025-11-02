/**
 * FHEVM Mock implementation for local testing
 * Uses @fhevm/mock-utils v0.3.0 for Hardhat node
 */

import { JsonRpcProvider, Contract } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import type { FhevmInstance } from "../../fhevmTypes";

interface MockMetadata {
  ACLAddress: `0x${string}`;
  InputVerifierAddress: `0x${string}`;
  KMSVerifierAddress: `0x${string}`;
}

export async function fhevmMockCreateInstance(params: {
  rpcUrl: string;
  chainId: number;
  metadata: MockMetadata;
}): Promise<FhevmInstance> {
  const { rpcUrl, chainId, metadata } = params;

  // Create provider for the Hardhat network
  const provider = new JsonRpcProvider(rpcUrl);

  // Query InputVerifier contract's EIP712 domain to get the correct verifyingContract address
  const inputVerifierContract = new Contract(
    metadata.InputVerifierAddress,
    [
      "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
    ],
    provider
  );

  let verifyingContractAddressInputVerification: `0x${string}`;
  let gatewayChainId: number;

  try {
    const domain = await inputVerifierContract.eip712Domain();
    verifyingContractAddressInputVerification = domain[4] as `0x${string}`; // index 4 is verifyingContract
    gatewayChainId = Number(domain[3]); // index 3 is chainId
  } catch (error) {
    console.warn("Failed to query InputVerifier EIP712 domain, using defaults:", error);
    // Fallback to default values
    verifyingContractAddressInputVerification = "0x812b06e1CDCE800494b79fFE4f925A504a9A9810";
    gatewayChainId = 55815;
  }

  // Create mock FHEVM instance with proper configuration (v0.3.0 API)
  const instance = await MockFhevmInstance.create(
    provider,
    provider,
    {
      aclContractAddress: metadata.ACLAddress,
      chainId: chainId,
      gatewayChainId: gatewayChainId,
      inputVerifierContractAddress: metadata.InputVerifierAddress,
      kmsContractAddress: metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification: verifyingContractAddressInputVerification,
    },
    {
      // Fourth parameter: properties (required in v0.3.0)
      inputVerifierProperties: {},
      kmsVerifierProperties: {},
    }
  );

  return instance as unknown as FhevmInstance;
}

