# ClearHarbor Noise - Privacy-Preserving Community Noise Monitoring dApp

A decentralized application (dApp) built with FHEVM for privacy-preserving community environmental noise measurement. Residents can encrypt decibel and duration data on-chain, perform threshold evaluations, and aggregate data at building/block levels without exposing individual household data.

## Project Overview

ClearHarbor Noise enables communities to monitor environmental noise levels while maintaining complete privacy for individual residents. The system uses Fully Homomorphic Encryption (FHE) to allow on-chain computations on encrypted data, enabling aggregate statistics and alerts without revealing any individual readings.

## Key Features

- **Encrypted Noise Reporting**: Residents submit encrypted decibel and duration data on-chain
- **Threshold Evaluation**: On-chain encrypted comparisons for noise threshold violations
- **Block-Level Aggregation**: Public aggregation at building/block level without exposing individual data
- **Alert System**: Automatic alerts when noise levels exceed thresholds multiple times
- **Urban Management Authorization**: Authorized managers can decrypt aggregated statistics

## Technology Stack

### Smart Contracts
- **Solidity**: ^0.8.27
- **FHEVM**: Fully Homomorphic Encryption Virtual Machine
- **Hardhat**: Development environment and testing framework

### Frontend
- **Next.js**: 15.4.2 (Static Export)
- **React**: 19.1.0
- **TypeScript**: ^5
- **Tailwind CSS**: Utility-first CSS framework
- **ethers.js**: Ethereum library for contract interactions
- **@zama-fhe/relayer-sdk**: FHEVM SDK for encrypted operations

## Project Structure

```
.
├── fhevm-hardhat-template/    # Smart contract development
│   ├── contracts/             # Solidity smart contracts
│   ├── deploy/                # Deployment scripts
│   ├── test/                  # Contract tests
│   └── tasks/                 # Hardhat custom tasks
├── clearharbor-noise-frontend/ # Frontend application
│   ├── app/                   # Next.js app router pages
│   ├── components/            # React components
│   ├── fhevm/                 # FHEVM integration modules
│   ├── hooks/                 # React hooks
│   └── abi/                   # Contract ABIs and addresses
└── README.md                  # This file
```

## Prerequisites

- **Node.js**: Version 20 or higher
- **npm** or **yarn**: Package manager
- **MetaMask**: Browser extension for wallet connection
- **Hardhat Node**: For local development (optional)

## Getting Started

### 1. Install Dependencies

#### Smart Contracts
```bash
cd fhevm-hardhat-template
npm install
```

#### Frontend
```bash
cd clearharbor-noise-frontend
npm install
```

### 2. Configure Environment Variables

#### Hardhat Configuration
Set up Hardhat environment variables:
```bash
cd fhevm-hardhat-template
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY  # Optional, for contract verification
```

### 3. Compile and Test Contracts

```bash
cd fhevm-hardhat-template
npx hardhat compile
npx hardhat test
```

### 4. Deploy Contracts

#### Local Network
```bash
# Start local Hardhat node (in one terminal)
npx hardhat node

# Deploy to local network (in another terminal)
npx hardhat deploy --network localhost
```

#### Sepolia Testnet
```bash
npx hardhat deploy --network sepolia
```

### 5. Run Frontend

#### Mock Mode (with local Hardhat node)
```bash
cd clearharbor-noise-frontend
npm run dev:mock
```

#### Production Mode (with Sepolia or other networks)
```bash
cd clearharbor-noise-frontend
npm run dev
```

#### Build for Production
```bash
cd clearharbor-noise-frontend
npm run build
```

The built static files will be in the `out/` directory.

## Contract Details

### NoiseMonitor Contract

**Addresses**:
- Sepolia: `0xCdf3bFb3301404095682f83958ae768BcaC8531E`
- Localhost: `0x4502AD341C28474905c63479b9b750eFbc66FFD0`

**Key Functions**:
- `submitNoise()`: Submit encrypted noise data
- `getLocationAggregatedData()`: Retrieve aggregated data (authorized managers)
- `getLocationAggregatedDataPublic()`: Retrieve encrypted aggregated data handles
- `authorizeSelfForLocation()`: Self-authorize for location data decryption
- `allowManager()`: Authorize urban management for data access

**Constants**:
- `NOISE_THRESHOLD`: 70 dB
- `ALERT_THRESHOLD`: 2 (triggers alert after 2 threshold violations)

## FHEVM Application Points

- **euint16**: Encrypted 16-bit integers for decibels and minutes
- **FHE.add**: Homomorphic addition for duration aggregation
- **FHE.gt**: Encrypted comparison for threshold checks
- **FHE.allow**: Access control for encrypted data decryption
- **FHE.fromExternal**: Convert external encrypted inputs to contract format

## Deployment

### Vercel (Frontend)

The frontend is deployed on Vercel:
- **Production URL**: https://clearharbor-noise-3219818bc7949e5c-fmrilqqga.vercel.app

### Contract Deployment

Contracts can be deployed to:
- **Local Hardhat Node**: `npx hardhat deploy --network localhost`
- **Sepolia Testnet**: `npx hardhat deploy --network sepolia`

## Testing

Run the test suite:
```bash
cd fhevm-hardhat-template
npx hardhat test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

BSD-3-Clause-Clear

## Resources

- [FHEVM Documentation](https://docs.zama.ai/protocol)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)


