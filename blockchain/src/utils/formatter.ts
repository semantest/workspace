import { TestCertificate, CertificationResult, VerificationResult } from '../types';

/**
 * Format certificate for display
 */
export function formatCertificate(cert: TestCertificate): string {
  return `
Certificate ID: ${cert.id}
Test ID: ${cert.testId}
Execution ID: ${cert.executionId}
Timestamp: ${cert.timestamp.toISOString()}
Certifier: ${cert.certifier}
Status: ${cert.isValid ? 'Valid' : 'Revoked'}
Verifications: ${cert.verificationCount}
Result Hash: ${cert.resultHash}
IPFS: ${cert.ipfsHash || 'N/A'}
`.trim();
}

/**
 * Format certification result
 */
export function formatCertificationResult(result: CertificationResult): string {
  if (!result.success) {
    return `Certification Failed: ${result.error}`;
  }
  
  return `
Certification Successful!
Certificate ID: ${result.certificateId}
Transaction: ${result.transactionHash}
Block: ${result.blockNumber}
Gas Used: ${result.gasUsed}
IPFS: ${result.ipfsHash}
Timestamp: ${result.timestamp?.toISOString()}
`.trim();
}

/**
 * Format verification result
 */
export function formatVerificationResult(result: VerificationResult): string {
  if (!result.isValid) {
    return `Verification Failed: ${result.reason}`;
  }
  
  return `
Verification Successful!
Certificate ID: ${result.certificateId}
Test ID: ${result.testId}
Valid: ✓
Timestamp: ${result.timestamp?.toISOString()}
Certifier: ${result.certifier}
Verifications: ${result.verificationCount}
`.trim();
}

/**
 * Format transaction link
 */
export function formatTransactionLink(
  txHash: string,
  network: string
): string {
  const explorers: Record<string, string> = {
    ethereum: 'https://etherscan.io/tx/',
    polygon: 'https://polygonscan.com/tx/',
    arbitrum: 'https://arbiscan.io/tx/',
    localhost: 'http://localhost:8545/tx/'
  };
  
  const baseUrl = explorers[network] || explorers.polygon;
  return `${baseUrl}${txHash}`;
}

/**
 * Format address
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 42) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format IPFS link
 */
export function formatIPFSLink(ipfsHash: string): string {
  if (!ipfsHash) return '';
  
  const hash = ipfsHash.replace('ipfs://', '');
  return `https://ipfs.io/ipfs/${hash}`;
}