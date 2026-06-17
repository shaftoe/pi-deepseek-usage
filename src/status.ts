/**
 * DeepSeek Usage Checker - Pi Extension
 * Balance formatting utilities
 */

import type { Theme } from "@alexanderfortin/pi-usage-lib"
import { colorForCredit } from "@alexanderfortin/pi-usage-lib"
import type { DeepSeekBalanceData } from "./api"

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

/** Render DeepSeek balance data into a themed footer string */
export function renderDeepSeekStatus(data: DeepSeekBalanceData, theme: Theme): string {
  const balance = resolveBalance(data)

  if (!balance) {
    return theme.fg("muted", "DeepSeek:") + theme.fg("accent", "No balance")
  }

  const colored = colorForCredit(parseFloat(balance.totalBalance), theme)
  const displayBalance = formatMoney(parseFloat(balance.totalBalance), balance.currency)

  return theme.fg("muted", "DeepSeek:") + colored(displayBalance)
}
