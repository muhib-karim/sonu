# SONU Testing Suite

Comprehensive automated testing for SONU voice typing application.

## Overview

This testing suite provides automated tests for critical functionality including:
- Model download (Python and Node.js implementations)
- System-wide typing functionality
- Error handling and fallback mechanisms
- Integration between components

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── model_download.test.js
│   └── typing.test.js
├── integration/            # Integration tests for component interactions
│   ├── model_download.test.js
│   └── typing.test.js
├── e2e/                    # End-to-end tests for complete workflows
│   └── model_download_typing.test.js
├── setup.js                # Test setup and mocks
├── package.json            # Test dependencies
└── README.md               # This file
```

## Running Tests

### Prerequisites

```bash
# Install test dependencies
cd tests
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Model download tests
npm run test:model-download

# Typing tests
npm run test:typing
```

## Test Categories

### Unit Tests

**Location**: `tests/unit/`

- **model_download.test.js**: Tests model definitions, URL generation, and file verification
- **typing.test.js**: Tests typing logic with mocks for robotjs and Electron

**Features**:
- Fast execution
- No external dependencies
- Isolated component testing

### Integration Tests

**Location**: `tests/integration/`

- **model_download.test.js**: Tests Python downloader with real HTTP requests
- **typing.test.js**: Tests typing functionality with mocked robotjs

**Features**:
- Real HTTP requests (for download tests)
- Component interaction testing
- Error scenario coverage

### End-to-End Tests

**Location**: `tests/e2e/`

- **model_download_typing.test.js**: Tests complete workflows using Playwright

**Features**:
- Full application testing
- UI interaction testing
- Complete workflow validation

## Test Coverage

### Model Download

- ✅ Python downloader execution
- ✅ Download progress reporting
- ✅ Download resumption
- ✅ Mirror fallback
- ✅ Error handling
- ✅ Manual download URLs
- ✅ File verification

### System-wide Typing

- ✅ robotjs typing
- ✅ typeStringDelayed support
- ✅ Focus handling
- ✅ Error recovery
- ✅ Clipboard fallback
- ✅ Special character handling

## Writing New Tests

### Unit Test Example

```javascript
describe('My Component', () => {
  test('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example

```javascript
describe('My Integration', () => {
  test('should integrate components', async () => {
    const result = await integratedFunction();
    expect(result).toBeTruthy();
  });
});
```

## Mocking

The test suite uses Jest mocks for:
- `robotjs`: Typing functionality
- `electron`: BrowserWindow, clipboard
- `requests`: HTTP requests (in some tests)

See `tests/setup.js` for mock configurations.

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- Fast unit tests run first
- Integration tests run with network access
- E2E tests require full application environment

## Troubleshooting

### Tests Failing

1. **Check dependencies**: Run `npm install` in the `tests` directory
2. **Check Python**: Ensure Python 3.8+ is available for download tests
3. **Check network**: Integration tests require network access
4. **Check robotjs**: Ensure robotjs is installed for typing tests

### Common Issues

- **Python not found**: Set `PYTHON_PATH` environment variable
- **Network timeouts**: Increase timeout values in test files
- **Mock failures**: Check mock configurations in `setup.js`

## Best Practices

1. **Keep tests independent**: Each test should be able to run alone
2. **Use descriptive names**: Test names should clearly describe what they test
3. **Test edge cases**: Include tests for error scenarios
4. **Mock external dependencies**: Don't rely on external services in unit tests
5. **Clean up**: Remove test files and directories after tests complete

## Contributing

When adding new features:
1. Write unit tests first
2. Add integration tests for component interactions
3. Add E2E tests for complete workflows
4. Ensure all tests pass before submitting

## Version

This testing suite is part of SONU version 3.1.0.
