/**
 * DeepSeek Usage Checker - Pi Extension
 * API interaction functions using pi-usage-lib utilities
 */

import { buildAuthHeaders, safeFetch, safeParseJson } from "@alexanderfortin/pi-usage-lib"
import type { ModelRegistry } from "@earendil-works/pi-coding-agent"

const DEEPSEEK_BALANCE_API_URL = "https://api.deepseek.com/user/balance"

// --- API types ---

export interface DeepSeekBalanceResponse {
  is_available: boolean
  balance_infos: Array<{
    currency: string
    total_balance: string
    granted_balance: string
    topped_up_balance: string
  }>
}

export interface DeepSeekBalanceData {
  isAvailable: boolean
  balances: Array<{
    currency: string
    totalBalance: string
    grantedBalance: string
    toppedUpBalance: string
  }>
}

/**
 * Fetch DeepSeek balance from the API
 */
export async function getDeepSeekBalance(
  modelRegistry: Pick<ModelRegistry, "getApiKeyForProvider">,
): Promise<DeepSeekBalanceData> {
  const headers = await buildAuthHeaders(modelRegistry, "deepseek")
  const response = await safeFetch(DEEPSEEK_BALANCE_API_URL, { headers })
  const data = await safeParseJson<DeepSeekBalanceResponse>(response)

  return {
    isAvailable: data.is_available,
    balances: data.balance_infos.map((info) => ({
      currency: info.currency,
      totalBalance: info.total_balance,
      grantedBalance: info.granted_balance,
      toppedUpBalance: info.topped_up_balance,
    })),
  }
}
