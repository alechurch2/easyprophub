// ============================================================
// Lot Size Calculator — Modular, extensible
// Risk: 0.2% per trade | Target: 0.6% per trade
// ============================================================

export const RISK_PERCENT = 0.002; // 0.2%
export const TARGET_PERCENT = 0.006; // 0.6%

export const ACCOUNT_PRESETS = [
  { label: "50k", value: 50000 },
  { label: "100k", value: 100000 },
  { label: "200k", value: 200000 },
];

// Pip value configurations per asset class
// pipValue = value of 1 pip for 1 standard lot (100,000 units) in USD
interface AssetConfig {
  pipSize: number;       // e.g. 0.0001 for forex majors, 0.01 for JPY pairs
  pipValuePerLot: number; // USD value of 1 pip per 1.0 lot
  tickSize?: number;      // for indices/crypto
}

const ASSET_CONFIGS: Record<string, AssetConfig> = {
  "EUR/USD": { pipSize: 0.0001, pipValuePerLot: 10 },
  "GBP/USD": { pipSize: 0.0001, pipValuePerLot: 10 },
  "USD/JPY": { pipSize: 0.01, pipValuePerLot: 6.5 },
  "XAU/USD": { pipSize: 0.10, pipValuePerLot: 10, tickSize: 0.01 },  // 1 pip = $0.10, lot = 100oz → $10/pip
  "BTC/USD": { pipSize: 1, pipValuePerLot: 1, tickSize: 1 },
  "ETH/USD": { pipSize: 0.01, pipValuePerLot: 0.01, tickSize: 0.01 },
  "US30":    { pipSize: 1, pipValuePerLot: 1, tickSize: 1 },
  "NAS100":  { pipSize: 1, pipValuePerLot: 1, tickSize: 1 },
  "SPX500":  { pipSize: 0.1, pipValuePerLot: 1, tickSize: 0.1 },
};

export function getAssetConfig(asset: string): AssetConfig | null {
  return ASSET_CONFIGS[asset] || null;
}

/**
 * Calculate monetary risk for a trade
 */
export function calculateRiskAmount(accountSize: number, riskPercent = RISK_PERCENT): number {
  return accountSize * riskPercent;
}

/**
 * Calculate target profit amount
 */
export function calculateTargetAmount(accountSize: number, targetPercent = TARGET_PERCENT): number {
  return accountSize * targetPercent;
}

/**
 * Calculate lot size based on account, SL distance, and asset
 * @param accountSize - Account balance
 * @param slPips - Stop loss distance in pips
 * @param asset - Trading pair/instrument
 * @returns lot size (rounded to 2 decimals) or null if insufficient data
 */
export function calculateLotSize(
  accountSize: number,
  slPips: number,
  asset: string,
  riskPercent = RISK_PERCENT
): number | null {
  const config = getAssetConfig(asset);
  if (!config || slPips <= 0 || accountSize <= 0) return null;

  const riskAmount = calculateRiskAmount(accountSize, riskPercent);
  const lotSize = riskAmount / (slPips * config.pipValuePerLot);

  return Math.round(lotSize * 100) / 100;
}

/**
 * Calculate theoretical profit from a trade
 */
export function calculateTheoreticalProfit(
  lotSize: number,
  tpPips: number,
  asset: string
): number | null {
  const config = getAssetConfig(asset);
  if (!config || tpPips <= 0) return null;
  return Math.round(lotSize * tpPips * config.pipValuePerLot * 100) / 100;
}

/**
 * Calculate R:R ratio
 */
export function calculateRR(slPips: number, tpPips: number): number | null {
  if (slPips <= 0 || tpPips <= 0) return null;
  return Math.round((tpPips / slPips) * 100) / 100;
}

export interface LotCalculationResult {
  lotSize: number;
  riskAmount: number;
  targetAmount: number;
  theoreticalProfit: number | null;
  rrRatio: number | null;
  formula: string;
}

/**
 * Full lot size calculation with all details
 */
export function fullLotCalculation(
  accountSize: number,
  slPips: number,
  tpPips: number,
  asset: string
): LotCalculationResult | null {
  const config = getAssetConfig(asset);
  if (!config || slPips <= 0 || accountSize <= 0) return null;

  const riskAmount = calculateRiskAmount(accountSize);
  const targetAmount = calculateTargetAmount(accountSize);
  const lotSize = calculateLotSize(accountSize, slPips, asset);
  if (!lotSize) return null;

  const theoreticalProfit = calculateTheoreticalProfit(lotSize, tpPips, asset);
  const rrRatio = calculateRR(slPips, tpPips);

  const formula = `Rischio ${(RISK_PERCENT * 100).toFixed(1)}% di ${accountSize.toLocaleString()}$ = ${riskAmount.toFixed(2)}$ | SL ${slPips} pip × ${config.pipValuePerLot}$/pip/lot → Lotto: ${lotSize}`;

  return { lotSize, riskAmount, targetAmount, theoreticalProfit, rrRatio, formula };
}
