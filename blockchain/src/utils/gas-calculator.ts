/**
 * Gas cost calculator for blockchain operations
 */

interface GasPrice {
  standard: bigint;
  fast: bigint;
  instant: bigint;
}

interface GasCost {
  wei: bigint;
  gwei: string;
  ether: string;
  usd?: number;
}

/**
 * Calculate gas cost for operation
 */
export function calculateGasCost(
  gasUsed: bigint,
  gasPrice: bigint,
  ethPrice?: number
): GasCost {
  const costWei = gasUsed * gasPrice;
  const costGwei = costWei / BigInt(1e9);
  const costEther = costWei / BigInt(1e18);
  
  const result: GasCost = {
    wei: costWei,
    gwei: costGwei.toString(),
    ether: formatEther(costEther)
  };
  
  if (ethPrice) {
    result.usd = parseFloat(formatEther(costEther)) * ethPrice;
  }
  
  return result;
}

/**
 * Estimate gas for different operations
 */
export function estimateGas(operation: string): bigint {
  const estimates: Record<string, bigint> = {
    certifyTest: BigInt(150000),
    batchCertifyTests: BigInt(100000), // per test
    verifyTest: BigInt(50000),
    getCertificate: BigInt(0), // view function
    revokeCertificate: BigInt(80000)
  };
  
  return estimates[operation] || BigInt(100000);
}

/**
 * Get current gas prices (mock)
 */
export async function getGasPrices(network: string): Promise<GasPrice> {
  // Would fetch from gas oracle
  const prices: Record<string, GasPrice> = {
    ethereum: {
      standard: BigInt(30e9), // 30 gwei
      fast: BigInt(50e9), // 50 gwei
      instant: BigInt(100e9) // 100 gwei
    },
    polygon: {
      standard: BigInt(30e9), // 30 gwei
      fast: BigInt(50e9), // 50 gwei
      instant: BigInt(100e9) // 100 gwei
    },
    arbitrum: {
      standard: BigInt(0.1e9), // 0.1 gwei
      fast: BigInt(0.5e9), // 0.5 gwei
      instant: BigInt(1e9) // 1 gwei
    }
  };
  
  return prices[network] || prices.polygon;
}

/**
 * Calculate batch operation savings
 */
export function calculateBatchSavings(
  singleGas: bigint,
  batchGas: bigint,
  count: number
): {
  totalSaved: bigint;
  percentSaved: number;
  perItemSaved: bigint;
} {
  const singleTotal = singleGas * BigInt(count);
  const totalSaved = singleTotal - batchGas;
  const percentSaved = Number((totalSaved * BigInt(100)) / singleTotal);
  const perItemSaved = totalSaved / BigInt(count);
  
  return {
    totalSaved,
    percentSaved,
    perItemSaved
  };
}

/**
 * Format ether value
 */
function formatEther(value: bigint): string {
  const str = value.toString();
  const paddedStr = str.padStart(19, '0');
  const integerPart = paddedStr.slice(0, -18) || '0';
  const decimalPart = paddedStr.slice(-18).replace(/0+$/, '');
  
  if (decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }
  return integerPart;
}