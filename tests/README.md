# Integration Tests

This directory contains integration tests for the MCP-Web system.

## Running Tests

All tests are run using [Bun](https://bun.com) for fast test execution:

```bash
# Run all integration tests (runs sequentially to avoid port conflicts)
pnpm test:integration

# Run all tests (unit + integration)
pnpm test

# Run tests for a specific package
pnpm test:types
pnpm test:client
pnpm test:bridge
pnpm test:decompose

# Watch mode (re-runs on file changes)
pnpm test:watch
```

**Note:** Integration tests run **sequentially** (`--max-concurrency=1`) to ensure proper isolation between test files, as each file spawns its own bridge server on the same ports. This prevents cross-test contamination where sessions or state from one test file leak into another.

## Test Organization

- `integration/` - Integration tests that test multiple packages working together

## Troubleshooting

### Hanging Bridge Server

The integration tests spawn a bridge server as a separate process. If tests fail or are interrupted, the bridge process may continue running in the background, causing subsequent test runs to fail or use stale code.

**Symptoms:**
- Tests fail with connection errors
- Code changes don't take effect even after rebuilding
- Tests use old behavior after making changes

**Solution:**

Find and kill any hanging bridge processes:

```bash
# Find bridge processes
ps aux | grep -i bridge | grep -v grep

# Kill by process ID (replace PID with the actual number)
kill <PID>

# Or kill all bun processes running start-bridge.ts
pkill -f "start-bridge.ts"
```

The bridge process typically shows up as:
```
bun run /Users/.../tests/helpers/start-bridge.ts
```

## Adding New Tests

When adding integration tests:

1. Create test files in the `integration/` directory with `.test.ts` extension
2. Import from TypeScript source files using `.ts` extensions: `@mcp-web/{package}` or relative paths
3. Use Deno test syntax: `Deno.test('description', async () => { ... })`
4. Import assertions from `@std/assert`: `import { assert, assertEquals, assertRejects } from '@std/assert'`
5. Update this README with descriptions of new test files
