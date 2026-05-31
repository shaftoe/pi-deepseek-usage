/**
 * DeepSeek Usage Checker - Pi Extension
 *
 * Uses pi-usage-lib's createUsageExtension factory to handle all
 * event registration, provider matching, caching, and footer lifecycle.
 */

import { createUsageExtension } from "@alexanderfortin/pi-usage-lib"
import type { ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { getDeepSeekBalance } from "./api"
import { renderDeepSeekStatus } from "./status"

// Cast through unknown because pi-usage-lib may pin a different version
// of @earendil-works/pi-coding-agent, causing TS2883 type incompatibility.
export default createUsageExtension({
  providerPrefix: "deepseek",
  statusKey: "deepseek-usage",
  label: "DeepSeek",
  fetchUsage: getDeepSeekBalance,
  renderStatus: renderDeepSeekStatus,
}) as unknown as ExtensionFactory
