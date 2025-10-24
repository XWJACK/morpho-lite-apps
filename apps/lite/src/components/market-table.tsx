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
  Eye,
  EyeOff,
  GripVertical,
  Info,
  Settings2,
  // X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { type Chain, type Hex, type Address, formatUnits } from "viem";

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
  tokens,
  selectedValues,
  onSelectionChange,
}: {
  label: string;
  tokens: Token[];
  selectedValues: Set<Address>;
  onSelectionChange: (values: Set<Address>) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(
    () => tokens.filter((opt) => opt.symbol?.toLowerCase().includes(searchTerm.toLowerCase())),
    [tokens, searchTerm],
  );

  const toggleSelection = (address: Address) => {
    const newSelection = new Set(selectedValues);
    if (newSelection.has(address)) {
      newSelection.delete(address);
    } else {
      newSelection.add(address);
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
                  key={option.address}
                  onClick={() => toggleSelection(option.address)}
                  className="hover:bg-secondary flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selectedValues.has(option.address) ? "border-blue-500 bg-blue-500" : "border-gray-400"
                    }`}
                  >
                    {selectedValues.has(option.address) && <CheckCheck className="size-3 text-white" />}
                  </div>
                  <Avatar className="size-4 rounded-full">
                    <AvatarImage src={option.imageSrc} alt={option.symbol} />
                    <AvatarFallback delayMs={1000}>
                      <img src={blo(option.address)} />
                    </AvatarFallback>
                  </Avatar>
                  <span>{option.symbol}</span>
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

// ID Filter Popover Component
function IdFilterPopover({
  label,
  filterValue,
  onFilterChange,
}: {
  label: string;
  filterValue: string;
  onFilterChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(filterValue);

  useEffect(() => {
    setInputValue(filterValue);
  }, [filterValue]);

  const handleApply = () => {
    onFilterChange(inputValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    onFilterChange("");
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
          {filterValue && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
              ✓
            </span>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex flex-col">
          {/* Input */}
          <div className="p-3">
            <Input
              placeholder="Enter Market ID..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApply();
                }
              }}
              className="font-mono text-xs"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-2 border-t p-2">
            <Button variant="ghost" size="sm" onClick={handleClear} className="flex-1 text-xs">
              Clear
            </Button>
            <Button variant="default" size="sm" onClick={handleApply} className="flex-1 text-xs">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Column Configuration Types
type ColumnId =
  | "collateral"
  | "loan"
  | "totalSupply"
  | "liquidity"
  | "rate"
  | "utilization"
  | "lltv"
  | "vaultListing"
  | "id";

type ColumnConfig = {
  id: ColumnId;
  label: string;
  visible: boolean;
  sortable: boolean;
};

// Column Configuration Manager Component
function ColumnConfigManager({
  columns,
  onColumnsChange,
}: {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const toggleColumnVisibility = (columnId: ColumnId) => {
    onColumnsChange(columns.map((col) => (col.id === columnId ? { ...col, visible: !col.visible } : col)));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);
    setDraggedIndex(index);
    onColumnsChange(newColumns);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondaryTab"
          size="sm"
          className="hover:bg-secondary flex h-8 items-center gap-1 rounded-full px-3 text-xs font-light"
        >
          <Settings2 className="size-3" />
          <span>Customize</span>
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
            {visibleCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex flex-col">
          {/* Header */}
          <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Customize Columns</span>
              <span className="text-secondary-foreground text-xs">
                {visibleCount} of {columns.length} visible
              </span>
            </div>
          </div>

          {/* Columns List */}
          <div className="max-h-96 overflow-y-auto p-2">
            {columns.map((column, index) => (
              <div
                key={column.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`hover:bg-secondary flex items-center gap-2 rounded px-2 py-2 transition-colors ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <GripVertical className="text-secondary-foreground size-4 cursor-grab active:cursor-grabbing" />
                <button onClick={() => toggleColumnVisibility(column.id)} className="flex flex-1 items-center gap-2">
                  {column.visible ? (
                    <Eye className="size-4 text-blue-500" />
                  ) : (
                    <EyeOff className="text-secondary-foreground size-4" />
                  )}
                  <span className={`text-sm ${column.visible ? "" : "text-secondary-foreground"}`}>{column.label}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onColumnsChange(columns.map((col) => ({ ...col, visible: true })));
              }}
              className="w-full text-xs"
            >
              Show All Columns
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Default column configurations (defined outside component to avoid recreating on each render)
const DEFAULT_COLUMN_CONFIGS: ColumnConfig[] = [
  { id: "collateral", label: "Collateral", visible: true, sortable: false },
  { id: "loan", label: "Loan", visible: true, sortable: false },
  { id: "totalSupply", label: "Total Market Size", visible: true, sortable: true },
  { id: "liquidity", label: "Liquidity", visible: true, sortable: true },
  { id: "rate", label: "Supply APY", visible: true, sortable: true },
  { id: "utilization", label: "Utilization", visible: true, sortable: true },
  { id: "lltv", label: "LLTV", visible: true, sortable: false },
  { id: "vaultListing", label: "Trusted By", visible: true, sortable: false },
  { id: "id", label: "ID", visible: true, sortable: false },
];

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
  const [searchParams, setSearchParams] = useSearchParams();

  // Use a ref to track if we're syncing from URL to avoid infinite loops
  const isSyncingFromURL = useRef(false);
  // Use a ref to track the previous chainId to detect actual changes
  const prevChainIdRef = useRef<number | undefined>(undefined);

  // Sort state - use single state object for all sortable columns
  type SortColumn = "liquidity" | "rate" | "utilization" | "totalSupply";
  type SortState = {
    column: SortColumn | null;
    order: "asc" | "desc";
  };

  // State initialization
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(DEFAULT_COLUMN_CONFIGS);
  const [selectedCollaterals, setSelectedCollaterals] = useState<Set<Address>>(new Set());
  const [selectedLoans, setSelectedLoans] = useState<Set<Address>>(new Set());
  const [idFilter, setIdFilter] = useState<string>("");
  const [sortState, setSortState] = useState<SortState | null>(null);

  // Sync state FROM URL params when searchParams change
  useEffect(() => {
    isSyncingFromURL.current = true;

    // Parse collateral filters
    const collateralParam = searchParams.get("collateral");
    if (collateralParam) {
      const addresses = collateralParam.split(",").filter((x: string) => x) as Address[];
      setSelectedCollaterals(new Set(addresses));
    } else {
      setSelectedCollaterals(new Set());
    }

    // Parse loan filters
    const loanParam = searchParams.get("loan");
    if (loanParam) {
      const addresses = loanParam.split(",").filter((x: string) => x) as Address[];
      setSelectedLoans(new Set(addresses));
    } else {
      setSelectedLoans(new Set());
    }

    // Parse ID filter
    const idParam = searchParams.get("id");
    setIdFilter(idParam || "");

    // Parse sort state
    const sortColumn = searchParams.get("sortBy") as SortColumn | null;
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;
    console.log("🔍 Parsing URL params - sortBy:", sortColumn, "sortOrder:", sortOrder);
    if (sortColumn && sortOrder && ["liquidity", "rate", "utilization", "totalSupply"].includes(sortColumn)) {
      console.log("✅ Setting sort state:", { column: sortColumn, order: sortOrder });
      setSortState({ column: sortColumn, order: sortOrder });
    } else {
      console.log("❌ Sort state not set - column or order missing or invalid");
      setSortState(null);
    }

    // Parse column visibility
    const columnsParam = searchParams.get("columns");
    if (columnsParam) {
      const visibleColumnIds = columnsParam.split(",").filter((x: string) => x);
      setColumnConfigs(
        DEFAULT_COLUMN_CONFIGS.map((col) => ({
          ...col,
          visible: visibleColumnIds.includes(col.id),
        })),
      );
    } else {
      setColumnConfigs(DEFAULT_COLUMN_CONFIGS);
    }

    // Reset the sync flag after a small delay
    setTimeout(() => {
      isSyncingFromURL.current = false;
    }, 0);
  }, [searchParams]);

  // Update URL when filters or sort change (but not when syncing FROM URL)
  useEffect(() => {
    // Skip if we're currently syncing from URL to avoid infinite loop
    if (isSyncingFromURL.current) {
      return;
    }

    const params = new URLSearchParams();

    // Add collateral filter to URL
    if (selectedCollaterals.size > 0) {
      params.set("collateral", Array.from(selectedCollaterals).join(","));
    }

    // Add loan filter to URL
    if (selectedLoans.size > 0) {
      params.set("loan", Array.from(selectedLoans).join(","));
    }

    // Add ID filter to URL
    if (idFilter.trim()) {
      params.set("id", idFilter.trim());
    }

    // Add sort state to URL
    if (sortState) {
      params.set("sortBy", sortState.column!);
      params.set("sortOrder", sortState.order);
    }

    // Add column visibility to URL (only if some columns are hidden)
    const visibleCols = columnConfigs.filter((col) => col.visible);
    if (visibleCols.length < DEFAULT_COLUMN_CONFIGS.length) {
      params.set("columns", visibleCols.map((col) => col.id).join(","));
    }

    // Update URL without triggering a page reload
    setSearchParams(params, { replace: true });
  }, [selectedCollaterals, selectedLoans, idFilter, sortState, columnConfigs, setSearchParams]);

  // Reset filter and sort states when chain changes (but not on initial mount)
  useEffect(() => {
    const currentChainId = chain?.id;

    // Only reset if chain actually changed (not on initial mount from undefined to a value)
    if (prevChainIdRef.current !== undefined && prevChainIdRef.current !== currentChainId) {
      setSelectedCollaterals(new Set());
      setSelectedLoans(new Set());
      setIdFilter("");
      setSortState(null);
    }

    // Update the ref to track the current chainId
    prevChainIdRef.current = currentChainId;
  }, [chain?.id]);

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
  const collateralTokens = useMemo(() => {
    const uniqueTokens = new Map<Address, Token>();
    markets.forEach((market) => {
      const token = tokens.get(market.params.collateralToken);
      if (token?.symbol) {
        uniqueTokens.set(market.params.collateralToken, token);
      }
    });
    return Array.from(uniqueTokens.values()).sort((a, b) => (a.symbol ?? "").localeCompare(b.symbol ?? ""));
  }, [markets, tokens]);

  const loanTokens = useMemo(() => {
    const uniqueTokens = new Map<Address, Token>();
    markets.forEach((market) => {
      const token = tokens.get(market.params.loanToken);
      if (token?.symbol) {
        uniqueTokens.set(market.params.loanToken, token);
      }
    });
    return Array.from(uniqueTokens.values()).sort((a, b) => (a.symbol ?? "").localeCompare(b.symbol ?? ""));
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

    // Apply ID filter
    if (idFilter.trim() !== "") {
      const filterLower = idFilter.toLowerCase().trim();
      filtered = filtered.filter((market) => market.id.toLowerCase().includes(filterLower));
    }

    // Apply sorting based on current sort state
    // console.log(
    //   "🔄 filteredAndSortedMarkets recalculating - sortState:",
    //   sortState,
    //   "markets count:",
    //   markets.length,
    //   "filtered count:",
    //   filtered.length,
    // );
    if (sortState) {
      // console.log("📊 Applying sort:", sortState.column, sortState.order);
      filtered.sort((a, b) => {
        let valueA: bigint;
        let valueB: bigint;

        const loanTokenA = tokens.get(a.params.loanToken)!;
        const loanTokenB = tokens.get(b.params.loanToken)!;

        // Get values based on sort column
        switch (sortState.column) {
          case "liquidity": {
            const valueALiquidity = parseFloat(formatUnits(a.liquidity, loanTokenA.decimals!));
            const valueBLiquidity = parseFloat(formatUnits(b.liquidity, loanTokenB.decimals!));
            const comparison_liquidity =
              valueALiquidity > valueBLiquidity ? 1 : valueALiquidity < valueBLiquidity ? -1 : 0;
            return sortState.order === "asc" ? comparison_liquidity : -comparison_liquidity;
          }
          case "rate":
            valueA = a.getSupplyApy();
            valueB = b.getSupplyApy();
            break;
          case "utilization":
            valueA = a.utilization;
            valueB = b.utilization;
            break;
          case "totalSupply": {
            const valueATotalSupply = parseFloat(formatUnits(a.totalSupplyAssets, loanTokenA.decimals!));
            const valueBTotalSupply = parseFloat(formatUnits(b.totalSupplyAssets, loanTokenB.decimals!));
            const comparison_totalSupply =
              valueATotalSupply > valueBTotalSupply ? 1 : valueATotalSupply < valueBTotalSupply ? -1 : 0;
            return sortState.order === "asc" ? comparison_totalSupply : -comparison_totalSupply;
          }
          default:
            return 0;
        }

        // Compare and return based on sort order
        const comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        return sortState.order === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [markets, selectedCollaterals, selectedLoans, idFilter, sortState, tokens]);

  // Render table header for a column
  const renderColumnHeader = (columnId: ColumnId, index: number, visibleColumns: ColumnConfig[]) => {
    const isFirst = index === 0;
    const isLast = index === visibleColumns.length - 1;
    const baseClass = `text-secondary-foreground text-xs font-light ${isFirst ? "rounded-l-lg pl-4" : ""} ${isLast ? "rounded-r-lg" : ""}`;

    switch (columnId) {
      case "collateral":
        return (
          <TableHead key={columnId} className={baseClass}>
            <FilterPopover
              label={visibleColumns[index].label}
              tokens={collateralTokens}
              selectedValues={selectedCollaterals}
              onSelectionChange={setSelectedCollaterals}
            />
          </TableHead>
        );
      case "loan":
        return (
          <TableHead key={columnId} className={baseClass}>
            <FilterPopover
              label={visibleColumns[index].label}
              tokens={loanTokens}
              selectedValues={selectedLoans}
              onSelectionChange={setSelectedLoans}
            />
          </TableHead>
        );
      case "totalSupply":
        return (
          <TableHead key={columnId} className={baseClass}>
            <button
              onClick={() => handleSort("totalSupply")}
              className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
            >
              <span>{visibleColumns[index].label}</span>
              {sortState?.column !== "totalSupply" && <ArrowUpDown className="size-3 opacity-50" />}
              {sortState?.column === "totalSupply" && sortState.order === "asc" && <ArrowUp className="size-3" />}
              {sortState?.column === "totalSupply" && sortState.order === "desc" && <ArrowDown className="size-3" />}
            </button>
          </TableHead>
        );
      case "liquidity":
        return (
          <TableHead key={columnId} className={baseClass}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSort("liquidity")}
                className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
              >
                <span>{visibleColumns[index].label}</span>
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
        );
      case "rate":
        return (
          <TableHead key={columnId} className={baseClass}>
            <button
              onClick={() => handleSort("rate")}
              className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
            >
              <span>{visibleColumns[index].label}</span>
              {sortState?.column !== "rate" && <ArrowUpDown className="size-3 opacity-50" />}
              {sortState?.column === "rate" && sortState.order === "asc" && <ArrowUp className="size-3" />}
              {sortState?.column === "rate" && sortState.order === "desc" && <ArrowDown className="size-3" />}
            </button>
          </TableHead>
        );
      case "utilization":
        return (
          <TableHead key={columnId} className={baseClass}>
            <button
              onClick={() => handleSort("utilization")}
              className="hover:bg-secondary flex items-center gap-1 rounded px-2 py-1 transition-colors"
            >
              <span>{visibleColumns[index].label}</span>
              {sortState?.column !== "utilization" && <ArrowUpDown className="size-3 opacity-50" />}
              {sortState?.column === "utilization" && sortState.order === "asc" && <ArrowUp className="size-3" />}
              {sortState?.column === "utilization" && sortState.order === "desc" && <ArrowDown className="size-3" />}
            </button>
          </TableHead>
        );
      case "lltv":
        return (
          <TableHead key={columnId} className={baseClass}>
            {visibleColumns[index].label}
          </TableHead>
        );
      case "vaultListing":
        return (
          <TableHead key={columnId} className={baseClass}>
            {visibleColumns[index].label}
          </TableHead>
        );
      case "id":
        return (
          <TableHead key={columnId} className={baseClass}>
            <IdFilterPopover label={visibleColumns[index].label} filterValue={idFilter} onFilterChange={setIdFilter} />
          </TableHead>
        );
      default:
        return null;
    }
  };

  // Render table cell for a column
  const renderColumnCell = (columnId: ColumnId, market: Market, index: number, visibleColumns: ColumnConfig[]) => {
    const isFirst = index === 0;
    const isLast = index === visibleColumns.length - 1;
    const baseClass = `${isFirst ? "rounded-l-lg py-3" : ""} ${isLast ? "rounded-r-lg" : ""}`;

    switch (columnId) {
      case "collateral":
        return (
          <TableCell key={columnId} className={baseClass}>
            <TokenTableCell {...tokens.get(market.params.collateralToken)!} chain={chain} />
          </TableCell>
        );
      case "loan":
        return (
          <TableCell key={columnId} className={baseClass}>
            <TokenTableCell {...tokens.get(market.params.loanToken)!} chain={chain} />
          </TableCell>
        );
      case "totalSupply":
        return (
          <TableCell key={columnId} className={baseClass}>
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
        );
      case "liquidity":
        return (
          <TableCell key={columnId} className={baseClass}>
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
        );
      case "rate":
        return (
          <TableCell key={columnId} className={baseClass}>
            <ApyTableCell
              nativeApy={market.getSupplyApy()}
              rewards={borrowingRewards.get(market.id) ?? []}
              mode="owe"
            />
          </TableCell>
        );
      case "utilization":
        return (
          <TableCell key={columnId} className={baseClass}>
            {formatLtv(market.utilization)}
          </TableCell>
        );
      case "lltv":
        return (
          <TableCell key={columnId} className={baseClass}>
            {formatLtv(market.params.lltv)}
          </TableCell>
        );
      case "vaultListing":
        return (
          <TableCell key={columnId} className={baseClass}>
            <VaultsTableCell
              token={tokens.get(market.params.loanToken)!}
              vaults={marketVaults.get(market.params.id) ?? []}
              chain={chain}
            />
          </TableCell>
        );
      case "id":
        return (
          <TableCell key={columnId} className={baseClass}>
            <IdTableCell marketId={market.id} />
          </TableCell>
        );
      default:
        return null;
    }
  };

  const visibleColumns = columnConfigs.filter((col) => col.visible);

  return (
    <div className="flex flex-col gap-4">
      {/* Column Configuration Manager */}
      <div className="flex justify-end">
        <ColumnConfigManager columns={columnConfigs} onColumnsChange={setColumnConfigs} />
      </div>

      <Table className="border-separate border-spacing-y-3">
        <TableHeader className="bg-primary">
          <TableRow>{visibleColumns.map((col, index) => renderColumnHeader(col.id, index, visibleColumns))}</TableRow>
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
                  {visibleColumns.map((col, index) => renderColumnCell(col.id, market, index, visibleColumns))}
                </TableRow>
              </SheetTrigger>
              <MarketSheetContent marketId={market.id} marketParams={market.params} imarket={market} tokens={tokens} />
            </Sheet>
          ))}
        </TableBody>
      </Table>
    </div>
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
                      nativeApy={market.getSupplyApy()}
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
