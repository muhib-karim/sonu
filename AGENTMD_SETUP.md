# AgentMD Multi-Agent Setup Guide

## Quick Start

### 1. Activate All Agents

In Cursor's chat interface, type:

```
/agentmd start --sync
```

This will activate all 4 agents:
- 🟣 **UIAgent** - Frontend/UI Design
- 🟡 **BackendAgent** - Backend Developer  
- 🟢 **SystemAgent** - Platform Engineer
- 🔵 **DocAgent** - Documentation Writer

### 2. Assign Model Download Fix Task

Once agents are active, assign the task:

```
@BackendAgent Fix the Whisper model download system. The downloads are failing at 100% with timeout errors, showing 0MB at 30%, and getting stuck at 50%. Implement multiple source mirrors, proper progress tracking, and allow users to select custom download locations. Files to fix: backend/model_manager.py, main.js, renderer.js
```

### 3. Monitor Agent Status

Check what agents are doing:

```
/agentmd status
```

### 4. Review Changes

When agents complete their work:

```
/agentmd review
```

This shows a visual summary of all changes. Approve or reject each agent's work.

## Agent Configuration

### UIAgent
- **Role**: Frontend/UI Design
- **Focus**: Apple Glass UI, animations, layout polish
- **Files**: `index.html`, `styles.css`, `renderer.js`

### BackendAgent
- **Role**: Backend Developer
- **Focus**: Whisper model downloads, IPC bridge, system sync
- **Files**: `backend/model_manager.py`, `main.js`, `preload.js`

### SystemAgent
- **Role**: Platform Engineer
- **Focus**: Build scripts, packaging, dependencies
- **Files**: `package.json`, `scripts/`, `build/`

### DocAgent
- **Role**: Documentation Writer
- **Focus**: Changelog, README, user guides
- **Files**: `README.md`, `CHANGELOG.md`, `docs/`

## Shared Memory

All agents share context through `.agentmd_memory/shared_context.json`:
- Project state and goals
- Recent updates
- Active tasks
- Design rules
- Technical constraints

Agents sync every 10 seconds automatically.

## Commands Reference

| Command | Purpose |
|---------|---------|
| `/agentmd start --sync` | Start all agents with memory sync |
| `/agentmd status` | Show agent status and current tasks |
| `/agentmd review` | Review and approve agent changes |
| `/agentmd pause UIAgent` | Pause a specific agent |
| `/agentmd resume UIAgent` | Resume a paused agent |
| `/agentmd diff` | Show diff vs last sync |
| `/agentmd revert sonu_stable_v4.0` | Revert to stable version |

## Conflict Resolution

When multiple agents edit the same file:
- **Smart-merge**: Automatically merges non-overlapping changes
- **Auto-approve-safe**: Safe changes are auto-approved
- **Manual review**: Conflicts require manual review

## Version Checkpointing

Stable versions are tagged (e.g., `sonu_stable_v4.0`) for easy rollback:

```bash
/agentmd revert sonu_stable_v4.0
```

## Current Active Task

**BackendAgent** is assigned to fix the model download system:
- Multiple source mirrors
- Proper progress tracking
- Custom download location
- Timeout handling
- Stuck download detection

See `.agentmd_memory/AGENT_TASKS.md` for full task details.

