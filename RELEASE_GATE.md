# ✅ SONU Release Gate – v3.x Exit Criteria

This document lists **every user-facing behaviour** that must be covered by automated tests and **100 % green in CI** before any new milestone (M1 cross-platform, plugins, etc.) can start.

| Behaviour | Test Level | Status | Run Command |
|-----------|------------|--------|-------------|
| Mic → Whisper → Type loop | unit | exists | `cd tests && npm run test:unit` |
| Mic → Whisper → Type loop | integration | exists | `cd tests && npm run test:integration` |
| Mic → Whisper → Type loop | e2e | flaky | `cd tests && npm run test:e2e` |
| Settings UI (themes, model selector) | unit | exists | `cd tests && npm run test:unit renderer.test.js` |
| Settings UI (themes, model selector) | e2e | missing | `cd tests && npm run test:e2e` |
| Model downloader (online) | integration | exists | `cd tests && npm run test:integration model_download.test.js` |
| Model downloader (offline) | e2e | missing | `cd tests && npm run test:e2e model_download_typing.test.js` |
| Keyboard shortcuts | unit | exists | `cd tests && npm run test:unit main.test.js` |
| Keyboard shortcuts | e2e | missing | add new spec → `npm run test:e2e` |
| Accessibility (speech / tray) | unit | none | add new spec → `npm run test:unit` |
| Accessibility (speech / tray) | e2e | missing | add new spec → `npm run test:e2e` |
| Showcase script produces MP4/PNG | n/a | exists | `npm run showcase` |
| Auto-screenshots script produces PNG | n/a | exists | `npm run auto-screenshots` |

## Green Gate Checklist
- [ ] Unit suite passes (`npm run test:unit`)  
- [ ] Integration suite passes (`npm run test:integration`)  
- [ ] E2E suite passes (`npm run test:e2e`)  
- [ ] Showcase artefact created (`assets/showcase/showcase.mp4`)  
- [ ] Auto-screenshots artefact created (`screenshots/*.png`)  
- [ ] All suites emit Jest JSON reports consumed by CI  
- [ ] No `setImmediate` or timeout flakes in E2E logs  

> Context Curator will update Status after every CI run.  
> When every box is ticked, M1 cross-platform work may begin.