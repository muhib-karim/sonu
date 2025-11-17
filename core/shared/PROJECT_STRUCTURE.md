# Project Structure

## Overview

This project uses a multi-agent development approach where:
- **Agent-1 (Desktop)**: Develops v3.x.x using FasterWhisper
- **Agent-2 (Mobile)**: Develops v4.x.x using Whisper.cpp

## Directory Structure

```
SONU/
├── apps/
│   ├── desktop/          # Agent-1 territory (v3.x.x)
│   │   ├── src/
│   │   ├── tests/
│   │   ├── docs/
│   │   ├── .github/
│   │   │   └── workflows/
│   │   └── .agent-ownership
│   │
│   └── mobile/           # Agent-2 territory (v4.x.x)
│       ├── android/
│       │   └── app/
│       │       ├── src/main/
│       │       │   ├── java/com/sonu/
│       │       │   └── cpp/
│       │       └── CMakeLists.txt
│       ├── ios/
│       │   └── Sonu/
│       │       └── Sonu/
│       │           ├── Models/
│       │           ├── Views/
│       │           └── ViewModels/
│       ├── whisper.cpp/  # Git submodule
│       └── .agent-ownership
│
├── core/
│   └── shared/           # Shared read-only resources
│       ├── models/      # Model documentation
│       ├── docs/        # Shared documentation
│       ├── scripts/     # Shared build scripts
│       └── .agent-ownership
│
└── .cursor/
    └── agents/          # Agent configuration files
        ├── desktop-agent.md
        └── mobile-agent.md
```

## Git Branching Strategy

```
main (stable releases)
├── desktop-v3 (Agent-1 working branch)
│   └── Tags: v3.9.0, v3.10.0, etc.
└── mobile-v4 (Agent-2 working branch)
    └── Tags: v4.0.0, v4.1.0, etc.
```

## Versioning

- **Desktop**: v3.x.x (FasterWhisper, Electron)
- **Mobile**: v4.x.x (Whisper.cpp, Native)

## Agent Boundaries

- Desktop agent NEVER touches `apps/mobile/`
- Mobile agent NEVER touches `apps/desktop/`
- Both agents can READ `core/shared/` but should coordinate changes
- Check `.agent-ownership` files before editing

