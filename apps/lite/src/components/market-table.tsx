import { AccrualPosition, Market, type MarketId } from "@morpho-org/blue-sdk";
import { AvatarStack } from "@morpho-org/uikit/components/avatar-stack";
import { SafeLink } from "@morpho-org/uikit/components/safe-link";
import { Avatar, AvatarFallback, AvatarImage } from "@morpho-org/uikit/components/shadcn/avatar";
import { Button } from "@morpho-org/uikit/components/shadcn/button";
import { Input } from "@morpho-org/uikit/components/shadcn/input";
import { Popover, PopoverContent, PopoverTrigger } from "@morpho-org/uikit/components/shadcn/popover";
import { Sheet, SheetTrigger } from "@morpho-org/uikit/components/shadcn/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@morpho-org/uikit/components/shadcn/table";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@morpho-org/uikit/components/shadcn/tooltip";
import { formatLtv, formatBalanceWithSymbol, Token, abbreviateAddress } from "@morpho-org/uikit/lib/utils";
import { blo } from "blo";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  // X
} from "lucide-react";
import { useMemo, useState } from "react";
import { type Chain, type Hex, type Address } from "viem";

import { MarketSheetContent } from "@/components/market-sheet-content";
import { ApyTableCell } from "@/components/table-cells/apy-table-cell";
import { type useMerklOpportunities } from "@/hooks/use-merkl-opportunities";
import { SHARED_LIQUIDITY_DOCUMENTATION } from "@/lib/constants";
import { type DisplayableCurators } from "@/lib/curators";

