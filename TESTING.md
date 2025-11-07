# SONU Testing Guide

## Quick Start

```bash
# Install test dependencies
cd tests
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:model-download
npm run test:typing
```

## Test Results Summary

### Model Download Tests

**Status**: ✅ Comprehensive test coverage implemented

**Coverage**:
- Python downloader execution
- Download progress reporting
- Download resumption
- Mirror fallback
- Error handling
- Manual download URLs
- File verification

**Known Issues**:
- Hugging Face URLs may return 404 (requires authentication or different URL format)
- Tests gracefully handle network failures

### System-wide Typing Tests

**Status**: ✅ Comprehensive test coverage implemented

**Coverage**:
- robotjs typing
- typeStringDelayed support
- Focus handling
- Error recovery
- Clipboard fallback
- Special character handling

**Known Issues**:
- Requires robotjs to be installed
- Some applications may block simulated keyboard input

## Running Tests

### Prerequisites

1. **Node.js**: v16.0.0 or higher
2. **Python**: 3.8 or higher (for download tests)
3. **Dependencies**: Run `npm install` in the `tests` directory

### Test Commands

```bash
# All tests
npm test

# Unit tests only (fast, no network)
npm run test:unit

# Integration tests (requires network)
npm run test:integration

# E2E tests (requires full app)
npm run test:e2e

# Specific functionality
npm run test:model-download
npm run test:typing

# Watch mode (for development)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/                    # Fast unit tests
│   ├── model_download.test.js
│   └── typing.test.js
├── integration/            # Integration tests
│   ├── model_download.test.js
│   └── typing.test.js
├── e2e/                    # End-to-end tests
│   └── model_download_typing.test.js
└── setup.js                # Test configuration
```

## Debugging Failed Tests

### Model Download Tests

**Issue**: Tests fail with 404 errors
- **Solution**: Check Hugging Face URL format - may require authentication
- **Workaround**: Tests gracefully handle network failures

**Issue**: Python not found
- **Solution**: Ensure Python 3.8+ is in PATH
- **Workaround**: Tests skip if Python unavailable

### Typing Tests

**Issue**: robotjs not available
- **Solution**: Install robotjs: `npm install robotjs`
- **Workaround**: Tests use mocks if robotjs unavailable

**Issue**: Tests fail on Windows
- **Solution**: Ensure application has proper permissions
- **Workaround**: Tests include Windows-specific handling

## Continuous Integration

Tests are designed for CI/CD:
- Fast unit tests run first
- Integration tests require network
- E2E tests require full environment

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main workflows covered

## Version

Testing suite for SONU version 3.1.0.

