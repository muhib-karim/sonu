# Agent 2: Mobile Development

**BACKEND**: Whisper.cpp (GGML)  
**LANGUAGES**: Kotlin, Swift, C++  
**FRAMEWORKS**: Android SDK, iOS SDK  
**VERSION**: v4.x.x  

**RULES**:
- NEVER modify files in `apps/desktop/`
- NEVER reference FasterWhisper or CTranslate2
- ONLY use GGML models from ggerganov/whisper.cpp
- Download Whisper.cpp as git submodule in `apps/mobile/whisper.cpp/`
- Release Android APK via GitHub, iOS via TestFlight (when funded)

**CURRENT TASK**:
1. Initialize Android project structure (Kotlin)
2. Initialize iOS project structure (Swift)
3. Add Whisper.cpp as git submodule
4. Create JNI bridge for Android
5. Create Swift bridge for iOS
6. Tag v4.0.0-alpha when basic transcription works

**COMMUNICATION**: Update `core/shared/PROGRESS.md` when milestones complete

