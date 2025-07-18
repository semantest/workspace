import { Entity, DomainEvent } from '@semantest/core';
import { ethers } from 'ethers';
import { 
  VerificationConfig,
  VerificationResult,
  TestCertificate,
  VerificationReport
} from '../types';

/**
 * Test verification service
 */
export class TestVerifier extends Entity<TestVerifier> {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private ipfsClient: any;
  
  constructor(private config: VerificationConfig) {
    super();
    this.initializeBlockchain();
  }
  
  /**
   * Verify test certificate
   */
  async verifyTest(certificateId: string): Promise<VerificationResult> {
    try {
      // Get certificate from blockchain
      const cert = await this.contract.getCertificate(certificateId);
      
      if (!cert || cert.testId === '') {
        return {
          isValid: false,
          reason: 'Certificate not found',
          timestamp: new Date()
        };
      }
      
      // Check if revoked
      if (!cert.isValid) {
        return {
          isValid: false,
          reason: 'Certificate has been revoked',
          timestamp: new Date()
        };
      }
      
      // Verify IPFS data if available
      let ipfsValid = true;
      let ipfsData = null;
      
      if (cert.ipfsHash && cert.ipfsHash.startsWith('ipfs://')) {
        ipfsData = await this.verifyIPFSData(cert.ipfsHash);
        ipfsValid = ipfsData !== null;
      }
      
      // Create verification result
      const result: VerificationResult = {
        isValid: true,
        certificateId,
        testId: cert.testId,
        executionId: cert.executionId,
        resultHash: cert.resultHash,
        timestamp: new Date(cert.timestamp.toNumber() * 1000),
        certifier: cert.certifier,
        verificationCount: cert.verificationCount.toNumber(),
        blockNumber: await this.provider.getBlockNumber(),
        ipfsData
      };
      
      // Record verification on blockchain (optional)
      if (this.config.recordVerification && this.config.privateKey) {
        await this.recordVerification(certificateId);
      }
      
      // Record domain event
      this.addDomainEvent(new TestVerified({
        correlationId: this.generateCorrelationId(),
        certificateId,
        verifier: this.config.verifierAddress || 'anonymous',
        timestamp: new Date()
      }));
      
      return result;
      
    } catch (error) {
      console.error('Verification failed:', error);
      
      return {
        isValid: false,
        reason: `Verification error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Batch verify multiple certificates
   */
  async batchVerifyTests(
    certificateIds: string[]
  ): Promise<VerificationResult[]> {
    const results = await Promise.all(
      certificateIds.map(id => this.verifyTest(id))
    );
    
    return results;
  }
  
  /**
   * Generate verification report
   */
  async generateVerificationReport(
    certificateIds: string[]
  ): Promise<VerificationReport> {
    const verifications = await this.batchVerifyTests(certificateIds);
    
    const report: VerificationReport = {
      timestamp: new Date(),
      totalCertificates: certificateIds.length,
      validCertificates: verifications.filter(v => v.isValid).length,
      invalidCertificates: verifications.filter(v => !v.isValid).length,
      verifications,
      summary: {
        successRate: 0,
        averageAge: 0,
        certifiers: new Set(),
        blockRange: { min: Infinity, max: 0 }
      }
    };
    
    // Calculate summary statistics
    let totalAge = 0;
    let validCount = 0;
    
    for (const verification of verifications) {
      if (verification.isValid && verification.timestamp) {
        validCount++;
        totalAge += Date.now() - verification.timestamp.getTime();
        
        if (verification.certifier) {
          report.summary.certifiers.add(verification.certifier);
        }
        
        if (verification.blockNumber) {
          report.summary.blockRange.min = Math.min(
            report.summary.blockRange.min,
            verification.blockNumber
          );
          report.summary.blockRange.max = Math.max(
            report.summary.blockRange.max,
            verification.blockNumber
          );
        }
      }
    }
    
    report.summary.successRate = 
      (report.validCertificates / report.totalCertificates) * 100;
    report.summary.averageAge = 
      validCount > 0 ? totalAge / validCount / 1000 / 60 / 60 : 0; // hours
    
    return report;
  }
  
  /**
   * Verify chain of certificates
   */
  async verifyChain(testId: string): Promise<boolean> {
    try {
      // Get all certificates for test
      const certificateIds = await this.contract.getTestHistory(testId);
      
      if (certificateIds.length === 0) {
        return false;
      }
      
      // Verify each certificate
      const verifications = await this.batchVerifyTests(
        certificateIds.map((id: any) => id.toString())
      );
      
      // Check if all are valid
      return verifications.every(v => v.isValid);
      
    } catch (error) {
      console.error('Chain verification failed:', error);
      return false;
    }
  }
  
  /**
   * Check if address has verified certificate
   */
  async hasVerified(
    certificateId: string,
    verifierAddress: string
  ): Promise<boolean> {
    try {
      return await this.contract.hasVerified(certificateId, verifierAddress);
    } catch (error) {
      console.error('Failed to check verification:', error);
      return false;
    }
  }
  
  /**
   * Get verifier statistics
   */
  async getVerifierStats(verifierAddress: string): Promise<any> {
    // Would implement verifier statistics tracking
    return {
      address: verifierAddress,
      totalVerifications: 0,
      uniqueCertificates: 0,
      firstVerification: null,
      lastVerification: null
    };
  }
  
  /**
   * Initialize blockchain connection
   */
  private async initializeBlockchain(): Promise<void> {
    // Initialize provider
    const network = this.getNetworkConfig(this.config.network);
    this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    // Initialize contract
    const abi = await this.loadContractABI();
    this.contract = new ethers.Contract(
      this.config.contractAddress,
      abi,
      this.provider
    );
    
    // Initialize signer if private key provided
    if (this.config.privateKey) {
      const signer = new ethers.Wallet(this.config.privateKey, this.provider);
      this.contract = this.contract.connect(signer);
    }
  }
  
  /**
   * Record verification on blockchain
   */
  private async recordVerification(certificateId: string): Promise<void> {
    try {
      const tx = await this.contract.verifyTest(certificateId);
      await tx.wait();
    } catch (error) {
      console.error('Failed to record verification:', error);
    }
  }
  
  /**
   * Verify IPFS data
   */
  private async verifyIPFSData(ipfsHash: string): Promise<any> {
    try {
      // Would fetch and verify from IPFS
      return { verified: true, hash: ipfsHash };
    } catch (error) {
      console.error('IPFS verification failed:', error);
      return null;
    }
  }
  
  /**
   * Get network configuration
   */
  private getNetworkConfig(network: string): any {
    const networks: Record<string, any> = {
      ethereum: {
        chainId: 1,
        rpcUrl: 'https://mainnet.infura.io/v3/' + process.env.INFURA_KEY,
        name: 'Ethereum Mainnet'
      },
      polygon: {
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        name: 'Polygon Mainnet'
      },
      arbitrum: {
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        name: 'Arbitrum One'
      },
      localhost: {
        chainId: 31337,
        rpcUrl: 'http://localhost:8545',
        name: 'Localhost'
      }
    };
    
    return networks[network] || networks.polygon;
  }
  
  /**
   * Load contract ABI
   */
  private async loadContractABI(): Promise<any[]> {
    // Would load from compiled contract
    return [
      "function getCertificate(uint256) view returns (string,string,bytes32,string,uint256,address,bool,uint256)",
      "function getTestHistory(string) view returns (uint256[])",
      "function hasVerified(uint256,address) view returns (bool)",
      "function verifyTest(uint256) returns (bool)",
      "event TestVerified(uint256 indexed certificateId, address indexed verifier, uint256 timestamp)"
    ];
  }
  
  getId(): string {
    return 'test-verifier';
  }
}

// Domain Events
export class TestVerified extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      certificateId: string;
      verifier: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}