/**
 * Set of market IDs that should be excluded from display.
 * Add market IDs here to hide them from the market list.
 */
export const BLOCKED_MARKET_IDS = new Set<`0x${string}`>([]);

/**
 * Set of collateral token addresses that should be excluded from display.
 * Markets using these collateral tokens will be hidden from the market list.
 */
export const BLOCKED_COLLATERAL_ADDRESSES = new Set<`0x${string}`>([
  // sdeUSD
  "0x5C5b196aBE0d54485975D1Ec29617D42D9198326",
]);
