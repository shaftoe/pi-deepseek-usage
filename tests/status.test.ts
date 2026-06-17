/**
 * Unit tests for status.ts
 */

import { describe, expect, it } from "bun:test"
import type { DeepSeekBalanceData } from "../src/api"
import { currencySymbol, formatMoney, renderDeepSeekStatus, resolveBalance } from "../src/status"

// Mock theme for testing
const mockTheme = {
  fg: (color: string, text: string) => `${color}:${text}`,
}

// --- Pure function tests ---

describe("resolveBalance", () => {
  it("should prefer USD balance", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "CNY",
          totalBalance: "110.00",
          grantedBalance: "10.00",
          toppedUpBalance: "100.00",
        },
        {
          currency: "USD",
          totalBalance: "15.50",
          grantedBalance: "1.50",
          toppedUpBalance: "14.00",
        },
      ],
    }
    const result = resolveBalance(data)
    expect(result?.currency).toBe("USD")
    expect(result?.totalBalance).toBe("15.50")
  })

  it("should fall back to first balance when no USD", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "CNY",
          totalBalance: "110.00",
          grantedBalance: "10.00",
          toppedUpBalance: "100.00",
        },
      ],
    }
    const result = resolveBalance(data)
    expect(result?.currency).toBe("CNY")
  })

  it("should return undefined for empty balances", () => {
    const data: DeepSeekBalanceData = { isAvailable: true, balances: [] }
    const result = resolveBalance(data)
    expect(result).toBeUndefined()
  })
})

describe("currencySymbol", () => {
  it("should return $ for USD", () => {
    expect(currencySymbol("USD")).toBe("$")
  })

  it("should return ¥ for CNY", () => {
    expect(currencySymbol("CNY")).toBe("¥")
  })

  it("should return code + space for other currencies", () => {
    expect(currencySymbol("EUR")).toBe("EUR ")
  })
})

describe("formatMoney", () => {
  it("should format positive USD amounts", () => {
    expect(formatMoney(15.5, "USD")).toBe("$15.50")
  })

  it("should format negative USD amounts with leading minus", () => {
    expect(formatMoney(-2.3, "USD")).toBe("-$2.30")
  })

  it("should format CNY amounts", () => {
    expect(formatMoney(110, "CNY")).toBe("¥110.00")
  })

  it("should format EUR amounts with code prefix", () => {
    expect(formatMoney(50, "EUR")).toBe("EUR 50.00")
  })

  it("should handle zero", () => {
    expect(formatMoney(0, "USD")).toBe("$0.00")
  })
})

describe("renderDeepSeekStatus", () => {
  it("should render USD balance", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "15.50",
          grantedBalance: "1.50",
          toppedUpBalance: "14.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:accent:$15.50")
  })

  it("should render CNY balance when USD not available", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "CNY",
          totalBalance: "110.00",
          grantedBalance: "10.00",
          toppedUpBalance: "100.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:accent:¥110.00")
  })

  it("should render currency code for non-USD/CNY currencies", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "EUR",
          totalBalance: "50.00",
          grantedBalance: "0.00",
          toppedUpBalance: "50.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:accent:EUR 50.00")
  })

  it("should prefer USD balance over other currencies", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "CNY",
          totalBalance: "110.00",
          grantedBalance: "10.00",
          toppedUpBalance: "100.00",
        },
        {
          currency: "USD",
          totalBalance: "15.50",
          grantedBalance: "1.50",
          toppedUpBalance: "14.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:accent:$15.50")
  })

  it("should handle empty balances array", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:accent:No balance")
  })

  it("should use theme colors for formatting", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "15.50",
          grantedBalance: "1.50",
          toppedUpBalance: "14.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toContain("muted:")
    expect(result).toContain("accent:")
  })

  // --- Credit threshold coloring ---
  // colorForCredit thresholds: error when credit <= $1,
  // warning when $1 < credit < $2, accent when credit >= $2.

  it("should render accent color at the $2 threshold", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "2.00",
          grantedBalance: "0.00",
          toppedUpBalance: "2.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:accent:$2.00")
  })

  it("should render warning color when credit is between $1 and $2", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "1.50",
          grantedBalance: "0.00",
          toppedUpBalance: "1.50",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:warning:$1.50")
  })

  it("should render warning color just above the $1 threshold", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "1.01",
          grantedBalance: "0.00",
          toppedUpBalance: "1.01",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:warning:$1.01")
  })

  it("should render error color when credit is at the $1 threshold", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "1.00",
          grantedBalance: "0.00",
          toppedUpBalance: "1.00",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:error:$1.00")
  })

  it("should render error color for very low balance", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: "0.25",
          grantedBalance: "0.00",
          toppedUpBalance: "0.25",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:error:$0.25")
  })

  it("should apply threshold coloring to non-USD currencies", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "CNY",
          totalBalance: "1.50",
          grantedBalance: "0.00",
          toppedUpBalance: "1.50",
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe("muted:DeepSeek:warning:¥1.50")
  })
})
