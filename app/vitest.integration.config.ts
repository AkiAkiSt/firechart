import { defineConfig } from 'vitest/config'

// End-to-end tests against a local Supabase stack. See integration/ and
// .github/workflows/database.yml. Run with `npm run test:integration`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
})
