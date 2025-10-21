# Test Suite Documentation

## Overview

This test suite provides comprehensive coverage for the Apple Notes MCP Server, ensuring reliability and maintainability.

## Structure

```
tests/
├── __fixtures__/      # Test data and mock objects
├── __helpers__/       # Test utilities and helpers
├── __mocks__/         # Module mocks
├── integration/       # Integration tests
├── services/          # Service layer tests
└── utils/             # Utility function tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test tests/services/appleNotesManager.test.ts
```

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Writing Tests

### Unit Tests
- Mock external dependencies
- Test single units in isolation
- Focus on edge cases

### Integration Tests
- Test component interactions
- Verify MCP protocol compliance
- Test end-to-end workflows

## Mocking AppleScript

Since AppleScript requires macOS and the Notes app, we mock the execution:

```typescript
jest.mock('@/utils/applescript.js');

const mockRunAppleScript = runAppleScript as jest.MockedFunction<typeof runAppleScript>;
mockRunAppleScript.mockResolvedValue('mocked response');
```

## Test Categories

1. **Unit Tests**: Individual functions and classes
2. **Integration Tests**: MCP server protocol
3. **E2E Tests**: Full workflow simulation (future)
