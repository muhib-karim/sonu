# Sonu v4.0 Orchestration Quick Start Guide

## ✅ Setup Complete!

All configuration files are ready for the multi-agent orchestration.

## 🚀 Step-by-Step Instructions

### Step 1: Start Multi-Agent Sync

**In Cursor's chat interface** (Cmd/Ctrl + L), type:

```
/agentmd start --sync
```

Press Enter. This will activate all 4 agents:
- 🟣 UIAgent (Frontend/UI Designer)
- 🟡 BackendAgent (Backend Developer)
- 🟢 SystemAgent (Platform Engineer)
- 🔵 DocAgent (Documentation Writer)

### Step 2: Run Orchestration

Once agents are active, type:

```
/agentmd orchestrate
```

When prompted, paste this JSON payload:

```json
{
  "UIAgent": {
    "task": "Restore working UI from Sonu v3.0 baseline. Ensure all tabs, buttons, and settings respond correctly. Then rebuild the Glass UI layer with smooth blur, rounded panels, and frosted gradients using Tailwind and Framer Motion. Preserve existing logic. Test after each visual change."
  },
  "BackendAgent": {
    "task": "Fix and verify model download functionality. Remove previous broken logic, restore working download manager, and implement retry + resume logic with stable fallback URLs. Ensure IPC communication with frontend works without errors. Keep app fully offline compatible."
  },
  "SystemAgent": {
    "task": "Rebuild cross-platform build configuration for Electron + Python. Verify paths, resources, and dependency packaging for Windows, macOS, and Linux. Ensure stable execution of backend scripts. Auto-tag build as v4.0 after all agents finish."
  },
  "DocAgent": {
    "task": "Update README, CHANGELOG, and documentation to reflect Sonu v4.0 Glass UI Edition. Record fixes, new features, and architecture overview. Include recovery notes for any future regressions."
  }
}
```

**Or** simply reference the file:
```
@.agentmd_memory/orchestration_payload.json
```

### Step 3: Monitor Progress

Check what agents are doing:

```
/agentmd status
```

### Step 4: Review Changes

When agents complete their work:

```
/agentmd review
```

This shows a visual summary. Approve or reject each agent's changes.

### Step 5: Create Checkpoint

After successful completion:

```
/agentmd checkpoint sonu_stable_v4.0
```

## 📋 What Each Agent Will Do

### 🟣 UIAgent
- Restore working UI from v3.0 baseline
- Verify all tabs, buttons, settings work
- Rebuild Glass UI with glassmorphism
- Test after each visual change

### 🟡 BackendAgent
- Fix model download functionality
- Remove broken download logic
- Implement retry + resume logic
- Ensure IPC communication works
- Keep app offline compatible

### 🟢 SystemAgent
- Rebuild build configuration
- Verify cross-platform compatibility
- Test Electron + Python paths
- Auto-tag as v4.0 when complete

### 🔵 DocAgent
- Update README and CHANGELOG
- Document v4.0 Glass UI Edition
- Record fixes and new features
- Include recovery notes

## 🔄 Rollback Option

If something goes wrong:

```
/agentmd revert sonu_stable_v3.0
```

## 📁 Configuration Files

All files are ready:
- ✅ `.agentmd.json` - Agent configuration
- ✅ `.agentmd_memory/shared_context.json` - Shared goals
- ✅ `.agentmd_memory/orchestration_payload.json` - Task assignments
- ✅ `.agentmd_memory/RESTORE_ORCHESTRATION.md` - Full documentation

## 🎯 Expected Outcome

After orchestration:
- ✅ Sonu restored to working v3.0 state
- ✅ All tabs, buttons, settings functional
- ✅ Model downloads working and stable
- ✅ Glass UI rebuilt with proper design
- ✅ Cross-platform packaging verified
- ✅ Documentation updated for v4.0

## 💡 Tips

1. **Monitor Progress**: Use `/agentmd status` frequently
2. **Review Carefully**: Check `/agentmd review` before approving
3. **Create Checkpoint**: Always tag successful builds
4. **Test After**: Run the app to verify everything works

---

**Ready to start?** Run `/agentmd start --sync` in Cursor's chat interface!

