# SONU Multi-Agent Orchestration

This document describes the multi-agent development setup for SONU, where Desktop (v3.x.x) and Mobile (v4.x) development proceed in parallel.

## Quick Start

### Activate Agent-1 (Desktop)
```
@cursor-agent @apps/desktop

You are Agent-1 (Desktop). Work in `desktop-v3` branch. Complete v3.9.0 optimizations and release. Never touch `apps/mobile/`.
```

### Activate Agent-2 (Mobile)
```
@cursor-agent @apps/mobile

You are Agent-2 (Mobile). Work in `mobile-v4` branch. Initialize Whisper.cpp for Android and iOS. Never touch `apps/desktop/`.
```

## Project Structure

```
SONU/
├── apps/
│   ├── desktop/          # Agent-1 territory (v3.x.x)
│   │   ├── .agent-ownership
│   │   ├── .github/workflows/build-desktop.yml
│   │   └── [all desktop files]
│   │
│   └── mobile/           # Agent-2 territory (v4.x.x)
│       ├── .agent-ownership
│       ├── android/
│       ├── ios/
│       └── SETUP.md
│
├── core/
│   └── shared/           # Shared read-only resources
│       ├── .agent-ownership
│       ├── PROGRESS.md
│       ├── PROJECT_STRUCTURE.md
│       └── CODE_OF_CONDUCT.md
│
└── .cursor/
    └── agents/           # Agent configuration files
        ├── desktop-agent.md
        └── mobile-agent.md
```

## Git Workflow

### Desktop Releases (Agent-1)
```bash
git checkout desktop-v3
# ... make changes ...
git commit -m "Agent-1: [description]"
git tag v3.9.0
git push origin desktop-v3 v3.9.0
# GitHub Actions builds from tag
```

### Mobile Releases (Agent-2)
```bash
git checkout mobile-v4
# ... make changes ...
git commit -m "Agent-2: [description]"
git tag v4.0.0-alpha
git push origin mobile-v4 v4.0.0-alpha
```

## Agent Rules

1. **File Ownership**: Check `.agent-ownership` before editing
2. **Communication**: Update `core/shared/PROGRESS.md` when milestones complete
3. **No Conflicts**: Desktop never touches mobile, mobile never touches desktop
4. **Shared Resources**: Read-only access to `core/shared/`
5. **Version Tags**: Desktop uses v3.x.x, Mobile uses v4.x.x

## Current Status

See `core/shared/PROGRESS.md` for detailed status of both agents.

## Documentation

- **Desktop Agent**: `.cursor/agents/desktop-agent.md`
- **Mobile Agent**: `.cursor/agents/mobile-agent.md`
- **Project Structure**: `core/shared/PROJECT_STRUCTURE.md`
- **Code of Conduct**: `core/shared/CODE_OF_CONDUCT.md`

