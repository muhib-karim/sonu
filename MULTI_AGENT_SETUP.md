# Multi-Agent Orchestration Setup

This document describes the multi-agent development environment for SONU.

## Overview

The project is organized into two parallel development tracks:

- **Agent-1 (Desktop)**: v3.x.x using FasterWhisper + Electron
- **Agent-2 (Mobile)**: v4.x.x using Whisper.cpp + Native mobile

## Quick Start

### Activate Agent-1 (Desktop)

```bash
git checkout desktop-v3
cd apps/desktop
npm install
npm start
```

**Agent-1 Rules:**
- Work only in `apps/desktop/`
- Never touch `apps/mobile/`
- Use FasterWhisper only
- Release via GitHub Actions on v3.* tags

### Activate Agent-2 (Mobile)

```bash
git checkout mobile-v4
cd apps/mobile
# Add whisper.cpp submodule
git submodule add https://github.com/ggerganov/whisper.cpp whisper.cpp
```

**Agent-2 Rules:**
- Work only in `apps/mobile/`
- Never touch `apps/desktop/`
- Use Whisper.cpp only
- Release Android APK, iOS via TestFlight

## Agent Configuration

Each agent has a configuration file in `.cursor/agents/`:
- `.cursor/agents/desktop-agent.md` - Desktop agent instructions
- `.cursor/agents/mobile-agent.md` - Mobile agent instructions

## Communication

Agents communicate via:
- `core/shared/PROGRESS.md` - Progress updates
- `core/shared/CODE_OF_CONDUCT.md` - Collaboration rules
- Git branches (desktop-v3, mobile-v4)

## File Ownership

Check `.agent-ownership` files before editing:
- `apps/desktop/.agent-ownership` - Desktop territory
- `apps/mobile/.agent-ownership` - Mobile territory
- `core/shared/.agent-ownership` - Shared read-only

## Release Process

### Desktop (Agent-1)
```bash
git checkout desktop-v3
# Make changes...
git tag v3.9.0
git push origin v3.9.0
# GitHub Actions builds automatically
```

### Mobile (Agent-2)
```bash
git checkout mobile-v4
# Make changes...
git tag v4.0.0-alpha
git push origin v4.0.0-alpha
# Manual build and release
```

## Branch Strategy

```
main (stable)
├── desktop-v3 (Agent-1)
└── mobile-v4 (Agent-2)
```

Only the Architect (you) merges branches into main.

## Success Metrics

✅ **Desktop Agent-1 Complete When:**
- v3.9.0 tagged and released
- Build workflow runs successfully
- Auto-updater works
- No whisper.cpp code in desktop

✅ **Mobile Agent-2 Complete When:**
- Android transcription working
- iOS transcription working
- whisper.cpp integrated
- v4.0.0-alpha tagged

