/**
 * DeepSeek Usage Checker - Pi Extension
 *
 * Uses pi-usage-lib's createUsageExtension factory to handle all
 * event registration, provider matching, caching, and footer lifecycle.
 */

import { createUsageExtension } from "@alexanderfortin/pi-usage-lib"
import { getDeepSeekBalance } from "./api"
import { renderDeepSeekStatus } from "./status"

export default createUsageExtension({
  providerPrefix: "deepseek",
  statusKey: "deepseek-usage",
  label: "DeepSeek",
  fetchUsage: getDeepSeekBalance,
  renderStatus: renderDeepSeekStatus,
})
