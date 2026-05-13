/**
 * DeepSeek Usage Checker - Pi Extension
 *
 * Provides a tool to check DeepSeek API balance and automatically displays
 * usage in the footer (information area) when using DeepSeek provider.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { DeepSeekBalanceCache, isCurrentModelDeepSeek, isDeepSeekProvider } from "./status"

export default function (pi: ExtensionAPI) {
  const cache = new DeepSeekBalanceCache()

  // Show footer at session start (only when using DeepSeek model)
  pi.on("session_start", async (_event, ctx) => {
    if (isCurrentModelDeepSeek(ctx)) {
      await cache.updateStatus(ctx)
    }
  })

  // Update footer on model select
  pi.on("model_select", async (event, ctx) => {
    if (isDeepSeekProvider(event.model.provider)) {
      await cache.updateStatus(ctx)
    } else {
      cache.clear(ctx)
    }
  })

  // Update footer after each turn
  pi.on("turn_end", async (_event, ctx) => {
    if (isCurrentModelDeepSeek(ctx)) {
      await cache.updateStatus(ctx)
    }
  })

  // Clear footer on session shutdown
  pi.on("session_shutdown", async (_event, ctx) => {
    cache.clear(ctx)
  })
}
