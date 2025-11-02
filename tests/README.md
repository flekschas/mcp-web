# Integration Tests

This directory contains integration tests for the MCP-Web system.

## Running Tests

All tests are run using [Bun](https://bun.com) for fast test execution:

```bash
# Run all integration tests
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

## Test Organization

- `integration/` - Integration tests that test multiple packages working together

## Adding New Tests

When adding integration tests:

1. Create test files in the `integration/` directory with `.test.ts` extension
2. Import from TypeScript source files using `.ts` extensions: `@mcp-web/{package}` or relative paths
3. Use Deno test syntax: `Deno.test('description', async () => { ... })`
4. Import assertions from `@std/assert`: `import { assert, assertEquals, assertRejects } from '@std/assert'`
5. Update this README with descriptions of new test files
