import { RefreshCw } from "lucide-react";
import { formatUnits } from "viem";

import { Input } from "@/components/shadcn/input";

function validateTokenAmountInput(input: string, maxDecimals: number): string | null {
  if (input === "" || input === "0") {
    return "";
  } else if (input === ".") {
    return "0.";
  }

  const re = new RegExp(`^[0-9\b]+[.\b]?[0-9\b]{0,}$`);
  if (!re.test(input)) return null;

  const decimalIndex = input.indexOf(".");
  return decimalIndex > -1 ? input.slice(0, decimalIndex + maxDecimals + 1) : input;
}

export function TokenAmountInput({
  decimals,
  value,
  maxValue,
  onChange,
  onRefresh,
}: {
  decimals?: number;
  value: string;
  maxValue?: bigint;
  onChange: (value: string) => void;
  onRefresh?: () => void | Promise<void>;
}) {
  const textMaxValue = maxValue !== undefined && decimals !== undefined ? formatUnits(maxValue, decimals) : undefined;

  return (
    <div>
      <Input
        className="caret-morpho-brand p-0 font-mono text-2xl font-bold"
        type="text"
        placeholder="0"
        value={value}
        onChange={(ev) => {
          const validValue = validateTokenAmountInput(ev.target.value, decimals ?? 18);
          if (validValue != null) onChange(validValue);
        }}
        disabled={decimals === undefined}
      />
      {textMaxValue && (
        <div className="text-primary-foreground flex items-center justify-end gap-2 text-xs font-light">
          <span>{textMaxValue}</span>
          <span className="text-morpho-brand cursor-pointer" onClick={() => onChange(textMaxValue)}>
            MAX
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="text-morpho-brand hover:text-morpho-brand/80 flex items-center transition-colors"
              aria-label="Refresh balance"
            >
              <RefreshCw className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
