# Installing SONU

## Download

Get the latest release for your platform from [GitHub Releases](https://github.com/muhib-karim/sonu/releases).

| Platform | Format | File |
|----------|--------|------|
| **Windows x64** | Installer | `sonu_x86_64-pc-windows-msvc.nsis.exe` |
| **Windows ARM64** | Installer | `sonu_aarch64-pc-windows-msvc.nsis.exe` |
| **macOS Apple Silicon** | DMG | `sonu_aarch64-apple-darwin.dmg` |
| **macOS Intel** | DMG | `sonu_x86_64-apple-darwin.dmg` |
| **Linux (Ubuntu 24.04+)** | AppImage / RPM | `sonu_*.AppImage` or `sonu_*.rpm` |
| **Linux (Ubuntu 22.04)** | Deb | `sonu_*.deb` |

## Platform Notes

### Windows
Run the `.exe` installer. If SmartScreen warns you, click **"More info"** → **"Run anyway"**.

### macOS
Open the `.dmg`, drag SONU to Applications. On first launch: right-click → **"Open"** → **"Open"**.

### Linux
```bash
chmod +x sonu_*.AppImage
./sonu_*.AppImage
```

Or install the `.deb`:
```bash
sudo dpkg -i sonu_*.deb
```

## Why Unsigned?

SONU is free and open-source. Code signing certificates cost $300+/year. Your security comes from transparent code at [github.com/muhib-karim/sonu](https://github.com/muhib-karim/sonu).

## Building from Source

**Prerequisites**: [Bun](https://bun.sh), [Rust toolchain](https://rustup.rs), platform-specific Tauri v2 dependencies.

```bash
git clone https://github.com/muhib-karim/sonu.git
cd sonu/apps/tauri-v2
bun install
bun run tauri dev    # Development
bun run tauri build  # Production build
```

See [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/) for system-level dependencies.

