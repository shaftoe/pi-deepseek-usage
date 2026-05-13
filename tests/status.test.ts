/**
 * Unit tests for status.ts
 */

import { describe, expect, it, mock } from "bun:test"
import type { ExtensionContext } from "@earendil-works/pi-coding-agent"
import type { DeepSeekBalanceData } from "../src/api"
import {
  currencySymbol,
  DeepSeekBalanceCache,
  formatMoney,
  isCurrentModelDeepSeek,
  isDeepSeekProvider,
  resolveBalance,
} from "../src/status"

// Helper to create a mock context
const createMockContext = (
  overrides: Partial<ExtensionContext> = {},
): ExtensionContext & {
  ui: {
    setStatus: ReturnType<typeof mock>
    theme: { fg: (color: string, text: string) => string }
  }
} => {
  return {
    ui: {
      setStatus: mock(() => {}),
      theme: {
        fg: (color: string, text: string) => `${color}:${text}`,
      },
    },
    modelRegistry: {
      getApiKeyForProvider: async () => "test-api-key",
    },
    ...overrides,
  } as any
}

// Helper to create a mock fetch balance function
const createMockFetchBalance = (data: DeepSeekBalanceData) =>
  mock(() => Promise.resolve(data)) as any

// Helper to create a mock fetch balance function that throws
const createThrowingFetchBalance = (errorMessage: string) =>
  mock(() => Promise.reject(new Error(errorMessage))) as any

// Helper to create a cache with mocked fetch
const createMockCache = (fetchFn: ReturnType<typeof createMockFetchBalance>) => {
  const cache = new DeepSeekBalanceCache()
  const originalUpdateStatus = cache.updateStatus.bind(cache)
  cache.updateStatus = (ctx) => originalUpdateStatus(ctx, fetchFn)
  return cache
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

// --- Cache tests ---

describe("DeepSeekBalanceCache", () => {
  describe("fresh API call scenarios", () => {
    it("should set status with USD balance", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [
          {
            currency: "USD",
            totalBalance: "15.50",
            grantedBalance: "1.50",
            toppedUpBalance: "14.00",
          },
        ],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith(
        "deepseek-usage",
        "muted:DeepSeek:accent:$15.50",
      )
    })

    it("should set status with CNY balance when USD not available", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [
          {
            currency: "CNY",
            totalBalance: "110.00",
            grantedBalance: "10.00",
            toppedUpBalance: "100.00",
          },
        ],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith(
        "deepseek-usage",
        "muted:DeepSeek:accent:¥110.00",
      )
    })

    it("should set status with currency code for non-USD/CNY currencies", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [
          {
            currency: "EUR",
            totalBalance: "50.00",
            grantedBalance: "0.00",
            toppedUpBalance: "50.00",
          },
        ],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith(
        "deepseek-usage",
        "muted:DeepSeek:accent:EUR 50.00",
      )
    })

    it("should prefer USD balance over other currencies", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
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
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith(
        "deepseek-usage",
        "muted:DeepSeek:accent:$15.50",
      )
    })

    it("should handle empty balances array", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith(
        "deepseek-usage",
        "muted:DeepSeek:accent:No balance",
      )
    })

    it("should clear status on fetch error", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createThrowingFetchBalance("API error")
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("deepseek-usage", undefined)
    })
  })

  describe("caching scenarios", () => {
    it("should use cached data when within cooldown period", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [
          {
            currency: "USD",
            totalBalance: "15.50",
            grantedBalance: "1.50",
            toppedUpBalance: "14.00",
          },
        ],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      await cache.updateStatus(mockCtx)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should set status with cached data on second call", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [
          {
            currency: "USD",
            totalBalance: "30.00",
            grantedBalance: "5.00",
            toppedUpBalance: "25.00",
          },
        ],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)
      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith(
        "deepseek-usage",
        "muted:DeepSeek:accent:$30.00",
      )
    })
  })

  describe("theme formatting", () => {
    it("should use theme colors for formatting", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createMockFetchBalance({
        isAvailable: true,
        balances: [
          {
            currency: "USD",
            totalBalance: "15.50",
            grantedBalance: "1.50",
            toppedUpBalance: "14.00",
          },
        ],
      })
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      const statusCall = mockCtx.ui.setStatus.mock.calls[0]
      expect(statusCall?.[0]).toBe("deepseek-usage")
      expect(statusCall?.[1]).toContain("muted:")
      expect(statusCall?.[1]).toContain("accent:")
    })
  })

  describe("error scenarios", () => {
    it("should clear status on network error", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createThrowingFetchBalance("Network error")
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("deepseek-usage", undefined)
    })

    it("should clear status on 401", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createThrowingFetchBalance("API request failed with status 401")
      const cache = createMockCache(mockFetch)

      await cache.updateStatus(mockCtx)

      expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("deepseek-usage", undefined)
    })

    it("should not throw, catch silently", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createThrowingFetchBalance("Some error")
      const cache = createMockCache(mockFetch)

      const result = await cache.updateStatus(mockCtx)
      expect(result).toBeUndefined()
    })

    it("should log error to console", async () => {
      const mockCtx = createMockContext()
      const mockFetch = createThrowingFetchBalance("API request failed")
      const cache = createMockCache(mockFetch)
      const mockConsoleError = mock(() => {})
      const originalConsoleError = console.error

      console.error = mockConsoleError

      try {
        await cache.updateStatus(mockCtx)

        const calls = mockConsoleError.mock.calls as Array<unknown[]>
        const errorMessage = calls[0]?.[0] as string
        expect(errorMessage).toContain("Error updating DeepSeek balance:")
        expect(errorMessage).toContain("API request failed")
      } finally {
        console.error = originalConsoleError
      }
    })
  })
})

