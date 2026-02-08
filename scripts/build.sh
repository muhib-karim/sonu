#!/bin/bash
# Build script for all platforms

set -e

echo "🔨 SONU Build Script"
echo "===================="

# Parse arguments
TARGET=${1:-all}
RELEASE=${2:-false}

echo "Target: $TARGET"
echo "Release mode: $RELEASE"

cd apps/tauri-v2

if [ "$RELEASE" = "true" ]; then
    BUILD_CMD="bun run tauri build"
else
    BUILD_CMD="bun run tauri build --debug"
fi

case $TARGET in
    linux)
        echo "Building for Linux..."
        $BUILD_CMD --target x86_64-unknown-linux-gnu
        ;;
    windows)
        echo "Building for Windows..."
        $BUILD_CMD --target x86_64-pc-windows-msvc
        ;;
    macos)
        echo "Building for macOS (Universal)..."
        $BUILD_CMD --target universal-apple-darwin
        ;;
    macos-intel)
        echo "Building for macOS (Intel)..."
        $BUILD_CMD --target x86_64-apple-darwin
        ;;
    macos-arm)
        echo "Building for macOS (ARM)..."
        $BUILD_CMD --target aarch64-apple-darwin
        ;;
    all)
        echo "Building for all platforms..."
        $BUILD_CMD
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: $0 [linux|windows|macos|macos-intel|macos-arm|all] [true|false]"
        exit 1
        ;;
esac

echo "✅ Build complete!"
echo "Output location: src-tauri/target/release/bundle/"
