import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        // pi-usage-lib ships extensionless ESM relative imports, which
        // Node cannot resolve; inline it so Vite handles resolution.
        inline: ["@alexanderfortin/pi-usage-lib"],
      },
    },
  },
})
