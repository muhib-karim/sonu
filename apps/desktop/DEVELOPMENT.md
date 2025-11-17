# Development Guide - SONU Desktop App

## Hot Reload & File Watching

The SONU desktop app includes **automatic hot reload** in development mode. This ensures that changes made by agents in Cursor (or any other editor) are immediately reflected in the running application.

### How It Works

1. **Automatic Detection**: When running in development mode (not packaged), the app automatically watches key files for changes
2. **File Watching**: The following files are monitored:
   - `main.js` - Electron main process
   - `renderer.js` - Renderer process (UI logic)
   - `preload.js` - Preload script
   - `index.html` - Main UI structure
   - `styles.css` - Styling
   - `src/**/*.js` - Source modules (style transformer, etc.)

3. **Automatic Reload**: When a file changes:
   - The app detects the change (with 500ms debounce to avoid rapid reloads)
   - Automatically reloads the renderer process
   - Changes are immediately visible in the running app

### Development Mode

Development mode is automatically enabled when:
- Running with `npm start` (not packaged)
- `NODE_ENV=development` environment variable is set

### Important Notes

#### main.js Changes
If `main.js` is modified, a **full app restart is required**. The app will show a notification:
> "main.js changed - Please restart the app to apply changes"

This is because `main.js` runs in the main Electron process and cannot be hot-reloaded.

#### Other Files
Changes to `renderer.js`, `preload.js`, `index.html`, `styles.css`, or files in `src/` will trigger an automatic reload of the renderer process.

### Workflow with Multiple Agents

When working with multiple agents in Cursor:

1. **Agent makes changes** → Files are saved automatically
2. **File watcher detects change** → Logs appear in console: `📝 File changed: filename.js - Reloading...`
3. **App reloads automatically** → Changes are immediately visible
4. **No manual restart needed** (except for `main.js` changes)

### Console Output

When file watching is active, you'll see:
```
🔧 Development mode: Setting up file watcher for hot reload
👀 Watching: main.js
👀 Watching: renderer.js
👀 Watching: preload.js
👀 Watching: index.html
👀 Watching: styles.css
👀 Watching source directory: src/
```

When a file changes:
```
📝 File changed: renderer.js - Reloading...
🔄 Reloading app due to change in: renderer.js
✅ App reloaded successfully
```

### Disabling Hot Reload

To disable hot reload (not recommended in development):
- Set `NODE_ENV=production` before starting
- Or package the app: `npm run build`

### Troubleshooting

**Changes not appearing?**
1. Check console for file watcher messages
2. Verify you're in development mode (not packaged)
3. For `main.js` changes, restart the app manually
4. Check file permissions (watcher needs read access)

**Multiple reloads?**
- The 500ms debounce should prevent this
- If issues persist, check for multiple file watchers or editor auto-save conflicts

**Performance issues?**
- File watching has minimal overhead
- If needed, you can disable it by setting `NODE_ENV=production`

## Best Practices

1. **Save files frequently** - Changes are only detected when files are saved
2. **Watch the console** - File watcher logs help debug reload issues
3. **Test after changes** - Even with hot reload, always test functionality
4. **Restart for main.js** - Remember to restart when changing main process code

## Integration with Cursor Agents

The hot reload system is designed to work seamlessly with Cursor's agent system:

- ✅ Changes made by agents are automatically saved
- ✅ File watcher detects saved changes
- ✅ App reloads automatically
- ✅ Changes are immediately visible
- ✅ No manual intervention needed (except for `main.js`)

This ensures a smooth development experience when multiple agents are working on the codebase simultaneously.

