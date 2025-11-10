import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { NoiseMonitor, NoiseMonitor__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  resident1: HardhatEthersSigner;
  resident2: HardhatEthersSigner;
  manager: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("NoiseMonitor")) as NoiseMonitor__factory;
  const noiseMonitor = (await factory.deploy()) as NoiseMonitor;
  const contractAddress = await noiseMonitor.getAddress();

  return { noiseMonitor, contractAddress };
}

describe("NoiseMonitor", function () {
  let signers: Signers;
  let noiseMonitor: NoiseMonitor;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      resident1: ethSigners[1],
      resident2: ethSigners[2],
      manager: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    // FHEVM operations require mock environment for local testing
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ noiseMonitor, contractAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await noiseMonitor.owner()).to.equal(signers.deployer.address);
    });

    it("Should initialize with zero locations", async function () {
      expect(await noiseMonitor.getLocationCount()).to.equal(0);
    });
  });

  describe("Noise Reporting", function () {
    it("Should allow residents to submit encrypted noise reports", async function () {
      // Encrypt data: 75 dB for 30 minutes
      const decibel = 75;
      const duration = 30;
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const NOISE_THRESHOLD = 70;

      const encryptedInputs = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(duration)
        .encrypt();

      const exceedsThreshold = decibel > NOISE_THRESHOLD;
      const tx = await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encryptedInputs.handles[0],
          encryptedInputs.handles[1],
          encryptedInputs.inputProof,
          timestamp,
          locationId,
          exceedsThreshold
        );

      await expect(tx)
        .to.emit(noiseMonitor, "NoiseReportSubmitted")
        .withArgs(signers.resident1.address, locationId, timestamp, 0);

      // Verify record count
      const recordCount = await noiseMonitor.getUserRecordCount(signers.resident1.address);
      expect(recordCount).to.equal(1);
    });

    it("Should reject submissions with invalid timestamp", async function () {
      const decibel = 70;
      const NOISE_THRESHOLD = 70;
      const encryptedInputs = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(20)
        .encrypt();

      const exceedsThreshold = decibel > NOISE_THRESHOLD;
      await expect(
        noiseMonitor
          .connect(signers.resident1)
          .submitNoise(
            encryptedInputs.handles[0],
            encryptedInputs.handles[1],
            encryptedInputs.inputProof,
            0,
            1001,
            exceedsThreshold
          )
      ).to.be.revertedWith("Invalid timestamp");
    });

    it("Should reject submissions with invalid location ID", async function () {
      const decibel = 70;
      const NOISE_THRESHOLD = 70;
      const encryptedInputs = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(20)
        .encrypt();
      const timestamp = Math.floor(Date.now() / 1000);

      const exceedsThreshold = decibel > NOISE_THRESHOLD;
      await expect(
        noiseMonitor
          .connect(signers.resident1)
          .submitNoise(
            encryptedInputs.handles[0],
            encryptedInputs.handles[1],
            encryptedInputs.inputProof,
            timestamp,
            0,
            exceedsThreshold
          )
      ).to.be.revertedWith("Invalid location ID");
    });

    it("Should allow multiple residents to submit reports for the same location", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);

      const NOISE_THRESHOLD = 70;
      
      // Resident 1 submits first report
      const decibel1 = 75;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel1)
        .add16(30)
        .encrypt();

      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted1.handles[0],
          encrypted1.handles[1],
          encrypted1.inputProof,
          timestamp,
          locationId,
          decibel1 > NOISE_THRESHOLD
        );

      // Resident 1 submits another report
      const decibel2 = 80;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel2)
        .add16(45)
        .encrypt();

      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted2.handles[0],
          encrypted2.handles[1],
          encrypted2.inputProof,
          timestamp + 100,
          locationId,
          decibel2 > NOISE_THRESHOLD
        );

      // Resident 2 submits a report
      const decibel3 = 65;
      const encrypted3 = await fhevm
        .createEncryptedInput(contractAddress, signers.resident2.address)
        .add16(decibel3)
        .add16(15)
        .encrypt();

      await noiseMonitor
        .connect(signers.resident2)
        .submitNoise(
          encrypted3.handles[0],
          encrypted3.handles[1],
          encrypted3.inputProof,
          timestamp + 200,
          locationId,
          decibel3 > NOISE_THRESHOLD
        );

      // Verify location summary
      const summary = await noiseMonitor.getLocationSummary(locationId);
      expect(summary.totalReports).to.equal(3);
    });

    it("Should register new locations correctly", async function () {
      const locationId2 = 1002;
      const timestamp = Math.floor(Date.now() / 1000);
      const NOISE_THRESHOLD = 70;
      const decibel = 72;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident2.address)
        .add16(decibel)
        .add16(25)
        .encrypt();

      await noiseMonitor
        .connect(signers.resident2)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId2,
          decibel > NOISE_THRESHOLD
        );

      const locationCount = await noiseMonitor.getLocationCount();
      expect(locationCount).to.be.greaterThanOrEqual(1);

      const locationIds = await noiseMonitor.getAllLocationIds();
      expect(locationIds.some((id) => id === BigInt(locationId2))).to.be.true;
    });
  });

  describe("Alert System", function () {
    it("Should trigger alert after reaching ALERT_THRESHOLD exceeded reports", async function () {
      const locationId = 2001;
      const timestamp = Math.floor(Date.now() / 1000);
      const NOISE_THRESHOLD = 70;
      const ALERT_THRESHOLD = 2; // Updated: Alert triggers when 2 reports exceed threshold

      // Submit 2 reports that exceed threshold (75, 80 dB - both > 70)
      for (let i = 0; i < 2; i++) {
        const decibel = 75 + i * 5; // 75, 80 - both exceed threshold
        const encrypted = await fhevm
          .createEncryptedInput(contractAddress, signers.resident1.address)
          .add16(decibel)
          .add16(20 + i)
          .encrypt();

        const exceedsThreshold = decibel > NOISE_THRESHOLD;
        const tx = await noiseMonitor
          .connect(signers.resident1)
          .submitNoise(
            encrypted.handles[0],
            encrypted.handles[1],
            encrypted.inputProof,
            timestamp + i * 100,
            locationId,
            exceedsThreshold
          );

        // Alert should be emitted on the 2nd exceeded report
        if (i === 1) {
          await expect(tx)
            .to.emit(noiseMonitor, "NoiseAlert")
            .withArgs(locationId, timestamp + i * 100, 2);
        }
      }

      const summary = await noiseMonitor.getLocationSummary(locationId);
      expect(summary.alertCount).to.equal(1);
    });
  });

  describe("User Records", function () {
    it("Should allow users to retrieve their record count", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();

      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      const count = await noiseMonitor.getUserRecordCount(signers.resident1.address);
      expect(count).to.equal(1);
    });

    it("Should allow users to retrieve record metadata", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();

      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      const [recordTimestamp, recordLocationId, reporter] = await noiseMonitor.getUserRecord(
        signers.resident1.address,
        0
      );

      expect(recordTimestamp).to.equal(timestamp);
      expect(recordLocationId).to.equal(locationId);
      expect(reporter).to.equal(signers.resident1.address);
    });

    it("Should allow users to decrypt their own encrypted data", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibelValue = 75;
      const durationValue = 30;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibelValue)
        .add16(durationValue)
        .encrypt();

      const NOISE_THRESHOLD = 70;
      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibelValue > NOISE_THRESHOLD
        );

      // Get the encrypted handles
      const decibelHandle = await noiseMonitor.getUserRecordDecibel(signers.resident1.address, 0);
      const durationHandle = await noiseMonitor.getUserRecordDuration(signers.resident1.address, 0);

      // Decrypt
      const decryptedDecibel = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        decibelHandle,
        contractAddress,
        signers.resident1
      );
      const decryptedDuration = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        durationHandle,
        contractAddress,
        signers.resident1
      );

      expect(decryptedDecibel).to.equal(BigInt(decibelValue));
      expect(decryptedDuration).to.equal(BigInt(durationValue));
    });

    it("Should revert when accessing out-of-bounds record index", async function () {
      const count = await noiseMonitor.getUserRecordCount(signers.resident1.address);

      await expect(
        noiseMonitor.getUserRecord(signers.resident1.address, count)
      ).to.be.revertedWith("Index out of bounds");
    });
  });

  describe("Manager Authorization", function () {
    it("Should allow owner to authorize managers", async function () {
      // First, create a location by submitting a report
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();
      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      // Now authorize manager
      const tx = await noiseMonitor
        .connect(signers.deployer)
        .allowManager(signers.manager.address, locationId);

      await expect(tx)
        .to.emit(noiseMonitor, "ManagerAuthorizationChanged")
        .withArgs(signers.manager.address, true);

      expect(await noiseMonitor.authorizedManagers(signers.manager.address)).to.be.true;
    });

    it("Should allow authorized managers to access aggregated data", async function () {
      // Create location and authorize manager
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();
      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      await noiseMonitor.connect(signers.deployer).allowManager(signers.manager.address, locationId);

      // Manager can now access aggregated data
      const [totalExceededCount, totalDuration] = await noiseMonitor
        .connect(signers.manager)
        .getLocationAggregatedData(locationId);

      expect(totalExceededCount).to.not.equal(ethers.ZeroHash);
      expect(totalDuration).to.not.equal(ethers.ZeroHash);
    });

    it("Should allow owner to authorize manager for all locations", async function () {
      // Create multiple locations
      const locationId1 = 1001;
      const locationId2 = 1002;
      const timestamp = Math.floor(Date.now() / 1000);

      const decibel = 75;
      const NOISE_THRESHOLD = 70;
      for (const locationId of [locationId1, locationId2]) {
        const encrypted = await fhevm
          .createEncryptedInput(contractAddress, signers.resident1.address)
          .add16(decibel)
          .add16(30)
          .encrypt();

        await noiseMonitor
          .connect(signers.resident1)
          .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );
      }

      // Authorize for all locations
      await noiseMonitor
        .connect(signers.deployer)
        .allowManagerAllLocations(signers.manager.address);

      expect(await noiseMonitor.authorizedManagers(signers.manager.address)).to.be.true;

      // Verify access to any location
      const [totalExceededCount, totalDuration] = await noiseMonitor
        .connect(signers.manager)
        .getLocationAggregatedData(locationId1);

      expect(totalExceededCount).to.not.equal(ethers.ZeroHash);
      expect(totalDuration).to.not.equal(ethers.ZeroHash);
    });

    it("Should prevent non-authorized users from accessing aggregated data", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();
      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      await expect(
        noiseMonitor.connect(signers.resident2).getLocationAggregatedData(locationId)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should allow owner to revoke manager authorization", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();
      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      await noiseMonitor.connect(signers.deployer).allowManager(signers.manager.address, locationId);

      // Revoke authorization
      await noiseMonitor.connect(signers.deployer).revokeManager(signers.manager.address);

      expect(await noiseMonitor.authorizedManagers(signers.manager.address)).to.be.false;

      // Manager should no longer access aggregated data
      await expect(
        noiseMonitor.connect(signers.manager).getLocationAggregatedData(locationId)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should reject authorization with zero address", async function () {
      const locationId = 1001;

      await expect(
        noiseMonitor.connect(signers.deployer).allowManager(ethers.ZeroAddress, locationId)
      ).to.be.revertedWith("Invalid manager address");
    });

    it("Should reject authorization for unregistered location", async function () {
      const unregisteredLocationId = 9999;

      await expect(
        noiseMonitor
          .connect(signers.deployer)
          .allowManager(signers.manager.address, unregisteredLocationId)
      ).to.be.revertedWith("Location not registered");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      const newOwner = signers.manager;

      await noiseMonitor.connect(signers.deployer).transferOwnership(newOwner.address);

      expect(await noiseMonitor.owner()).to.equal(newOwner.address);

      // Transfer back
      await noiseMonitor.connect(newOwner).transferOwnership(signers.deployer.address);
    });

    it("Should prevent non-owners from transferring ownership", async function () {
      await expect(
        noiseMonitor.connect(signers.resident1).transferOwnership(signers.manager.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should reject ownership transfer to zero address", async function () {
      await expect(
        noiseMonitor.connect(signers.deployer).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });
  });

  describe("Location Queries", function () {
    it("Should return correct location summary", async function () {
      const locationId = 1001;
      const timestamp = Math.floor(Date.now() / 1000);
      const decibel = 75;
      const NOISE_THRESHOLD = 70;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.resident1.address)
        .add16(decibel)
        .add16(30)
        .encrypt();
      await noiseMonitor
        .connect(signers.resident1)
        .submitNoise(
          encrypted.handles[0],
          encrypted.handles[1],
          encrypted.inputProof,
          timestamp,
          locationId,
          decibel > NOISE_THRESHOLD
        );

      const summary = await noiseMonitor.getLocationSummary(locationId);

      expect(summary.totalReports).to.equal(1);
      expect(summary.lastUpdated).to.equal(timestamp);
    });

    it("Should return all location IDs", async function () {
      const locationIds = await noiseMonitor.getAllLocationIds();
      expect(Array.isArray(locationIds)).to.be.true;
    });

    it("Should return correct location count", async function () {
      const count = await noiseMonitor.getLocationCount();
      expect(count).to.be.a("bigint");
    });
  });
});
