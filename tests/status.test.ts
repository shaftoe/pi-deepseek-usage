/**
 * Unit tests for status.ts
 *
 * Color selection for the balance amount is delegated to colorForCredit
 * (from the shared library), whose thresholds are loaded from the
 * user-managed ~/.pi/agent/usage-lib.json and fall back to built-in
 * defaults. Rather than hardcoding accent/warning/error, the expected
 * color is derived from the same function so the assertions hold for any
 * configured thresholds — i.e. the suite does not assume the settings
 * file is absent.
 */

import { describe, expect, it } from "bun:test"
import type { Theme } from "@alexanderfortin/pi-usage-lib"
import { colorForCredit, loadColorThresholds } from "@alexanderfortin/pi-usage-lib"
import type { DeepSeekBalanceData } from "../src/api"
import { currencySymbol, formatMoney, renderDeepSeekStatus, resolveBalance } from "../src/status"

// Mock theme for testing
const mockTheme = {
  fg: (color: string, text: string) => `${color}:${text}`,
}

/**
 * Return the color token renderDeepSeekStatus will emit for a credit value.
 *
 * Mirrors renderDeepSeekStatus by delegating to colorForCredit (from the
 * shared library), capturing which color is selected for the currently-loaded
 * thresholds.
 */
function colorFor(credit: number): string {
  let color = ""
  const probe = {
    fg: (c: string) => {
      color = c
      return ""
    },
  } as unknown as Theme
  colorForCredit(credit, probe)("")
  return color
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
  // Credit values chosen relative to the active thresholds (loaded from
  // ~/.pi/agent/usage-lib.json, falling back to defaults) so each color
  // branch is exercised regardless of the user's settings file.
  //   colorForCredit: error   when credit <= critical,
  //                   warning when critical < credit < warning,
  //                   accent  when credit >= warning.
  const { warning, critical } = loadColorThresholds().credit
  const highCredit = warning // at/above the warning threshold → accent
  const midCredit = (warning + critical) / 2 // strictly between the thresholds → warning
  const lowCredit = critical // at/below the critical threshold → error
  const midBucketReachable = warning > critical

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
    expect(result).toBe(`muted:DeepSeek:${colorFor(15.5)}:$15.50`)
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
    expect(result).toBe(`muted:DeepSeek:${colorFor(110)}:¥110.00`)
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
    expect(result).toBe(`muted:DeepSeek:${colorFor(50)}:EUR 50.00`)
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
    expect(result).toBe(`muted:DeepSeek:${colorFor(15.5)}:$15.50`)
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
    expect(result).toContain(`${colorFor(15.5)}:`)
  })

  // --- Credit threshold coloring ---

  it("should render accent color at or above the warning threshold", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: String(highCredit),
          grantedBalance: "0.00",
          toppedUpBalance: String(highCredit),
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe(`muted:DeepSeek:accent:${formatMoney(highCredit, "USD")}`)
  })

  ;(midBucketReachable ? it : it.skip)(
    "should render warning color for a credit between the thresholds",
    () => {
      const data: DeepSeekBalanceData = {
        isAvailable: true,
        balances: [
          {
            currency: "USD",
            totalBalance: String(midCredit),
            grantedBalance: "0.00",
            toppedUpBalance: String(midCredit),
          },
        ],
      }
      const result = renderDeepSeekStatus(data, mockTheme as any)
      expect(result).toBe(`muted:DeepSeek:warning:${formatMoney(midCredit, "USD")}`)
    },
  )

  it("should render error color at or below the critical threshold", () => {
    const data: DeepSeekBalanceData = {
      isAvailable: true,
      balances: [
        {
          currency: "USD",
          totalBalance: String(lowCredit),
          grantedBalance: "0.00",
          toppedUpBalance: String(lowCredit),
        },
      ],
    }
    const result = renderDeepSeekStatus(data, mockTheme as any)
    expect(result).toBe(`muted:DeepSeek:error:${formatMoney(lowCredit, "USD")}`)
  })

  ;(midBucketReachable ? it : it.skip)(
    "should apply threshold coloring to non-USD currencies",
    () => {
      const data: DeepSeekBalanceData = {
        isAvailable: true,
        balances: [
          {
            currency: "CNY",
            totalBalance: String(midCredit),
            grantedBalance: "0.00",
            toppedUpBalance: String(midCredit),
          },
        ],
      }
      const result = renderDeepSeekStatus(data, mockTheme as any)
      expect(result).toBe(`muted:DeepSeek:warning:${formatMoney(midCredit, "CNY")}`)
    },
  )
})