describe("DeepSeekBalanceCache.clear", () => {
  it("should clear deepseek-usage status", () => {
    const mockCtx: ExtensionContext = {
      ui: {
        setStatus: mock(() => {}),
      },
    } as any

    const cache = new DeepSeekBalanceCache()
    cache.clear(mockCtx)

    expect(mockCtx.ui.setStatus).toHaveBeenCalledWith("deepseek-usage", undefined)
  })
})

describe("isDeepSeekProvider", () => {
  it("should return true for 'deepseek'", () => {
    expect(isDeepSeekProvider("deepseek")).toBe(true)
  })

  it("should return true for providers starting with 'deepseek'", () => {
    expect(isDeepSeekProvider("deepseek-extra")).toBe(true)
    expect(isDeepSeekProvider("deepseek-pro")).toBe(true)
  })

  it("should return false for non-deepseek providers", () => {
    expect(isDeepSeekProvider("anthropic")).toBe(false)
    expect(isDeepSeekProvider("openai")).toBe(false)
    expect(isDeepSeekProvider("zai")).toBe(false)
  })

  it("should return false for undefined provider", () => {
    expect(isDeepSeekProvider(undefined)).toBe(false)
  })

  it("should be case insensitive", () => {
    expect(isDeepSeekProvider("DEEPSEEK")).toBe(true)
    expect(isDeepSeekProvider("DeepSeek")).toBe(true)
    expect(isDeepSeekProvider("DEEPSEEK-EXTRA")).toBe(true)
  })

  it("should return false for providers that contain 'deepseek' but don't start with it", () => {
    expect(isDeepSeekProvider("my-deepseek-provider")).toBe(false)
  })
})

describe("isCurrentModelDeepSeek", () => {
  it("should return true when current model provider is deepseek", () => {
    const mockCtx: ExtensionContext = {
      model: { provider: "deepseek", id: "some-model" },
    } as any
    expect(isCurrentModelDeepSeek(mockCtx)).toBe(true)
  })

  it("should return false when current model provider is not deepseek", () => {
    const mockCtx: ExtensionContext = {
      model: { provider: "openai", id: "gpt-4" },
    } as any
    expect(isCurrentModelDeepSeek(mockCtx)).toBe(false)
  })

  it("should return false when model is undefined", () => {
    const mockCtx: ExtensionContext = { model: undefined } as any
    expect(isCurrentModelDeepSeek(mockCtx)).toBe(false)
  })

  it("should return false when model is null", () => {
    const mockCtx: ExtensionContext = { model: null } as any
    expect(isCurrentModelDeepSeek(mockCtx)).toBe(false)
  })

  it("should be case insensitive for provider name", () => {
    const mockCtx: ExtensionContext = {
      model: { provider: "DEEPSEEK", id: "some-model" },
    } as any
    expect(isCurrentModelDeepSeek(mockCtx)).toBe(true)
  })
})
