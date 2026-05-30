/**
 * Unit tests for api.ts
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { UsageError } from "@alexanderfortin/pi-usage-lib"
import { type DeepSeekBalanceResponse, getDeepSeekBalance } from "../src/api"

describe("getDeepSeekBalance", () => {
  let mockModelRegistry: any
  let mockFetch: any

  beforeEach(() => {
    // Create a fresh mock for each test
    mockModelRegistry = {
      getApiKeyForProvider: async () => "test-api-key",
    }

    // Mock global fetch
    mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          is_available: true,
          balance_infos: [
            {
              currency: "USD",
              total_balance: "15.50",
              granted_balance: "1.50",
              topped_up_balance: "14.00",
            },
          ],
        }),
      } as Response),
    )

    global.fetch = mockFetch
  })

  afterEach(() => {
    mockFetch.mockRestore()
  })

  it("should throw UsageError with code http401 when API returns 401", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      } as Response),
    )

    try {
      await getDeepSeekBalance(mockModelRegistry)
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(UsageError)
      expect((e as UsageError).code).toBe("http401")
      expect((e as UsageError).message).toContain("401")
    }
  })

  it("should throw UsageError with code http500 when API returns 500", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response),
    )

    try {
      await getDeepSeekBalance(mockModelRegistry)
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(UsageError)
      expect((e as UsageError).code).toBe("http500")
    }
  })

  it("should throw UsageError with code fetch on network error", async () => {
    mockFetch.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch")
    })

    try {
      await getDeepSeekBalance(mockModelRegistry)
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(UsageError)
      expect((e as UsageError).code).toBe("fetch")
    }
  })

  it("should throw UsageError with code badjson on malformed JSON", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token")
        },
      } as unknown as Response),
    )

    try {
      await getDeepSeekBalance(mockModelRegistry)
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(UsageError)
      expect((e as UsageError).code).toBe("badjson")
    }
  })

  it("should return balance data with USD currency", async () => {
    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [
        {
          currency: "USD",
          total_balance: "25.00",
          granted_balance: "5.00",
          topped_up_balance: "20.00",
        },
      ],
    }

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response),
    )

    const result = await getDeepSeekBalance(mockModelRegistry)

    expect(result.isAvailable).toBe(true)
    expect(result.balances).toHaveLength(1)
    expect(result.balances[0]?.currency).toBe("USD")
    expect(result.balances[0]?.totalBalance).toBe("25.00")
    expect(result.balances[0]?.grantedBalance).toBe("5.00")
    expect(result.balances[0]?.toppedUpBalance).toBe("20.00")
  })

  it("should return balance data with multiple currencies", async () => {
    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [
        {
          currency: "CNY",
          total_balance: "110.00",
          granted_balance: "10.00",
          topped_up_balance: "100.00",
        },
        {
          currency: "USD",
          total_balance: "15.50",
          granted_balance: "1.50",
          topped_up_balance: "14.00",
        },
      ],
    }

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response),
    )

    const result = await getDeepSeekBalance(mockModelRegistry)

    expect(result.balances).toHaveLength(2)
    expect(result.balances[0]?.currency).toBe("CNY")
    expect(result.balances[1]?.currency).toBe("USD")
  })

  it("should handle unavailable balance", async () => {
    const mockResponse: DeepSeekBalanceResponse = {
      is_available: false,
      balance_infos: [
        {
          currency: "USD",
          total_balance: "0.00",
          granted_balance: "0.00",
          topped_up_balance: "0.00",
        },
      ],
    }

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response),
    )

    const result = await getDeepSeekBalance(mockModelRegistry)

    expect(result.isAvailable).toBe(false)
    expect(result.balances[0]?.totalBalance).toBe("0.00")
  })

  it("should handle empty balance_infos", async () => {
    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [],
    }

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response),
    )

    const result = await getDeepSeekBalance(mockModelRegistry)

    expect(result.isAvailable).toBe(true)
    expect(result.balances).toHaveLength(0)
  })

  it("should make request to correct API endpoint with auth headers", async () => {
    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [
        {
          currency: "USD",
          total_balance: "10.00",
          granted_balance: "0.00",
          topped_up_balance: "10.00",
        },
      ],
    }

    let fetchUrl: string | undefined
    let fetchOptions: RequestInit | undefined

    mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
      fetchUrl = url
      fetchOptions = options
      return Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    })

    await getDeepSeekBalance(mockModelRegistry)

    expect(fetchUrl).toBe("https://api.deepseek.com/user/balance")
    expect(fetchOptions).toBeDefined()
    const headers = fetchOptions?.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer test-api-key")
    // Should include Accept-Encoding: identity (from buildAuthHeaders)
    expect(headers["Accept-Encoding"]).toBe("identity")
  })

  it("should use the provided API key from model registry", async () => {
    const customApiKey = "custom-api-key-12345"
    mockModelRegistry.getApiKeyForProvider = async () => customApiKey

    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [
        {
          currency: "USD",
          total_balance: "10.00",
          granted_balance: "0.00",
          topped_up_balance: "10.00",
        },
      ],
    }

    let fetchOptions: RequestInit | undefined

    mockFetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      fetchOptions = options
      return Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    })

    await getDeepSeekBalance(mockModelRegistry)

    const headers = fetchOptions?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${customApiKey}`)
  })

  it("should not include Authorization header when API key is missing", async () => {
    mockModelRegistry.getApiKeyForProvider = async () => null

    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [],
    }

    let fetchOptions: RequestInit | undefined

    mockFetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      fetchOptions = options
      return Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    })

    await getDeepSeekBalance(mockModelRegistry)

    const headers = fetchOptions?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it("should not include Authorization header when API key is proxy-managed sentinel", async () => {
    mockModelRegistry.getApiKeyForProvider = async () => "proxy-managed"

    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [],
    }

    let fetchOptions: RequestInit | undefined

    mockFetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      fetchOptions = options
      return Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    })

    await getDeepSeekBalance(mockModelRegistry)

    const headers = fetchOptions?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it("should map snake_case fields to camelCase", async () => {
    const mockResponse: DeepSeekBalanceResponse = {
      is_available: true,
      balance_infos: [
        {
          currency: "CNY",
          total_balance: "500.00",
          granted_balance: "50.00",
          topped_up_balance: "450.00",
        },
      ],
    }

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response),
    )

    const result = await getDeepSeekBalance(mockModelRegistry)

    expect(result.isAvailable).toBe(true)
    expect(result.balances[0]?.totalBalance).toBe("500.00")
    expect(result.balances[0]?.grantedBalance).toBe("50.00")
    expect(result.balances[0]?.toppedUpBalance).toBe("450.00")
  })
})
