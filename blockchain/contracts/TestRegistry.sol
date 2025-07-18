// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TestRegistry
 * @dev Immutable test result certification on blockchain
 */
contract TestRegistry is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;
    
    // Roles
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // Certificate counter
    Counters.Counter private _certificateIds;
    
    // Test certificate structure
    struct TestCertificate {
        uint256 id;
        string testId;
        string executionId;
        bytes32 resultHash;
        string ipfsHash;
        uint256 timestamp;
        uint256 blockNumber;
        address certifier;
        bool isValid;
        mapping(address => bool) verifiers;
        uint256 verificationCount;
    }
    
    // Test metadata
    struct TestMetadata {
        string environment;
        string version;
        string framework;
        uint256 duration;
        bool passed;
        uint256 assertions;
        uint256 failures;
    }
    
    // Mappings
    mapping(uint256 => TestCertificate) public certificates;
    mapping(string => uint256[]) public testHistory;
    mapping(uint256 => TestMetadata) public metadata;
    mapping(address => uint256[]) public certifierHistory;
    
    // Events
    event TestCertified(
        uint256 indexed certificateId,
        string indexed testId,
        string executionId,
        bytes32 resultHash,
        address certifier,
        uint256 timestamp
    );
    
    event TestVerified(
        uint256 indexed certificateId,
        address indexed verifier,
        uint256 timestamp
    );
    
    event CertificateRevoked(
        uint256 indexed certificateId,
        address indexed revoker,
        string reason,
        uint256 timestamp
    );
    
    event MetadataUpdated(
        uint256 indexed certificateId,
        string ipfsHash
    );
    
    // Constructor
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CERTIFIER_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }
    
    /**
     * @dev Certify test results
     */
    function certifyTest(
        string memory testId,
        string memory executionId,
        bytes32 resultHash,
        string memory ipfsHash,
        TestMetadata memory testMetadata
    ) external onlyRole(CERTIFIER_ROLE) nonReentrant returns (uint256) {
        _certificateIds.increment();
        uint256 certificateId = _certificateIds.current();
        
        TestCertificate storage cert = certificates[certificateId];
        cert.id = certificateId;
        cert.testId = testId;
        cert.executionId = executionId;
        cert.resultHash = resultHash;
        cert.ipfsHash = ipfsHash;
        cert.timestamp = block.timestamp;
        cert.blockNumber = block.number;
        cert.certifier = msg.sender;
        cert.isValid = true;
        cert.verificationCount = 0;
        
        // Store metadata
        metadata[certificateId] = testMetadata;
        
        // Update histories
        testHistory[testId].push(certificateId);
        certifierHistory[msg.sender].push(certificateId);
        
        emit TestCertified(
            certificateId,
            testId,
            executionId,
            resultHash,
            msg.sender,
            block.timestamp
        );
        
        return certificateId;
    }
    
    /**
     * @dev Verify a test certificate
     */
    function verifyTest(uint256 certificateId) 
        external 
        nonReentrant 
        returns (bool) 
    {
        TestCertificate storage cert = certificates[certificateId];
        require(cert.id != 0, "Certificate does not exist");
        require(cert.isValid, "Certificate has been revoked");
        require(!cert.verifiers[msg.sender], "Already verified by this address");
        
        cert.verifiers[msg.sender] = true;
        cert.verificationCount++;
        
        emit TestVerified(certificateId, msg.sender, block.timestamp);
        
        return true;
    }
    
    /**
     * @dev Revoke a certificate
     */
    function revokeCertificate(uint256 certificateId, string memory reason) 
        external 
        onlyRole(AUDITOR_ROLE) 
    {
        TestCertificate storage cert = certificates[certificateId];
        require(cert.id != 0, "Certificate does not exist");
        require(cert.isValid, "Certificate already revoked");
        
        cert.isValid = false;
        
        emit CertificateRevoked(
            certificateId,
            msg.sender,
            reason,
            block.timestamp
        );
    }
    
    /**
     * @dev Update IPFS hash for additional data
     */
    function updateIPFSHash(uint256 certificateId, string memory ipfsHash) 
        external 
        onlyRole(CERTIFIER_ROLE) 
    {
        TestCertificate storage cert = certificates[certificateId];
        require(cert.id != 0, "Certificate does not exist");
        require(cert.certifier == msg.sender, "Only original certifier can update");
        
        cert.ipfsHash = ipfsHash;
        
        emit MetadataUpdated(certificateId, ipfsHash);
    }
    
    /**
     * @dev Get certificate details
     */
    function getCertificate(uint256 certificateId) 
        external 
        view 
        returns (
            string memory testId,
            string memory executionId,
            bytes32 resultHash,
            string memory ipfsHash,
            uint256 timestamp,
            address certifier,
            bool isValid,
            uint256 verificationCount
        ) 
    {
        TestCertificate storage cert = certificates[certificateId];
        require(cert.id != 0, "Certificate does not exist");
        
        return (
            cert.testId,
            cert.executionId,
            cert.resultHash,
            cert.ipfsHash,
            cert.timestamp,
            cert.certifier,
            cert.isValid,
            cert.verificationCount
        );
    }
    
    /**
     * @dev Get test history
     */
    function getTestHistory(string memory testId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return testHistory[testId];
    }
    
    /**
     * @dev Check if address has verified a certificate
     */
    function hasVerified(uint256 certificateId, address verifier) 
        external 
        view 
        returns (bool) 
    {
        return certificates[certificateId].verifiers[verifier];
    }
    
    /**
     * @dev Get certifier history
     */
    function getCertifierHistory(address certifier) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return certifierHistory[certifier];
    }
    
    /**
     * @dev Batch certify multiple tests
     */
    function batchCertifyTests(
        string[] memory testIds,
        string[] memory executionIds,
        bytes32[] memory resultHashes,
        string[] memory ipfsHashes,
        TestMetadata[] memory testMetadatas
    ) external onlyRole(CERTIFIER_ROLE) nonReentrant returns (uint256[] memory) {
        require(
            testIds.length == executionIds.length &&
            testIds.length == resultHashes.length &&
            testIds.length == ipfsHashes.length &&
            testIds.length == testMetadatas.length,
            "Array lengths must match"
        );
        
        uint256[] memory certificateIds = new uint256[](testIds.length);
        
        for (uint256 i = 0; i < testIds.length; i++) {
            certificateIds[i] = this.certifyTest(
                testIds[i],
                executionIds[i],
                resultHashes[i],
                ipfsHashes[i],
                testMetadatas[i]
            );
        }
        
        return certificateIds;
    }
    
    /**
     * @dev Verify result integrity
     */
    function verifyResultIntegrity(
        uint256 certificateId,
        string memory resultData
    ) external view returns (bool) {
        TestCertificate storage cert = certificates[certificateId];
        require(cert.id != 0, "Certificate does not exist");
        
        bytes32 computedHash = keccak256(abi.encodePacked(resultData));
        return computedHash == cert.resultHash;
    }
}