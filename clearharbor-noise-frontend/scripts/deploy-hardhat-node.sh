#!/usr/bin/env bash

# This script deploys contracts to a running Hardhat node
# It's called automatically by genabi.mjs if localhost deployments don't exist

echo "Deploying contracts to localhost..."

cd ../fhevm-hardhat-template || exit 1

npx hardhat deploy --network localhost

echo "Deployment complete!"

