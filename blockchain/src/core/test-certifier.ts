import { Entity, DomainEvent } from '@semantest/core';
import { ethers } from 'ethers';
import { 
  CertificationConfig,
  TestCertificate,
  CertificationResult,
  NetworkConfig,
  TestMetadata
} from '../types';

/**
 * Test certification service
 */
export class TestCertifier extends Entity<TestCertifier> {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;
  private ipfsClient: any; // IPFS client
  
  constructor(private config: CertificationConfig) {
    super();
    this.initializeBlockchain();
  }
  
  /**
   * Certify test results on blockchain
   */
  async certifyTest(
    testId: string,
    executionId: string,
    results: any,
    metadata: TestMetadata
  ): Promise<CertificationResult> {
    try {
      // Prepare data
      const resultHash = this.hashResults(results);
      const ipfsHash = await this.uploadToIPFS(results);
      
      // Call smart contract
      const tx = await this.contract.certifyTest(
        testId,
        executionId,
        resultHash,
        ipfsHash,
        {
          environment: metadata.environment,
          version: metadata.version,
          framework: metadata.framework || 'semantest',
          duration: metadata.duration,
          passed: metadata.passed,
          assertions: metadata.assertions || 0,
          failures: metadata.failures || 0
        }
      );
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Extract certificate ID from events
      const event = receipt.events?.find(
        (e: any) => e.event === 'TestCertified'
      );
      const certificateId = event?.args?.certificateId;
      
      // Record domain event
      this.addDomainEvent(new TestCertified({
        correlationId: this.generateCorrelationId(),
        certificateId: certificateId.toString(),
        testId,
        executionId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date()
      }));
      
      return {
        success: true,
        certificateId: certificateId.toString(),
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        ipfsHash,
        resultHash,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Certification failed:', error);
      
      this.addDomainEvent(new CertificationFailed({
        correlationId: this.generateCorrelationId(),
        testId,
        executionId,
        error: error.message,
        timestamp: new Date()
      }));
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Batch certify multiple tests
   */
  async batchCertifyTests(
    tests: Array<{
      testId: string;
      executionId: string;
      results: any;
      metadata: TestMetadata;
    }>
  ): Promise<CertificationResult[]> {
    const testIds: string[] = [];
    const executionIds: string[] = [];
    const resultHashes: string[] = [];
    const ipfsHashes: string[] = [];
    const metadatas: any[] = [];
    
    // Prepare batch data
    for (const test of tests) {
      testIds.push(test.testId);
      executionIds.push(test.executionId);
      resultHashes.push(this.hashResults(test.results));
      ipfsHashes.push(await this.uploadToIPFS(test.results));
      metadatas.push({
        environment: test.metadata.environment,
        version: test.metadata.version,
        framework: test.metadata.framework || 'semantest',
        duration: test.metadata.duration,
        passed: test.metadata.passed,
        assertions: test.metadata.assertions || 0,
        failures: test.metadata.failures || 0
      });
    }
    
    try {
      // Batch certify
      const tx = await this.contract.batchCertifyTests(
        testIds,
        executionIds,
        resultHashes,
        ipfsHashes,
        metadatas
      );
      
      const receipt = await tx.wait();
      
      // Extract certificate IDs
      const certificateIds = receipt.events
        ?.filter((e: any) => e.event === 'TestCertified')
        .map((e: any) => e.args.certificateId.toString());
      
      return tests.map((test, index) => ({
        success: true,
        certificateId: certificateIds[index],
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: (receipt.gasUsed / BigInt(tests.length)).toString(),
        ipfsHash: ipfsHashes[index],
        resultHash: resultHashes[index],
        timestamp: new Date()
      }));
      
    } catch (error) {
      return tests.map(() => ({
        success: false,
        error: error.message
      }));
    }
  }
  
  /**
   * Get certificate details
   */
  async getCertificate(certificateId: string): Promise<TestCertificate | null> {
    try {
      const cert = await this.contract.getCertificate(certificateId);
      
      return {
        id: certificateId,
        testId: cert.testId,
        executionId: cert.executionId,
        resultHash: cert.resultHash,
        ipfsHash: cert.ipfsHash,
        timestamp: new Date(cert.timestamp.toNumber() * 1000),
        certifier: cert.certifier,
        isValid: cert.isValid,
        verificationCount: cert.verificationCount.toNumber()
      };
    } catch (error) {
      console.error('Failed to get certificate:', error);
      return null;
    }
  }
  
  /**
   * Get test history
   */
  async getTestHistory(testId: string): Promise<TestCertificate[]> {
    try {
      const certificateIds = await this.contract.getTestHistory(testId);
      const certificates: TestCertificate[] = [];
      
      for (const id of certificateIds) {
        const cert = await this.getCertificate(id.toString());
        if (cert) {
          certificates.push(cert);
        }
      }
      
      return certificates.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
    } catch (error) {
      console.error('Failed to get test history:', error);
      return [];
    }
  }
  
  /**
   * Verify result integrity
   */
  async verifyResultIntegrity(
    certificateId: string,
    resultData: any
  ): Promise<boolean> {
    try {
      return await this.contract.verifyResultIntegrity(
        certificateId,
        JSON.stringify(resultData)
      );
    } catch (error) {
      console.error('Failed to verify integrity:', error);
      return false;
    }
  }
  
  /**
   * Initialize blockchain connection
   */
  private async initializeBlockchain(): Promise<void> {
    const network = this.getNetworkConfig(this.config.network);
    
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    // Initialize signer
    if (this.config.privateKey) {
      this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
    } else {
      throw new Error('Private key required for certification');
    }
    
    // Initialize contract
    const abi = await this.loadContractABI();
    this.contract = new ethers.Contract(
      this.config.contractAddress,
      abi,
      this.signer
    );
    
    // Initialize IPFS
    // this.ipfsClient = create({ url: this.config.ipfsUrl });
  }
  
  /**
   * Get network configuration
   */
  private getNetworkConfig(network: string): NetworkConfig {
    const networks: Record<string, NetworkConfig> = {
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
   * Hash test results
   */
  private hashResults(results: any): string {
    const data = JSON.stringify(results);
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }
  
  /**
   * Upload results to IPFS
   */
  private async uploadToIPFS(results: any): Promise<string> {
    // Simplified - would use actual IPFS client
    const data = JSON.stringify(results);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(data));
    return `ipfs://${hash}`;
  }
  
  /**
   * Load contract ABI
   */
  private async loadContractABI(): Promise<any[]> {
    // Would load from compiled contract
    return [
      "function certifyTest(string,string,bytes32,string,tuple(string,string,string,uint256,bool,uint256,uint256)) returns (uint256)",
      "function getCertificate(uint256) view returns (string,string,bytes32,string,uint256,address,bool,uint256)",
      "function getTestHistory(string) view returns (uint256[])",
      "function verifyResultIntegrity(uint256,string) view returns (bool)",
      "function batchCertifyTests(string[],string[],bytes32[],string[],tuple(string,string,string,uint256,bool,uint256,uint256)[]) returns (uint256[])",
      "event TestCertified(uint256 indexed certificateId, string indexed testId, string executionId, bytes32 resultHash, address certifier, uint256 timestamp)"
    ];
  }
  
  getId(): string {
    return 'test-certifier';
  }
}

// Domain Events
export class TestCertified extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      certificateId: string;
      testId: string;
      executionId: string;
      transactionHash: string;
      blockNumber: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class CertificationFailed extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      testId: string;
      executionId: string;
      error: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}