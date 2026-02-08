#!/bin/bash
# Run comprehensive test suite

set -e

echo "🧪 SONU Test Suite"
echo "=================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED${NC}: $2"
    else
        echo -e "${RED}❌ FAILED${NC}: $2"
    fi
}

echo ""
echo "📋 Running code quality checks..."

# Lint Tauri app
cd apps/tauri-v2
bun run lint
print_status $? "Tauri linting"

# Type check Tauri
bun run typecheck
print_status $? "Tauri type checking"

# Format check
cd src-tauri
cargo fmt -- --check
print_status $? "Rust formatting"

# Clippy
cargo clippy -- -D warnings
print_status $? "Rust clippy"

echo ""
echo "🧪 Running unit tests..."

# Rust tests
cargo test --verbose
print_status $? "Rust unit tests"

# Frontend tests
cd ..
bun run test
print_status $? "Frontend unit tests"

echo ""
echo "🔒 Running security scans..."

# npm audit
npm audit --audit-level=moderate
print_status $? "npm audit"

# cargo audit
cd src-tauri
cargo audit
print_status $? "cargo audit"

echo ""
echo "📊 Running benchmarks..."

cargo bench
print_status $? "Performance benchmarks"

echo ""
echo "✨ All tests complete!"
