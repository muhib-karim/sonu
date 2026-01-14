"""
Convert SONU icon to proper PNG format and create all required icon sizes.
"""
from PIL import Image
import os

# Source image path
source_path = r"C:\Users\Muhib\.gemini\antigravity\brain\12ec73f7-0547-4335-94fb-d846381e35c6\sonu_app_icon_1768207547960.png"

# Target directory
icons_dir = r"C:\Users\Muhib\Desktop\Projects\SONU\apps\tauri-v2\src-tauri\icons"
resources_dir = r"C:\Users\Muhib\Desktop\Projects\SONU\apps\tauri-v2\src-tauri\resources"

# Open the source image
print(f"Opening source: {source_path}")
img = Image.open(source_path)

# Convert to RGBA (proper PNG with transparency support)
if img.mode != 'RGBA':
    img = img.convert('RGBA')

print(f"Image mode: {img.mode}, size: {img.size}")

# Icon sizes for Tauri (Windows/macOS/Linux)
icon_sizes = {
    "icon.png": 512,
    "logo.png": 512,
    "32x32.png": 32,
    "64x64.png": 64,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
    "StoreLogo.png": 50,
}

# Create all icon sizes
for filename, size in icon_sizes.items():
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    output_path = os.path.join(icons_dir, filename)
    resized.save(output_path, "PNG")
    print(f"Created: {filename} ({size}x{size})")

# Create tray icons (small versions)
tray_sizes = {
    "tray-icon.png": 16,
    "tray-icon-32.png": 32,
}

for filename, size in tray_sizes.items():
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    output_path = os.path.join(icons_dir, filename)
    resized.save(output_path, "PNG")
    print(f"Created tray icon: {filename} ({size}x{size})")

# Create resource icons
resource_icons = {
    "sonu.png": 64,
    "tray_idle.png": 32,
    "tray_idle_dark.png": 32,
}

for filename, size in resource_icons.items():
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    output_path = os.path.join(resources_dir, filename)
    resized.save(output_path, "PNG")
    print(f"Created resource: {filename} ({size}x{size})")

# Create ICO file for Windows (multiple sizes embedded)
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_images = []
for size in ico_sizes:
    resized = img.resize(size, Image.Resampling.LANCZOS)
    ico_images.append(resized)

ico_path = os.path.join(icons_dir, "icon.ico")
ico_images[0].save(ico_path, format='ICO', sizes=ico_sizes)
print(f"Created: icon.ico with sizes {ico_sizes}")

print("\nAll icons created successfully!")
