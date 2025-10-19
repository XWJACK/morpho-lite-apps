import {
  // AccrualPosition,
  IMarket,
  Market,
  MarketId,
  MarketParams,
  Position,
} from "@morpho-org/blue-sdk";
import { morphoAbi } from "@morpho-org/uikit/assets/abis/morpho";
import { oracleAbi } from "@morpho-org/uikit/assets/abis/oracle";
// import { AnimateIn } from "@morpho-org/uikit/components/animate-in";
import { Button } from "@morpho-org/uikit/components/shadcn/button";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@morpho-org/uikit/components/shadcn/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@morpho-org/uikit/components/shadcn/tabs";
import { TokenAmountInput } from "@morpho-org/uikit/components/token-amount-input";
import { TransactionButton } from "@morpho-org/uikit/components/transaction-button";
import { getContractDeploymentInfo } from "@morpho-org/uikit/lib/deployments";
import {
  // tryFormatBalance, formatLtv,
  Token,
  formatApy,
} from "@morpho-org/uikit/lib/utils";
import { keepPreviousData } from "@tanstack/react-query";
import {
  // ArrowRight,
  CircleArrowLeft,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { Address, erc20Abi, maxUint256, parseUnits } from "viem";
import { useAccount, useChainId, useReadContract, useReadContracts } from "wagmi";

import { RISKS_DOCUMENTATION, TRANSACTION_DATA_SUFFIX } from "@/lib/constants";

enum Actions {
  Supply = "Supply",
  Withdraw = "Withdraw",
  // Borrow = "Borrow",
  // Repay = "Repay",
}

// APY Change Display Component
function ApyChangeDisplay({
  inputValue,
  currentApy,
  newApy,
}: {
  inputValue: bigint | undefined;
  currentApy: bigint | undefined;
  newApy: bigint | undefined;
}) {
  if (inputValue === undefined || inputValue <= 0n || currentApy === undefined) {
    return null;
  }

  return (
    <div className="border-secondary flex items-center justify-between border-t pt-2">
      <span className="text-secondary-foreground text-xs">APY Change</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatApy(currentApy)}</span>
        {newApy !== undefined && (
          <>
            <span className="text-secondary-foreground">→</span>
            <span className={`text-sm font-medium ${newApy > currentApy ? "text-green-500" : "text-orange-500"}`}>
              {formatApy(newApy)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// function PositionProperty({ current, updated }: { current: string; updated?: string }) {
//   if (updated === undefined || current === updated) {
//     return <p className="text-lg font-medium">{current}</p>;
//   }
//   return (
//     <div className="flex items-center gap-1">
//       <p className="text-tertiary-foreground text-lg font-medium">{current}</p>
//       <AnimateIn
//         className="flex items-center gap-1"
//         from="opacity-0 translate-x-[-16px]"
//         duration={250}
//         to="opacity-100 translate-x-[0px]"
//         style={{ transitionTimingFunction: "cubic-bezier(0.25, 0.4, 0.55, 1.4)" }}
//       >
//         <ArrowRight height={16} width={16} className="text-tertiary-foreground" />
//         <p>{updated}</p>
//       </AnimateIn>
//     </div>
//   );
// }

// const STYLE_LABEL = "text-secondary-foreground flex items-center justify-between text-xs font-light";
const STYLE_TAB = "hover:bg-tertiary rounded-full duration-200 ease-in-out";
const STYLE_INPUT_WRAPPER =
  "bg-primary hover:bg-secondary flex flex-col gap-4 rounded-2xl p-4 transition-colors duration-200 ease-in-out";
const STYLE_INPUT_HEADER = "text-secondary-foreground flex items-center justify-between text-xs font-light";

export function MarketSheetContent({
  marketId,
  marketParams,
  imarket,
  tokens,
}: {
  marketId: MarketId;
  marketParams: MarketParams;
  imarket?: IMarket;
  tokens: Map<Address, Token>;
}) {
  const chainId = useChainId();
  const { address: userAddress } = useAccount();

  const [selectedTab, setSelectedTab] = useState(Actions.Supply);
  const [textInputValue, setTextInputValue] = useState("");
  const [approveUnlimited, setApproveUnlimited] = useState(true);

  const morpho = getContractDeploymentInfo(chainId, "Morpho").address;

  const { data: balances, refetch: refetchBalances } = useReadContracts({
    contracts: [imarket?.params.loanToken].map(
      (address) =>
        ({
          address: address ?? "0x",
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [userAddress ?? "0x"],
        }) as const,
    ),
    allowFailure: false,
    query: { enabled: !!imarket && !!userAddress, staleTime: 60_000, placeholderData: keepPreviousData },
  });

  const { data: positionRaw, refetch: refetchPosition } = useReadContract({
    address: morpho,
    abi: morphoAbi,
    functionName: "position",
    args: userAddress ? [marketId, userAddress] : undefined,
    query: { staleTime: 60_000, placeholderData: keepPreviousData },
  });

  const { data: price } = useReadContract({
    address: marketParams.oracle,
    abi: oracleAbi,
    functionName: "price",
    query: { staleTime: 10_000, placeholderData: keepPreviousData, refetchInterval: 10_000 },
  });

  const { data: allowances, refetch: refetchAllowances } = useReadContracts({
    contracts: [
      // {
      //   address: marketParams.collateralToken,
      //   abi: erc20Abi,
      //   functionName: "allowance",
      //   args: [userAddress ?? "0x", morpho],
      // },
      {
        address: marketParams.loanToken,
        abi: erc20Abi,
        functionName: "allowance",
        args: [userAddress ?? "0x", morpho],
      },
    ],
    allowFailure: false,
    query: { enabled: !!userAddress, staleTime: 5_000, gcTime: 5_000 },
  });

  const onTxnReceipt = useCallback(() => {
    setTextInputValue("");
    void refetchBalances();
    void refetchPosition();
  }, [refetchBalances, refetchPosition]);

  const market = useMemo(
    () => (imarket && price !== undefined ? new Market({ ...imarket, price }) : undefined),
    [imarket, price],
  );

  const position = useMemo(
    () =>
      userAddress && positionRaw
        ? new Position({
            user: userAddress,
            marketId,
            supplyShares: positionRaw[0],
            borrowShares: positionRaw[1],
            collateral: positionRaw[2],
          })
        : undefined,
    [userAddress, marketId, positionRaw],
  );

  // const accrualPosition = useMemo(
  //   () =>
  //     market && position
  //       ? new AccrualPosition(position, market).accrueInterest(BigInt((Date.now() / 1000).toFixed(0)))
  //       : undefined,
  //   [position, market],
  // );

  const { token, inputValue } = useMemo(() => {
    const token = tokens.get(marketParams.loanToken);
    return {
      token,
      inputValue: token?.decimals !== undefined ? parseUnits(textInputValue, token.decimals) : undefined,
    };
  }, [textInputValue, tokens, marketParams]);

  let withdrawCollateralMax = 0n;
  if (position !== undefined && market !== undefined && market.totalSupplyShares > 0n) {
    withdrawCollateralMax =
      (position.supplyShares * (market.totalSupplyAssets + 1n)) / (market.totalSupplyShares + 1000000n);
  }

  // Calculate new APY after supply or withdraw
  const { currentApy, newApy } = useMemo(() => {
    const currentApy = market?.getSupplyApy();

    // TODO: Implement actual APY calculation logic
    // For now, using a placeholder calculation
    let newApy: bigint | undefined = undefined;
    if (currentApy !== undefined && inputValue !== undefined && inputValue > 0n && market !== undefined) {
      // Placeholder calculation
      // Real implementation should calculate the new APY based on:
      // - New total supply (current supply +/- inputValue depending on action)
      // - Market utilization changes
      // - Interest rate model parameters
      // - Market dynamics

      // Different logic for supply vs withdraw
      if (selectedTab === Actions.Supply) {
        // Supply increases total supply, typically decreases APY
        // For now, keeping the same APY as placeholder
        newApy = currentApy;
      } else if (selectedTab === Actions.Withdraw) {
        // Withdraw decreases total supply, typically increases APY
        // For now, keeping the same APY as placeholder
        newApy = currentApy;
      }
    }

    return { currentApy, newApy };
  }, [market, inputValue, selectedTab]);

  // Approval is only needed for SupplyCollateral now
  const needsApproval =
    token !== undefined && inputValue !== undefined && allowances !== undefined && allowances[0] < inputValue;

  const approvalTxnConfig = needsApproval
    ? ({
        address: token.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [morpho, approveUnlimited ? maxUint256 : inputValue],
      } as const)
    : undefined;

  const supplyTxnConfig =
    inputValue !== undefined && userAddress !== undefined
      ? ({
          address: morpho,
          abi: morphoAbi,
          functionName: "supply",
          args: [{ ...marketParams }, inputValue, 0n, userAddress, "0x"],
          dataSuffix: TRANSACTION_DATA_SUFFIX,
        } as const)
      : undefined;

  const withdrawTxnConfig =
    inputValue !== undefined && userAddress !== undefined && market != undefined
      ? ({
          address: morpho,
          abi: morphoAbi,
          functionName: "withdraw",
          args: [
            { ...marketParams },
            0n,
            // MarketUtils.toSupplyShares(inputValue, market),
            position?.supplyShares ?? 0n,
            userAddress,
            userAddress,
          ],
          dataSuffix: TRANSACTION_DATA_SUFFIX,
        } as const)
      : undefined;

  // Removed: borrowTxnConfig and repayTxnConfig

  // const {
  //   symbol: collateralSymbol,
  //   decimals: collateralDecimals,
  //   imageSrc: collateralImgSrc,
  // } = tokens.get(marketParams.collateralToken) ?? {};
  // const { symbol: loanSymbol, decimals: loanDecimals, imageSrc: loanImgSrc } = tokens.get(marketParams.loanToken) ?? {};

  // let newAccrualPosition: AccrualPosition | undefined = undefined;
  // let error: Error | null = null;
  // if (accrualPosition && inputValue) {
  //   try {
  //     switch (selectedTab) {
  //       case Actions.Supply:
  //         newAccrualPosition = new AccrualPosition(
  //           accrualPosition,
  //           new Market(accrualPosition.market),
  //         ).supplyCollateral(inputValue);
  //         break;
  //       case Actions.Withdraw:
  //         newAccrualPosition = new AccrualPosition(
  //           accrualPosition,
  //           new Market(accrualPosition.market),
  //         ).withdrawCollateral(inputValue);
  //         break;
  //       // Removed: Borrow and Repay cases
  //     }
  //   } catch (e) {
  //     error = e as Error;
  //   }
  // }

  return (
    <SheetContent className="bg-background z-[9999] w-full gap-3 overflow-y-scroll sm:w-[500px] sm:min-w-[500px] sm:max-w-[500px]">
      <Toaster theme="dark" position="bottom-left" richColors />
      <SheetHeader>
        <SheetTitle>Your Position</SheetTitle>
        <SheetDescription>
          You can view and edit your position here. To understand more about risks, please visit our{" "}
          <a className="underline" href={RISKS_DOCUMENTATION} rel="noopener noreferrer" target="_blank">
            docs.
          </a>
        </SheetDescription>
      </SheetHeader>
      {/* <div className="bg-primary mx-4 flex flex-col gap-4 rounded-2xl p-4">
        <div className={STYLE_LABEL}>
          My collateral position {collateralSymbol ? `(${collateralSymbol})` : ""}
          <img className="max-h-[16px] rounded-full" height={16} width={16} src={collateralImgSrc} />
        </div>
        <PositionProperty
          current={tryFormatBalance(accrualPosition?.collateral, collateralDecimals, 5) ?? "－"}
          updated={tryFormatBalance(newAccrualPosition?.collateral, collateralDecimals, 5)}
        />
        <div className={STYLE_LABEL}>
          My loan position {loanSymbol ? `(${loanSymbol})` : ""}
          <img className="max-h-[16px] rounded-full" height={16} width={16} src={loanImgSrc} />
        </div>
        <PositionProperty
          current={tryFormatBalance(accrualPosition?.borrowAssets, loanDecimals) ?? "－"}
          updated={tryFormatBalance(newAccrualPosition?.borrowAssets, loanDecimals)}
        />
        <div className={STYLE_LABEL}>LTV / Liquidation LTV</div>
        <PositionProperty
          current={`${accrualPosition?.ltv !== undefined ? formatLtv(accrualPosition.ltv ?? 0n) : "－"} / ${formatLtv(marketParams.lltv)}`}
          updated={
            newAccrualPosition &&
            `${newAccrualPosition?.ltv !== undefined ? formatLtv(newAccrualPosition.ltv ?? 0n) : "－"} / ${formatLtv(marketParams.lltv)}`
          }
        />
      </div> */}
      <Tabs
        defaultValue={Actions.Supply}
        className="w-full gap-3 px-4"
        value={selectedTab}
        onValueChange={(value) => {
          setSelectedTab(value as Actions);
          setTextInputValue("");
        }}
      >
        <TabsList className="grid w-full grid-cols-2 gap-1 bg-transparent p-0">
          <TabsTrigger className={STYLE_TAB} value={Actions.Supply}>
            {Actions.Supply}
          </TabsTrigger>
          <TabsTrigger className={STYLE_TAB} value={Actions.Withdraw}>
            {Actions.Withdraw}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={Actions.Supply}>
          <div className={STYLE_INPUT_WRAPPER}>
            <div className={STYLE_INPUT_HEADER}>
              Supply {token?.symbol ?? ""}
              <img className="max-h-[16px] rounded-full" height={16} width={16} src={token?.imageSrc} />
            </div>
            <TokenAmountInput
              decimals={token?.decimals}
              value={textInputValue}
              maxValue={balances?.[0]}
              onChange={setTextInputValue}
            />
            <ApyChangeDisplay inputValue={inputValue} currentApy={currentApy} newApy={newApy} />
          </div>
          {needsApproval && (
            <div className="bg-primary/50 mt-3 flex items-center justify-between rounded-lg px-4 py-3">
              <div className="flex flex-col gap-1">
                {/* <span className="text-sm font-medium">Approve Unlimited</span> */}
                <span className="text-secondary-foreground text-xs">
                  {approveUnlimited
                    ? "Approve unlimited amount for future transactions"
                    : "Approve only the amount you're supplying"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={approveUnlimited}
                onClick={() => setApproveUnlimited(!approveUnlimited)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                  approveUnlimited ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    approveUnlimited ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
          {approvalTxnConfig ? (
            <TransactionButton
              variables={approvalTxnConfig}
              disabled={inputValue === 0n}
              onTxnReceipt={() => refetchAllowances()}
            >
              Approve {approveUnlimited ? "Unlimited" : ""}
            </TransactionButton>
          ) : (
            <TransactionButton
              variables={supplyTxnConfig}
              disabled={!inputValue || (balances?.[0] !== undefined && inputValue > balances[0])}
              onTxnReceipt={onTxnReceipt}
            >
              Supply
            </TransactionButton>
          )}
        </TabsContent>
        <TabsContent value={Actions.Withdraw}>
          <div className={STYLE_INPUT_WRAPPER}>
            <div className={STYLE_INPUT_HEADER}>
              Withdraw {token?.symbol ?? ""}
              <img className="max-h-[16px] rounded-full" height={16} width={16} src={token?.imageSrc} />
            </div>
            <TokenAmountInput
              decimals={token?.decimals}
              value={textInputValue}
              maxValue={withdrawCollateralMax}
              onChange={setTextInputValue}
            />
            <ApyChangeDisplay inputValue={inputValue} currentApy={currentApy} newApy={newApy} />
          </div>
          <TransactionButton variables={withdrawTxnConfig} disabled={!inputValue} onTxnReceipt={onTxnReceipt}>
            Withdraw
          </TransactionButton>
        </TabsContent>
      </Tabs>
      {/* <p className="break-words px-12 text-center text-xs text-red-500">{error?.message}</p> */}
      <SheetFooter>
        <SheetClose asChild>
          <Button className="text-md h-12 w-full rounded-full font-light" type="submit">
            <CircleArrowLeft />
            Back to list
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}
