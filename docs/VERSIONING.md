# Sonu Version Strategy

## v3.x.x - Desktop Legacy (Current)

- **Backend**: FasterWhisper (CTranslate2)

- **Platforms**: Windows, Linux, macOS

- **Distribution**: GitHub Releases (unsigned)

- **Focus**: Performance optimization, bug fixes

- **Timeline**: Until 2025

## v4.x - Mobile Expansion (In Development)

- **Backend**: Whisper.cpp (GGML)

- **Platforms**: Android, iOS (primary focus)

- **Distribution**: GitHub APK (Android), TestFlight/iOS (if cert funded)

- **Focus**: Mobile-native experience, CoreML/NNAPI acceleration

- **Timeline**: Q1 2025

## v5.x - iOS Polishing (Future)

- **Backend**: Whisper.cpp with iOS-specific optimizations

- **Platforms**: iOS only (refined experience)

- **Distribution**: App Store (requires $99/year Apple Dev account)

- **Focus**: App Store compliance, iCloud sync, Siri integration

## Development Workflow

- **Desktop work**: Commit to `main` branch, tag as `v3.x.x`

- **Mobile work**: Commit to `mobile-v4` branch, tag as `v4.x.x`

- **iOS polishing**: Commit to `ios-v5` branch, tag as `v5.x.x`

Never mix FasterWhisper and Whisper.cpp code in the same branch.

