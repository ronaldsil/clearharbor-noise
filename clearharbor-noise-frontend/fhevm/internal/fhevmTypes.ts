/**
 * Relayer SDK types (window.relayerSDK)
 */
export interface FhevmRelayerSDKType {
  initSDK(options?: FhevmInitSDKOptions): Promise<boolean>;
  createInstance(config: any): Promise<any>;
  SepoliaConfig: {
    aclContractAddress: string;
    kmsVerifierAddress: string;
    inputVerifierAddress: string;
    fhevmExecutorAddress: string;
  };
  __initialized__?: boolean;
}

export interface FhevmWindowType {
  relayerSDK: FhevmRelayerSDKType;
}

export interface FhevmInitSDKOptions {
  debug?: boolean;
}

export type FhevmLoadSDKType = () => Promise<void>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;

