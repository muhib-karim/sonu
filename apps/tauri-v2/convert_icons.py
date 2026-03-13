#!/usr/bin/env python3
"""
Icon conversion script for SONU Tauri app
Converts source images to required icon sizes

Usage:
    python convert_icons.py <source_image_path>
"""

import sys
import subprocess
from pathlib import Path

def convert_icons(source_path):
    """Convert source image to various icon sizes"""
    if len(sys.argv) < 2:
        print("Usage: python convert_icons.py <source_image_path>")
        sys.exit(1)
    
    source = Path(source_path)
    if not source.exists():
        print(f"Error: Source image not found: {source}")
        sys.exit(1)
    
    # Get project directories
    script_dir = Path(__file__).parent
    icons_dir = script_dir / "src-tauri" / "icons"
    resources_dir = script_dir / "src-tauri" / "resources"
    
    icons_dir.mkdir(parents=True, exist_ok=True)
    resources_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Converting {source.name}...")
    print(f"Icons directory: {icons_dir}")
    print(f"Resources directory: {resources_dir}")
    
    # Icon sizes for Tauri
    sizes = [32, 128, 256, 512]
    
    for size in sizes:
        output = icons_dir / f"{size}x{size}.png"
        try:
            subprocess.run([
                "magick", "convert", str(source),
                "-resize", f"{size}x{size}",
                "-background", "none",
                str(output)
            ], check=True)
            print(f"  ✓ Created {output.name}")
        except subprocess.CalledProcessError as e:
            print(f"  ✗ Failed to create {output.name}: {e}")
        except FileNotFoundError:
            print("  ✗ ImageMagick not found. Please install ImageMagick.")
            break
    
    print("Done!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_icons.py <source_image_path>")
        sys.exit(1)
    
    convert_icons(sys.argv[1])