function TokenTableCell({ address, symbol, imageSrc, chain }: Token & { chain: Chain | undefined }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hover:bg-secondary flex w-min items-center gap-2 rounded-sm p-2">
            <Avatar className="size-4 rounded-full">
              <AvatarImage src={imageSrc} alt="Avatar" />
              <AvatarFallback delayMs={1000}>
                <img src={blo(address)} />
              </AvatarFallback>
            </Avatar>
            {symbol ?? "－"}
          </div>
        </TooltipTrigger>
        <TooltipContent
          className="text-primary-foreground rounded-3xl p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <p>
              Address: <code>{abbreviateAddress(address)}</code>
            </p>
            {chain?.blockExplorers?.default.url && (
              <a
                href={`${chain.blockExplorers.default.url}/address/${address}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function HealthTableCell({
  market,
  position,
  collateralToken,
  loanToken,
}: {
  market: Market;
  position?: AccrualPosition;
  collateralToken: Token;
  loanToken: Token;
}) {
  const ltvText = position?.accrueInterest().ltv !== undefined ? formatLtv(position.accrueInterest().ltv ?? 0n) : "－";
  const lltvText = formatLtv(market.params.lltv);
  const lPriceText =
    typeof position?.liquidationPrice === "bigint" &&
    loanToken.decimals !== undefined &&
    collateralToken.decimals !== undefined
      ? formatBalanceWithSymbol(position.liquidationPrice, 36 + loanToken.decimals - collateralToken.decimals, "", 5)
      : "－";
  const priceDropText =
    typeof position?.priceVariationToLiquidationPrice === "bigint"
      ? formatLtv(position.priceVariationToLiquidationPrice)
      : "－";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hover:bg-secondary ml-[-8px] flex w-min items-center gap-2 rounded-sm p-2">
            {ltvText} / {lltvText}
          </div>
        </TooltipTrigger>
        <TooltipContent
          className="text-primary-foreground rounded-3xl p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex w-[240px] flex-col gap-3">
            <div className="flex justify-between">
              LTV / Liq. LTV
              <span>
                {ltvText} / {lltvText}
              </span>
            </div>
            <div className="flex justify-between">
              Liq. Price {`(${collateralToken.symbol} / ${loanToken.symbol})`}
              <span>{lPriceText}</span>
            </div>
            <div className="flex justify-between">
              Price Drop To Liq.
              <span>{priceDropText}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function VaultsTableCell({
  token,
  vaults,
  chain,
}: {
  token: Token;
  vaults: { name: string; address: Address; totalAssets: bigint; curators: DisplayableCurators }[];
  chain: Chain | undefined;
}) {
  return (
    <AvatarStack
      items={vaults.map((vault) => {
        const hoverCardContent = (
          <TooltipContent
            className="text-primary-foreground rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-[260px] flex-col gap-4">
              <div className="flex items-center justify-between font-light">
                <span>Vault</span>
                {vault.name}
              </div>
              <div className="flex items-center justify-between font-light">
                <span>Address</span>
                <a
                  className="hover:bg-secondary flex gap-1 rounded-sm p-1"
                  href={chain?.blockExplorers?.default.url.concat(`/address/${vault.address}`)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {abbreviateAddress(vault.address)}
                  <ExternalLink className="size-4" />
                </a>
              </div>
              <div className="flex items-center justify-between font-light">
                <span>Curators</span>
                <div className="flex items-end gap-1">
                  {Object.values(vault.curators)
                    .filter((curator) => curator.shouldAlwaysShow)
                    .map((curator) => (
                      <SafeLink
                        key={curator.name}
                        className="hover:bg-secondary flex gap-1 rounded-sm p-1"
                        href={curator.url ?? ""}
                      >
                        {curator.imageSrc && (
                          <Avatar className="size-4 rounded-full">
                            <AvatarImage src={curator.imageSrc} alt="Loan Token" />
                          </Avatar>
                        )}
                        {curator.name}
                      </SafeLink>
                    ))}
                </div>
              </div>
              {token.decimals !== undefined && (
                <div className="flex items-center justify-between font-light">
                  Total Supply
                  <div className="flex items-end gap-1">
                    <Avatar className="size-4 rounded-full">
                      <AvatarImage src={token.imageSrc} alt="Loan Token" />
                    </Avatar>
                    {formatBalanceWithSymbol(vault.totalAssets, token.decimals, token.symbol, 5, true)}
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        );

        let logoUrl: string | null = null;
        for (const name in vault.curators) {
          const curator = vault.curators[name];
          if (curator.imageSrc == null) continue;

          logoUrl = curator.imageSrc;
          if (curator.roles.some((role) => role.name === "Owner")) {
            break;
          }
        }

        if (!logoUrl) console.log(logoUrl, vault);

        return { logoUrl: logoUrl ?? "", hoverCardContent };
      })}
      align="left"
      maxItems={5}
    />
  );
}

function IdTableCell({ marketId }: { marketId: MarketId }) {
  const [recentlyCopiedText, setRecentlyCopiedText] = useState("");

  return (
    <TooltipProvider>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <button
            className="hover:bg-secondary ml-[-8px] flex w-min cursor-pointer items-center gap-2 rounded-sm p-2"
            onClick={(event) => {
              event.stopPropagation();
              void navigator.clipboard.writeText(marketId);

              setRecentlyCopiedText(marketId);
              setTimeout(() => setRecentlyCopiedText(""), 500);
            }}
          >
            {marketId === recentlyCopiedText ? (
              <CheckCheck className="size-4 text-green-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          className="text-primary-foreground rounded-3xl p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="wrap-anywhere flex max-w-[200px] items-center gap-1">
            <p>
              Market ID: <code>{marketId}</code>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Filter Popover Component
function FilterPopover({
  label,
  options,
  selectedValues,
  onSelectionChange,
}: {
  label: string;
  options: { value: Address; label: string }[];
  selectedValues: Set<Address>;
  onSelectionChange: (values: Set<Address>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(
    () => options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase())),
    [options, searchTerm],
  );

  const toggleSelection = (value: Address) => {
    const newSelection = new Set(selectedValues);
    if (newSelection.has(value)) {
      newSelection.delete(value);
    } else {
      newSelection.add(value);
    }
    onSelectionChange(newSelection);
  };

  const clearAll = () => {
    onSelectionChange(new Set());
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondaryTab"
          size="sm"
          className="hover:bg-secondary flex h-8 items-center gap-1 rounded-full px-3 text-xs font-light"
        >
          {label}
          {selectedValues.size > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
              {selectedValues.size}
            </span>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-col">
          {/* Header */}
          {/* <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter by {label}</span>
              <button onClick={() => setIsOpen(false)} className="hover:bg-secondary rounded p-1">
                <X className="size-4" />
              </button>
            </div>
          </div> */}

          {/* Search Input */}
          <div className="p-3">
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="text-secondary-foreground py-4 text-center text-xs">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleSelection(option.value)}
                  className="hover:bg-secondary flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selectedValues.has(option.value) ? "border-blue-500 bg-blue-500" : "border-gray-400"
                    }`}
                  >
                    {selectedValues.has(option.value) && <CheckCheck className="size-3 text-white" />}
                  </div>
                  <span>{option.label}</span>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" onClick={clearAll} className="w-full text-xs">
              Clear All
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MarketTable({
  chain,
  markets,
  tokens,
  marketVaults,
  borrowingRewards,
  refetchPositions,
}: {
  chain: Chain | undefined;
  markets: Market[];
  tokens: Map<Address, Token>;
  marketVaults: Map<Hex, { name: string; address: Address; totalAssets: bigint; curators: DisplayableCurators }[]>;
  borrowingRewards: ReturnType<typeof useMerklOpportunities>;
  refetchPositions: () => void;
}) {
  // Filter states
  const [selectedCollaterals, setSelectedCollaterals] = useState<Set<Address>>(new Set());
  const [selectedLoans, setSelectedLoans] = useState<Set<Address>>(new Set());

  // Sort state - use single state object for all sortable columns
  type SortColumn = "liquidity" | "rate" | "utilization" | "totalSupply";
  type SortState = {
    column: SortColumn | null;
    order: "asc" | "desc";
  };
  const [sortState, setSortState] = useState<SortState | null>(null);

  // Helper function to handle sort toggle
  const handleSort = (column: SortColumn) => {
    setSortState((prev) => {
      // If clicking the same column, cycle through: desc -> asc -> null
      if (prev?.column === column) {
        if (prev.order === "desc") return { column, order: "asc" };
        return null; // Clear sort
      }
      // If clicking a different column, start with desc
      return { column, order: "desc" };
    });
  };

  // Get unique tokens for filters
  const collateralOptions = useMemo(() => {
    const uniqueTokens = new Map<Address, string>();
    markets.forEach((market) => {
      const token = tokens.get(market.params.collateralToken);
      if (token?.symbol) {
        uniqueTokens.set(market.params.collateralToken, token.symbol);
      }
    });
    return Array.from(uniqueTokens.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [markets, tokens]);

  const loanOptions = useMemo(() => {
    const uniqueTokens = new Map<Address, string>();
    markets.forEach((market) => {
      const token = tokens.get(market.params.loanToken);
      if (token?.symbol) {
        uniqueTokens.set(market.params.loanToken, token.symbol);
      }
    });
    return Array.from(uniqueTokens.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [markets, tokens]);

  // Apply filters and sorting
  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = [...markets];

    // Apply collateral filter
    if (selectedCollaterals.size > 0) {
      filtered = filtered.filter((market) => selectedCollaterals.has(market.params.collateralToken));
    }

    // Apply loan filter
    if (selectedLoans.size > 0) {
      filtered = filtered.filter((market) => selectedLoans.has(market.params.loanToken));
    }

    // Apply sorting based on current sort state
    if (sortState) {
      filtered.sort((a, b) => {
        let valueA: bigint;
        let valueB: bigint;

        // Get values based on sort column
        switch (sortState.column) {
          case "liquidity":
            valueA = a.liquidity;
            valueB = b.liquidity;
            break;
          case "rate":
            valueA = a.borrowApy;
            valueB = b.borrowApy;
            break;
          case "utilization":
            valueA = a.utilization;
            valueB = b.utilization;
            break;
          case "totalSupply":
            valueA = a.totalSupplyAssets;
            valueB = b.totalSupplyAssets;
            break;
          default:
            return 0;
        }

        // Compare and return based on sort order
        const comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        return sortState.order === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [markets, selectedCollaterals, selectedLoans, sortState]);

  return (
    <Table className="border-separate border-spacing-y-3">
      <TableHeader className="bg-primary">
        <TableRow>
          <TableHead className="text-secondary-foreground rounded-l-lg pl-4 text-xs font-light">
            <FilterPopover
              label="Collateral"
              options={collateralOptions}
              selectedValues={selectedCollaterals}
              onSelectionChange={setSelectedCollaterals}
            />
          </TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">
            <FilterPopover
              label="Loan"
              options={loanOptions}
              selectedValues={selectedLoans}
              onSelectionChange={setSelectedLoans}
            />
          </TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">LLTV</TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSort("liquidity")}
                className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
              >
                <span>Liquidity</span>
                {sortState?.column !== "liquidity" && <ArrowUpDown className="size-3 opacity-50" />}
                {sortState?.column === "liquidity" && sortState.order === "asc" && <ArrowUp className="size-3" />}
                {sortState?.column === "liquidity" && sortState.order === "desc" && <ArrowDown className="size-3" />}
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent className="text-primary-foreground max-w-56 rounded-3xl p-4 text-xs shadow-2xl">
                    This value will be smaller than that of the full app. It doesn't include{" "}
                    <a
                      className="underline"
                      href={SHARED_LIQUIDITY_DOCUMENTATION}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      shared liquidity
                    </a>{" "}
                    which could be reallocated to this market after you borrow.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">
            <button
              onClick={() => handleSort("rate")}
              className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
            >
              <span>Rate</span>
              {sortState?.column !== "rate" && <ArrowUpDown className="size-3 opacity-50" />}
              {sortState?.column === "rate" && sortState.order === "asc" && <ArrowUp className="size-3" />}
              {sortState?.column === "rate" && sortState.order === "desc" && <ArrowDown className="size-3" />}
            </button>
          </TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">
            <button
              onClick={() => handleSort("utilization")}
              className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
            >
              <span>Utilization</span>
              {sortState?.column !== "utilization" && <ArrowUpDown className="size-3 opacity-50" />}
              {sortState?.column === "utilization" && sortState.order === "asc" && <ArrowUp className="size-3" />}
              {sortState?.column === "utilization" && sortState.order === "desc" && <ArrowDown className="size-3" />}
            </button>
          </TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">
            <button
              onClick={() => handleSort("totalSupply")}
              className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
            >
              <span>Total Market Size</span>
              {sortState?.column !== "totalSupply" && <ArrowUpDown className="size-3 opacity-50" />}
              {sortState?.column === "totalSupply" && sortState.order === "asc" && <ArrowUp className="size-3" />}
              {sortState?.column === "totalSupply" && sortState.order === "desc" && <ArrowDown className="size-3" />}
            </button>
          </TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">Vault Listing</TableHead>
          <TableHead className="text-secondary-foreground rounded-r-lg text-xs font-light">ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAndSortedMarkets.map((market) => (
          <Sheet
            key={market.id}
            onOpenChange={(isOpen) => {
              // Refetch positions on sidesheet close, since user may have sent txns to modify one
              if (!isOpen) void refetchPositions();
            }}
          >
            <SheetTrigger asChild>
              <TableRow className="bg-primary hover:bg-secondary">
                <TableCell className="rounded-l-lg py-3">
                  <TokenTableCell {...tokens.get(market.params.collateralToken)!} chain={chain} />
                </TableCell>
                <TableCell>
                  <TokenTableCell {...tokens.get(market.params.loanToken)!} chain={chain} />
                </TableCell>
                <TableCell>{formatLtv(market.params.lltv)}</TableCell>
                <TableCell>
                  {tokens.get(market.params.loanToken)?.decimals !== undefined
                    ? formatBalanceWithSymbol(
                        market.liquidity,
                        tokens.get(market.params.loanToken)!.decimals!,
                        tokens.get(market.params.loanToken)!.symbol,
                        5,
                        true,
                      )
                    : "－"}
                </TableCell>
                <TableCell>
                  <ApyTableCell
                    nativeApy={market.borrowApy}
                    rewards={borrowingRewards.get(market.id) ?? []}
                    mode="owe"
                  />
                </TableCell>
                <TableCell>{formatLtv(market.utilization)}</TableCell>
                <TableCell>
                  {tokens.get(market.params.loanToken)?.decimals !== undefined
                    ? formatBalanceWithSymbol(
                        market.totalSupplyAssets,
                        tokens.get(market.params.loanToken)!.decimals!,
                        tokens.get(market.params.loanToken)!.symbol,
                        5,
                        true,
                      )
                    : "－"}
                </TableCell>
                <TableCell>
                  <VaultsTableCell
                    token={tokens.get(market.params.loanToken)!}
                    vaults={marketVaults.get(market.params.id) ?? []}
                    chain={chain}
                  />
                </TableCell>
                <TableCell className="rounded-r-lg">
                  <IdTableCell marketId={market.id} />
                </TableCell>
              </TableRow>
            </SheetTrigger>
            <MarketSheetContent marketId={market.id} marketParams={market.params} imarket={market} tokens={tokens} />
          </Sheet>
        ))}
      </TableBody>
    </Table>
  );
}

export function MarketPositionTable({
  chain,
  markets,
  tokens,
  positions,
  borrowingRewards,
  refetchPositions,
}: {
  chain: Chain | undefined;
  markets: Market[];
  tokens: Map<Address, Token>;
  positions: Map<Hex, AccrualPosition> | undefined;
  borrowingRewards: ReturnType<typeof useMerklOpportunities>;
  refetchPositions: () => void;
}) {
  return (
    <Table className="border-separate border-spacing-y-3">
      <TableHeader className="bg-primary">
        <TableRow>
          <TableHead className="text-secondary-foreground rounded-l-lg pl-4 text-xs font-light">Collateral</TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">Loan</TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">Rate</TableHead>
          <TableHead className="text-secondary-foreground text-xs font-light">Health</TableHead>
          <TableHead className="text-secondary-foreground rounded-r-lg text-xs font-light">ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {markets.map((market) => {
          const collateralToken = tokens.get(market.params.collateralToken)!;
          const loanToken = tokens.get(market.params.loanToken)!;
          const position = positions?.get(market.id);

          let collateralText = collateralToken.symbol;
          if (position && collateralToken.decimals !== undefined) {
            collateralText = formatBalanceWithSymbol(
              position.collateral,
              collateralToken.decimals,
              collateralToken.symbol,
              5,
            );
          }
          let loanText = loanToken.symbol;
          if (position && loanToken.decimals !== undefined) {
            loanText = formatBalanceWithSymbol(position.borrowAssets, loanToken.decimals, loanToken.symbol, 5);
          }

          return (
            <Sheet
              key={market.id}
              onOpenChange={(isOpen) => {
                // Refetch positions on sidesheet close, since user may have sent txns to modify one
                if (!isOpen) void refetchPositions();
              }}
            >
              <SheetTrigger asChild>
                <TableRow className="bg-primary hover:bg-secondary">
                  <TableCell className="rounded-l-lg py-3">
                    <TokenTableCell {...collateralToken} symbol={collateralText} chain={chain} />
                  </TableCell>
                  <TableCell>
                    <TokenTableCell {...loanToken} symbol={loanText} chain={chain} />
                  </TableCell>
                  <TableCell>
                    <ApyTableCell
                      nativeApy={market.borrowApy}
                      rewards={borrowingRewards.get(market.id) ?? []}
                      mode="owe"
                    />
                  </TableCell>
                  <TableCell>
                    <HealthTableCell
                      market={market}
                      position={position}
                      loanToken={loanToken}
                      collateralToken={collateralToken}
                    />
                  </TableCell>
                  <TableCell className="rounded-r-lg">
                    <IdTableCell marketId={market.id} />
                  </TableCell>
                </TableRow>
              </SheetTrigger>
              <MarketSheetContent marketId={market.id} marketParams={market.params} imarket={market} tokens={tokens} />
            </Sheet>
          );
        })}
      </TableBody>
    </Table>
  );
}
