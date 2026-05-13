/**
 * DeepSeek Usage Checker - Pi Extension
 * Footer status management
 */

import type {
  ExtensionContext as PiExtensionContext,
  ModelRegistry as PiModelRegistry,
} from "@earendil-works/pi-coding-agent"
import { Temporal } from "temporal-polyfill"
import { type DeepSeekBalanceData, getDeepSeekBalance } from "./api"

// Type for fetch balance function (same signature as getDeepSeekBalance)
export type FetchBalanceFn = (
  modelRegistry: Pick<PiModelRegistry, "getApiKeyForProvider">,
) => Promise<DeepSeekBalanceData>

/** Resolve the preferred balance entry from the response (USD first, then first available) */
export function resolveBalance(balanceData: DeepSeekBalanceData) {
  const usd = balanceData.balances.find((b) => b.currency === "USD")
  return usd ?? balanceData.balances[0]
}

/** Get the currency symbol for display */
export function currencySymbol(currency: string): string {
  if (currency === "USD") return "$"
  if (currency === "CNY") return "¥"
  return `${currency} `
}

/** Format a monetary value with currency symbol */
export function formatMoney(amount: number, currency: string): string {
  const symbol = currencySymbol(currency)
  const abs = Math.abs(amount).toFixed(2)
  return amount < 0 ? `-${symbol}${abs}` : `${symbol}${abs}`
}

/** Cache for DeepSeek balance data to avoid excessive API calls */
export class DeepSeekBalanceCache {
  private lastBalance: DeepSeekBalanceData | null = null
  private lastFetchTime = 0
  private static readonly FETCH_COOLDOWN_MS = 30_000 // Only fetch every 30 seconds

  /** Build and set footer status string from balance data */
  private setStatusFromBalance(ctx: PiExtensionContext, balanceData: DeepSeekBalanceData): void {
    const theme = ctx.ui.theme

    const balance = resolveBalance(balanceData)

    if (!balance) {
      ctx.ui.setStatus(
        "deepseek-usage",
        theme.fg("muted", "DeepSeek:") + theme.fg("accent", "No balance"),
      )
      return
    }

    const displayBalance = formatMoney(parseFloat(balance.totalBalance), balance.currency)
    const status = theme.fg("muted", "DeepSeek:") + theme.fg("accent", displayBalance)
    ctx.ui.setStatus("deepseek-usage", status)
  }

  /** Update footer status with DeepSeek balance information */
  async updateStatus(
    ctx: PiExtensionContext,
    fetchBalance: FetchBalanceFn = getDeepSeekBalance,
  ): Promise<void> {
    try {
      const now = Temporal.Now.instant().epochMilliseconds

      // Use cached data if still fresh
      if (
        this.lastBalance &&
        this.lastFetchTime &&
        now - this.lastFetchTime < DeepSeekBalanceCache.FETCH_COOLDOWN_MS
      ) {
        this.setStatusFromBalance(ctx, this.lastBalance)
        return
      }

      const balance = await fetchBalance(ctx.modelRegistry)
      this.lastBalance = balance
      this.lastFetchTime = now

      this.setStatusFromBalance(ctx, balance)
    } catch (error) {
      console.error(`Error updating DeepSeek balance: ${error}`)
      this.clear(ctx)
    }
  }

  /** Clear DeepSeek balance footer status */
  clear(ctx: PiExtensionContext): void {
    ctx.ui.setStatus("deepseek-usage", undefined)
  }
}

/** Check if a provider name is a DeepSeek provider (e.g., "deepseek", "deepseek-extra", etc.) */
export function isDeepSeekProvider(provider: string | undefined): boolean {
  return provider?.toLowerCase().startsWith("deepseek") ?? false
}

/** Check if current model is a DeepSeek model */
export function isCurrentModelDeepSeek(ctx: PiExtensionContext): boolean {
  return isDeepSeekProvider(ctx.model?.provider)
}
