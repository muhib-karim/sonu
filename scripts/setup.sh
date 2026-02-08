#!/bin/bash
# Quick setup script for SONU development environment

set -e

echo "🚀 SONU Development Environment Setup"
echo "======================================"

# Check dependencies
echo "Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust not found. Please install Rust"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    npm install -g bun
fi

echo "✅ All dependencies found"

# Setup Tauri app
echo ""
echo "📦 Setting up Tauri app..."
cd apps/tauri-v2
bun install
echo "✅ Tauri dependencies installed"

# Setup Legacy app
echo ""
echo "📦 Setting up Legacy app..."
cd ../desktop
npm install
echo "✅ Legacy dependencies installed"

# Setup tests
echo ""
echo "📦 Setting up tests..."
cd tests
npm install
echo "✅ Test dependencies installed"

# Setup pre-commit hooks
echo ""
echo "🔧 Setting up pre-commit hooks..."
cd ../../
if [ -d ".git" ]; then
    npm install -g husky lint-staged
    npx husky install
    npx husky add .husky/pre-commit "npx lint-staged"
    echo "✅ Pre-commit hooks configured"
else
    echo "⚠️  Not a git repository. Skipping pre-commit hooks."
fi

# Setup documentation
echo ""
echo "📚 Setting up documentation..."
cd docs
if ! command -v mdbook &> /dev/null; then
    echo "Installing mdBook..."
    cargo install mdbook
fi
mdbook build || echo "⚠️  mdBook not configured yet"
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Quick start commands:"
echo "  Tauri dev:    cd apps/tauri-v2 && bun run tauri dev"
echo "  Legacy dev:   cd apps/desktop && npm start"
echo "  Tests:        cd apps/tauri-v2 && bun run test"
echo "  Docs:         cd docs && mdbook serve"
echo ""
echo "Docker commands:"
echo "  docker-compose -f docker/docker-compose.yml up tauri-dev"
echo ""
