// Core
export { TestCertifier } from './core/test-certifier';
export { TestVerifier } from './core/test-verifier';

// Types
export * from './types';

// Smart Contracts ABIs (when compiled)
// export { TestRegistryABI } from './abi/TestRegistry';
// export { VerificationABI } from './abi/Verification';

// Utilities
export { calculateGasCost } from './utils/gas-calculator';
export { formatCertificate } from './utils/formatter';

/**
 * Create test certifier
 */
import { CertificationConfig } from './types';
import { TestCertifier } from './core/test-certifier';

export function createTestCertifier(config: CertificationConfig): TestCertifier {
  return new TestCertifier(config);
}

/**
 * Create test verifier
 */
import { VerificationConfig } from './types';
import { TestVerifier } from './core/test-verifier';

export function createTestVerifier(config: VerificationConfig): TestVerifier {
  return new TestVerifier(config);
}

/**
 * Default configurations
 */
export const defaultConfigs = {
  polygon: {
    network: 'polygon' as const,
    contractAddress: '0x...', // Would be deployed address
    ipfsUrl: 'https://ipfs.infura.io:5001'
  },
  ethereum: {
    network: 'ethereum' as const,
    contractAddress: '0x...', // Would be deployed address
    ipfsUrl: 'https://ipfs.infura.io:5001'
  }
};