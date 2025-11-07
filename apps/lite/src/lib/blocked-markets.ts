/**
 * Set of market IDs that should be excluded from display.
 * Add market IDs here to hide them from the market list.
 */
export const BLOCKED_MARKET_IDS = new Set<`0x${string}`>([
  // sdeUSD https://app.morpho.org/ethereum/market/0x0f9563442d64ab3bd3bcb27058db0b0d4046a4c46f0acd811dacae9551d2b129
  "0x0f9563442d64ab3bd3bcb27058db0b0d4046a4c46f0acd811dacae9551d2b129",
]);
