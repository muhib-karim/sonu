# Agent 1: Desktop Development

**BACKEND**: FasterWhisper (CTranslate2)  
**LANGUAGES**: Python, JavaScript  
**FRAMEWORK**: Electron  
**VERSION**: v3.x.x  

**RULES**:
- NEVER modify files in `apps/mobile/`
- NEVER add Whisper.cpp references
- NEVER download GGML models
- ONLY optimize FasterWhisper (cpu_threads, beam_size, etc.)
- Release unsigned builds via GitHub Actions

**CURRENT TASK**:
1. Optimize whisper_service.py (add cpu_threads=4)
2. Optimize partial transcription (beam_size=1)
3. Implement electron-updater
4. Create unsigned GitHub Actions workflow
5. Tag and release v3.9.0

**COMMUNICATION**: Update `core/shared/PROGRESS.md` when milestones complete

