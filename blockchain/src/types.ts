/**
 * Blockchain types for Semantest
 */

/**
 * Supported blockchain networks
 */
export type BlockchainNetwork = 'ethereum' | 'polygon' | 'arbitrum' | 'localhost';

/**
 * Test certification configuration
 */
export interface CertificationConfig {
  network: BlockchainNetwork;
  contractAddress: string;
  privateKey?: string;
  ipfsUrl?: string;
  gasLimit?: number;
  maxGasPrice?: bigint;
}

/**
 * Test verification configuration
 */
export interface VerificationConfig {
  network: BlockchainNetwork;
  contractAddress: string;
  privateKey?: string;
  recordVerification?: boolean;
  verifierAddress?: string;
}

/**
 * Test metadata for certification
 */
export interface TestMetadata {
  environment: string;
  version: string;
  framework?: string;
  duration: number;
  passed: boolean;
  assertions?: number;
  failures?: number;
  coverage?: number;
  tags?: string[];
}

/**
 * Test certificate on blockchain
 */
export interface TestCertificate {
  id: string;
  testId: string;
  executionId: string;
  resultHash: string;
  ipfsHash?: string;
  timestamp: Date;
  certifier: string;
  isValid: boolean;
  verificationCount: number;
  blockNumber?: number;
}

/**
 * Certification result
 */
export interface CertificationResult {
  success: boolean;
  certificateId?: string;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  ipfsHash?: string;
  resultHash?: string;
  timestamp?: Date;
  error?: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  isValid: boolean;
  certificateId?: string;
  testId?: string;
  executionId?: string;
  resultHash?: string;
  timestamp?: Date;
  certifier?: string;
  verificationCount?: number;
  blockNumber?: number;
  reason?: string;
  ipfsData?: any;
}

/**
 * Verification report
 */
export interface VerificationReport {
  timestamp: Date;
  totalCertificates: number;
  validCertificates: number;
  invalidCertificates: number;
  verifications: VerificationResult[];
  summary: {
    successRate: number;
    averageAge: number; // hours
    certifiers: Set<string>;
    blockRange: {
      min: number;
      max: number;
    };
  };
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  name: string;
  blockExplorer?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Audit trail entry
 */
export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: 'certified' | 'verified' | 'revoked' | 'updated';
  actor: string;
  certificateId: string;
  details?: any;
  transactionHash: string;
  blockNumber: number;
}

/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  requireMultipleVerifications?: boolean;
  minimumVerifications?: number;
  requiredVerifiers?: string[];
  retentionPeriod?: number; // days
  encryptSensitiveData?: boolean;
}

/**
 * Gas estimation
 */
export interface GasEstimation {
  certification: {
    single: bigint;
    batch: bigint;
  };
  verification: bigint;
  retrieval: bigint;
}

/**
 * Blockchain statistics
 */
export interface BlockchainStats {
  totalCertificates: number;
  totalVerifications: number;
  uniqueCertifiers: number;
  uniqueVerifiers: number;
  averageGasUsed: bigint;
  totalGasSpent: bigint;
  mostActiveCertifier: string;
  mostActiveVerifier: string;
}