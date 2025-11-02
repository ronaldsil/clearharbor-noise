// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint16, externalEuint16, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title NoiseMonitor
 * @notice Privacy-preserving community noise monitoring powered by FHEVM
 * @dev Residents submit encrypted decibel levels and durations. 
 *      The contract performs threshold evaluation and location-based aggregation on encrypted data.
 *      Only aggregated statistics are revealed; individual records remain encrypted.
 */
contract NoiseMonitor is ZamaEthereumConfig {
    /// @notice Noise record submitted by a resident
    struct NoiseRecord {
        euint16 decibel;          // Encrypted decibel level (0-120 dB)
        euint16 duration;         // Encrypted duration in minutes
        uint256 timestamp;        // Plaintext timestamp
        uint256 locationId;       // Plaintext location identifier (building/block)
        address reporter;         // Address of the reporter
        bool isProcessed;         // Whether this record has been aggregated
    }

    /// @notice Aggregated data for a specific location
    struct AggregatedData {
        uint256 totalReports;           // Total number of reports (plaintext counter)
        euint16 totalExceededCount;     // Encrypted count of threshold exceedances
        euint16 totalDuration;          // Encrypted sum of all durations
        uint256 lastUpdated;            // Last update timestamp (plaintext)
        uint256 alertCount;             // Number of times alert was triggered (plaintext)
        uint256 exceededCountForAlert;  // Plaintext counter for tracking exceedances (used for alert triggering)
    }

    /// @notice Threshold for noise level exceedance (in dB, plaintext)
    uint16 public constant NOISE_THRESHOLD = 70;

    /// @notice Alert threshold: trigger alert when exceeded count reaches this value
    uint16 public constant ALERT_THRESHOLD = 2;

    /// @notice Mapping from user address to their noise records
    mapping(address => NoiseRecord[]) public userRecords;

    /// @notice Mapping from location ID to aggregated data
    mapping(uint256 => AggregatedData) public locationData;

    /// @notice Mapping of authorized manager addresses
    mapping(address => bool) public authorizedManagers;

    /// @notice Contract owner
    address public owner;

    /// @notice List of all location IDs that have received reports
    uint256[] public locationIds;

    /// @notice Mapping to check if a location ID has been registered
    mapping(uint256 => bool) private locationRegistered;

    /// @notice Emitted when a noise report is submitted
    event NoiseReportSubmitted(
        address indexed reporter,
        uint256 indexed locationId,
        uint256 timestamp,
        uint256 recordIndex
    );

    /// @notice Emitted when a location triggers an alert
    event NoiseAlert(
        uint256 indexed locationId,
        uint256 timestamp,
        uint256 totalReports
    );

    /// @notice Emitted when a manager is authorized or deauthorized
    event ManagerAuthorizationChanged(
        address indexed manager,
        bool authorized
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(
            authorizedManagers[msg.sender] || msg.sender == owner,
            "Not authorized"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Submit an encrypted noise report
     * @param inputDecibel External encrypted decibel level (0-120 dB)
     * @param inputDuration External encrypted duration in minutes
     * @param inputProof Input proof for ZK verification
     * @param timestamp Report timestamp
     * @param locationId Location identifier (building/block)
     * @param exceedsThreshold Plaintext boolean indicating if decibel exceeds NOISE_THRESHOLD (for alert triggering)
     */
    function submitNoise(
        externalEuint16 inputDecibel,
        externalEuint16 inputDuration,
        bytes calldata inputProof,
        uint256 timestamp,
        uint256 locationId,
        bool exceedsThreshold
    ) external {
        require(timestamp > 0, "Invalid timestamp");
        require(locationId > 0, "Invalid location ID");

        // Convert external encrypted data to euint16
        euint16 decibel = FHE.fromExternal(inputDecibel, inputProof);
        euint16 duration = FHE.fromExternal(inputDuration, inputProof);

        // Allow the contract to use these encrypted values
        FHE.allowThis(decibel);
        FHE.allowThis(duration);

        // Allow the reporter to decrypt their own data
        FHE.allow(decibel, msg.sender);
        FHE.allow(duration, msg.sender);

        // Create and store the record
        NoiseRecord memory record = NoiseRecord({
            decibel: decibel,
            duration: duration,
            timestamp: timestamp,
            locationId: locationId,
            reporter: msg.sender,
            isProcessed: false
        });

        userRecords[msg.sender].push(record);
        uint256 recordIndex = userRecords[msg.sender].length - 1;

        emit NoiseReportSubmitted(msg.sender, locationId, timestamp, recordIndex);

        // Aggregate at the location level
        _aggregateLocation(locationId, decibel, duration, timestamp, exceedsThreshold);
    }

    /**
     * @notice Internal function to aggregate data at location level
     * @param locationId Location identifier
     * @param decibel Encrypted decibel value
     * @param duration Encrypted duration value
     * @param timestamp Report timestamp
     * @param exceedsThreshold Plaintext boolean indicating if decibel exceeds threshold
     */
    function _aggregateLocation(
        uint256 locationId,
        euint16 decibel,
        euint16 duration,
        uint256 timestamp,
        bool exceedsThreshold
    ) private {
        AggregatedData storage data = locationData[locationId];

        // Register location if first report
        if (!locationRegistered[locationId]) {
            locationIds.push(locationId);
            locationRegistered[locationId] = true;
        }

        // Initialize if first report for this location
        if (data.totalReports == 0) {
            data.totalExceededCount = FHE.asEuint16(0);
            data.totalDuration = FHE.asEuint16(0);
            FHE.allowThis(data.totalExceededCount);
            FHE.allowThis(data.totalDuration);
        }

        // Check if decibel exceeds threshold
        euint16 thresholdValue = FHE.asEuint16(NOISE_THRESHOLD);
        ebool isExceeded = FHE.gt(decibel, thresholdValue);

        // Increment exceeded count if threshold exceeded (using select: if true, add 1, else add 0)
        euint16 incrementValue = FHE.select(isExceeded, FHE.asEuint16(1), FHE.asEuint16(0));
        data.totalExceededCount = FHE.add(data.totalExceededCount, incrementValue);

        // Accumulate total duration
        data.totalDuration = FHE.add(data.totalDuration, duration);

        // Update plaintext counters
        data.totalReports++;
        data.lastUpdated = timestamp;

        // Track exceedances in plaintext for alert triggering
        if (exceedsThreshold) {
            data.exceededCountForAlert++;
            
            // Trigger alert when exceeded count reaches ALERT_THRESHOLD
            if (data.exceededCountForAlert >= ALERT_THRESHOLD) {
                data.alertCount++;
                data.exceededCountForAlert = 0; // Reset counter after alert
                emit NoiseAlert(locationId, timestamp, data.totalReports);
            }
        }

        // Allow contract to continue using these values
        FHE.allowThis(data.totalExceededCount);
        FHE.allowThis(data.totalDuration);
        
        // Allow the reporter to decrypt aggregated data for this location
        // This enables anyone who has submitted a report to decrypt aggregated statistics
        FHE.allow(data.totalExceededCount, msg.sender);
        FHE.allow(data.totalDuration, msg.sender);
    }

    /**
     * @notice Get the number of records for a user
     * @param user User address
     * @return count Number of records
     */
    function getUserRecordCount(address user) external view returns (uint256) {
        return userRecords[user].length;
    }

    /**
     * @notice Get a specific record for a user (returns encrypted handles)
     * @param user User address
     * @param index Record index
     * @return timestamp Report timestamp
     * @return locationId Location ID
     * @return reporter Reporter address
     */
    function getUserRecord(address user, uint256 index)
        external
        view
        returns (
            uint256 timestamp,
            uint256 locationId,
            address reporter
        )
    {
        require(index < userRecords[user].length, "Index out of bounds");
        NoiseRecord storage record = userRecords[user][index];
        return (record.timestamp, record.locationId, record.reporter);
    }

    /**
     * @notice Get encrypted decibel value for a user's record
     * @param user User address
     * @param index Record index
     * @return Encrypted decibel handle
     */
    function getUserRecordDecibel(address user, uint256 index)
        external
        view
        returns (euint16)
    {
        require(index < userRecords[user].length, "Index out of bounds");
        return userRecords[user][index].decibel;
    }

    /**
     * @notice Get encrypted duration value for a user's record
     * @param user User address
     * @param index Record index
     * @return Encrypted duration handle
     */
    function getUserRecordDuration(address user, uint256 index)
        external
        view
        returns (euint16)
    {
        require(index < userRecords[user].length, "Index out of bounds");
        return userRecords[user][index].duration;
    }

    /**
     * @notice Get location summary (plaintext data only)
     * @param locationId Location identifier
     * @return totalReports Total number of reports
     * @return lastUpdated Last update timestamp
     * @return alertCount Number of alerts triggered
     */
    function getLocationSummary(uint256 locationId)
        external
        view
        returns (
            uint256 totalReports,
            uint256 lastUpdated,
            uint256 alertCount
        )
    {
        AggregatedData storage data = locationData[locationId];
        return (data.totalReports, data.lastUpdated, data.alertCount);
    }

    /**
     * @notice Get encrypted aggregated data for a location (public, anyone can access handles)
     * @param locationId Location identifier
     * @return totalExceededCount Encrypted exceeded count
     * @return totalDuration Encrypted total duration
     */
    function getLocationAggregatedDataPublic(uint256 locationId)
        external
        view
        returns (euint16 totalExceededCount, euint16 totalDuration)
    {
        AggregatedData storage data = locationData[locationId];
        require(data.totalReports > 0, "Location has no data");
        return (data.totalExceededCount, data.totalDuration);
    }

    /**
     * @notice Get encrypted aggregated data for a location (managers only, for backward compatibility)
     * @param locationId Location identifier
     * @return totalExceededCount Encrypted exceeded count
     * @return totalDuration Encrypted total duration
     */
    function getLocationAggregatedData(uint256 locationId)
        external
        view
        onlyAuthorized
        returns (euint16 totalExceededCount, euint16 totalDuration)
    {
        AggregatedData storage data = locationData[locationId];
        return (data.totalExceededCount, data.totalDuration);
    }

    /**
     * @notice Get all registered location IDs
     * @return Array of location IDs
     */
    function getAllLocationIds() external view returns (uint256[] memory) {
        return locationIds;
    }

    /**
     * @notice Get total number of locations
     * @return count Number of locations
     */
    function getLocationCount() external view returns (uint256) {
        return locationIds.length;
    }

    /**
     * @notice Authorize a manager to access aggregated data
     * @param manager Manager address
     * @param locationId Location to grant access for
     */
    function allowManager(address manager, uint256 locationId) external onlyOwner {
        require(manager != address(0), "Invalid manager address");
        require(locationRegistered[locationId], "Location not registered");

        authorizedManagers[manager] = true;

        // Grant decryption permission for aggregated data
        AggregatedData storage data = locationData[locationId];
        FHE.allow(data.totalExceededCount, manager);
        FHE.allow(data.totalDuration, manager);

        emit ManagerAuthorizationChanged(manager, true);
    }

    /**
     * @notice Authorize a manager for all existing locations
     * @param manager Manager address
     */
    function allowManagerAllLocations(address manager) external onlyOwner {
        require(manager != address(0), "Invalid manager address");

        authorizedManagers[manager] = true;

        // Grant access to all registered locations
        for (uint256 i = 0; i < locationIds.length; i++) {
            uint256 locationId = locationIds[i];
            AggregatedData storage data = locationData[locationId];
            FHE.allow(data.totalExceededCount, manager);
            FHE.allow(data.totalDuration, manager);
        }

        emit ManagerAuthorizationChanged(manager, true);
    }

    /**
     * @notice Revoke manager authorization
     * @param manager Manager address to revoke
     */
    function revokeManager(address manager) external onlyOwner {
        authorizedManagers[manager] = false;
        emit ManagerAuthorizationChanged(manager, false);
    }

    /**
     * @notice Allow a user to authorize themselves to decrypt aggregated data for a location
     * @dev This function allows any user who has submitted at least one report for a location
     *      to grant themselves decryption permission for that location's aggregated data.
     *      Users who haven't submitted reports cannot use this function.
     * @param locationId Location identifier
     */
    function authorizeSelfForLocation(uint256 locationId) external {
        require(locationRegistered[locationId], "Location not registered");
        
        // Check if user has submitted at least one report for this location
        bool hasReport = false;
        NoiseRecord[] storage records = userRecords[msg.sender];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].locationId == locationId) {
                hasReport = true;
                break;
            }
        }
        require(hasReport, "No reports submitted for this location");
        
        // Grant decryption permission for aggregated data
        AggregatedData storage data = locationData[locationId];
        FHE.allow(data.totalExceededCount, msg.sender);
        FHE.allow(data.totalDuration, msg.sender);
    }

    /**
     * @notice Transfer contract ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}
