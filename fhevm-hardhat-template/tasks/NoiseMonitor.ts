import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("noise:submit", "Submit a noise report")
  .addParam("decibel", "Decibel level (0-120)")
  .addParam("duration", "Duration in minutes")
  .addParam("location", "Location ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { decibel, duration, location } = taskArguments;
    const [signer] = await ethers.getSigners();

    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    console.log("Submitting noise report...");
    console.log(`  Decibel: ${decibel} dB`);
    console.log(`  Duration: ${duration} minutes`);
    console.log(`  Location: ${location}`);

    // Note: In production, you would encrypt these values using FHEVM instance
    // For this task, we're showing the structure
    console.log("\n⚠️  This task requires FHEVM instance to encrypt data.");
    console.log("Please use the frontend application to submit encrypted reports.");
  });

task("noise:records", "Get noise records for an address")
  .addOptionalParam("address", "Address to query (defaults to signer)")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const [signer] = await ethers.getSigners();
    const address = taskArguments.address || (await signer.getAddress());

    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    const count = await noiseMonitor.getUserRecordCount(address);
    console.log(`\nTotal records for ${address}: ${count}`);

    if (count === 0n) {
      console.log("No records found.");
      return;
    }

    console.log("\nRecords:");
    for (let i = 0; i < count; i++) {
      const [timestamp, locationId, reporter] = await noiseMonitor.getUserRecord(address, i);
      const date = new Date(Number(timestamp) * 1000);

      console.log(`\n[${i}]`);
      console.log(`  Timestamp: ${date.toISOString()}`);
      console.log(`  Location: ${locationId}`);
      console.log(`  Reporter: ${reporter}`);
      console.log(`  Decibel: 🔒 Encrypted`);
      console.log(`  Duration: 🔒 Encrypted`);
    }
  });

task("noise:locations", "List all registered locations")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    const locationIds = await noiseMonitor.getAllLocationIds();
    console.log(`\nTotal locations: ${locationIds.length}`);

    if (locationIds.length === 0) {
      console.log("No locations registered yet.");
      return;
    }

    console.log("\nLocations:");
    for (const locationId of locationIds) {
      const summary = await noiseMonitor.getLocationSummary(locationId);
      console.log(`\nLocation ${locationId}:`);
      console.log(`  Total Reports: ${summary.totalReports}`);
      console.log(`  Alert Count: ${summary.alertCount}`);
      console.log(`  Last Updated: ${new Date(Number(summary.lastUpdated) * 1000).toISOString()}`);
    }
  });

task("noise:summary", "Get summary for a specific location")
  .addParam("location", "Location ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { location } = taskArguments;

    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    const summary = await noiseMonitor.getLocationSummary(location);

    console.log(`\nLocation ${location} Summary:`);
    console.log(`  Total Reports: ${summary.totalReports}`);
    console.log(`  Alert Count: ${summary.alertCount}`);
    console.log(`  Last Updated: ${new Date(Number(summary.lastUpdated) * 1000).toISOString()}`);

    if (summary.totalReports === 0n) {
      console.log("\n  No reports submitted for this location yet.");
    }
  });

task("noise:authorize", "Authorize a manager to access aggregated data")
  .addParam("manager", "Manager address to authorize")
  .addParam("location", "Location ID to grant access for")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { manager, location } = taskArguments;
    const [signer] = await ethers.getSigners();

    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    console.log(`\nAuthorizing manager: ${manager}`);
    console.log(`For location: ${location}`);

    const tx = await noiseMonitor.connect(signer).allowManager(manager, location);
    const receipt = await tx.wait();

    console.log(`\n✅ Manager authorized!`);
    console.log(`Transaction hash: ${receipt?.hash}`);
  });

task("noise:authorize-all", "Authorize a manager for all locations")
  .addParam("manager", "Manager address to authorize")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { manager } = taskArguments;
    const [signer] = await ethers.getSigners();

    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    console.log(`\nAuthorizing manager for all locations: ${manager}`);

    const tx = await noiseMonitor.connect(signer).allowManagerAllLocations(manager);
    const receipt = await tx.wait();

    console.log(`\n✅ Manager authorized for all locations!`);
    console.log(`Transaction hash: ${receipt?.hash}`);
  });

task("noise:revoke", "Revoke manager authorization")
  .addParam("manager", "Manager address to revoke")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { manager } = taskArguments;
    const [signer] = await ethers.getSigners();

    const NoiseMonitorDeployment = await deployments.get("NoiseMonitor");
    const noiseMonitor = await ethers.getContractAt(
      "NoiseMonitor",
      NoiseMonitorDeployment.address
    );

    console.log(`\nRevoking authorization for manager: ${manager}`);

    const tx = await noiseMonitor.connect(signer).revokeManager(manager);
    const receipt = await tx.wait();

    console.log(`\n✅ Manager authorization revoked!`);
    console.log(`Transaction hash: ${receipt?.hash}`);
  });

