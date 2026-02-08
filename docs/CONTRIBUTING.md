# Contributing to SONU Tauri v2

Thank you for your interest in contributing to SONU! This document provides guidelines and best practices for contributing to the Tauri v2 version of the application.

## Getting Started

### Prerequisites

- **Git**: For version control
- **Rust**: Latest stable version (install via [rustup](https://rustup.rs/))
- **Node.js**: v20 or higher
- **Bun**: Package manager (install via [bun.sh](https://bun.sh))

### Setting Up Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/SONU.git
   cd SONU/apps/tauri-v2
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Download required models**
   ```bash
   mkdir -p src-tauri/resources/models
   curl -o src-tauri/resources/models/silero_vad_v4.onnx \
     https://blob.handy.computer/silero_vad_v4.onnx
   ```

4. **Run the app in development mode**
   ```bash
   bun run tauri dev
   ```

## Development Workflow

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or updates

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat: add keyboard shortcuts overlay`
- `fix: resolve audio device selection issue`
- `docs: update API documentation`
- `refactor: simplify error handling`
- `test: add unit tests for settings module`

### Code Style

#### Frontend (TypeScript/React)

- Use TypeScript strict mode
- Follow ESLint rules (run `bun run lint`)
- Format with Prettier (run `bun run format`)
- Use functional components with hooks
- Follow the existing component structure

#### Backend (Rust)

- Follow Rust fmt (run `cargo fmt`)
- Address Clippy warnings (run `cargo clippy`)
- Use meaningful variable names
- Add doc comments for public APIs
- Handle errors gracefully with `Result` and `Option`

### Testing

#### Frontend Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

#### Backend Tests

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture
```

### Adding New Features

1. **Create an issue first** for significant changes
2. **Write tests** for new functionality
3. **Update documentation** as needed
4. **Follow the existing patterns** in the codebase

### Pull Request Process

1. **Ensure all tests pass**
   ```bash
   bun run lint
   bun run format:check
   cd src-tauri && cargo test && cargo clippy
   ```

2. **Update the changelog** if applicable

3. **Create a descriptive PR** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - Test results

4. **Address review feedback** promptly

5. **Squash commits** before merging

## Code Organization

### Frontend Structure

```
src/
├── components/           # React components
│   ├── feature-name/    # Feature-specific components
│   │   ├── Component.tsx
│   │   ├── Component.test.tsx
│   │   └── index.ts
│   └── ui/              # Reusable UI components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and types
├── store/               # Zustand stores
└── types/               # Additional TypeScript types
```

### Backend Structure

```
src-tauri/src/
├── managers/            # Core business logic
│   ├── feature.rs
│   └── feature_tests.rs
├── commands/            # Tauri command handlers
├── audio_toolkit/       # Low-level audio processing
├── tests/              # Unit tests
└── lib.rs              # Library entry point
```

## Adding New Commands

To add a new Tauri command:

1. **Define the command in the appropriate module**
   ```rust
   // src-tauri/src/commands/my_feature.rs
   #[tauri::command]
   #[specta::specta]
   pub async fn my_command(
       app_handle: AppHandle,
       arg: String,
   ) -> Result<String, String> {
       // Implementation
       Ok(result)
   }
   ```

2. **Register the command in `lib.rs`**
   ```rust
   .commands(collect_commands![
       // ... existing commands
       commands::my_feature::my_command,
   ])
   ```

3. **Add TypeScript types if needed**
   ```typescript
   // src/lib/types.ts
   export interface MyCommandResult {
       // ...
   }
   ```

4. **Create frontend binding**
   ```typescript
   // Use the auto-generated binding from src/bindings.ts
   import { commands } from '@/bindings';
   
   const result = await commands.myCommand(arg);
   ```

5. **Add tests**
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;
       
       #[test]
       fn test_my_command() {
           // Test implementation
       }
   }
   ```

## Documentation

- Update relevant documentation when adding features
- Add doc comments to public functions
- Update README.md if needed
- Add examples for complex features

## Performance Considerations

- Profile with React DevTools before optimizing
- Use React.memo for expensive components
- Lazy load routes with React.lazy
- Minimize re-renders with proper state management
- Profile Rust code with cargo flamegraph

## Security

- Never log sensitive information (API keys, passwords)
- Validate all user inputs
- Use parameterized queries for database operations
- Follow OWASP guidelines for web security
- Run `cargo audit` regularly

## Getting Help

- Check existing issues and documentation
- Ask in GitHub Discussions
- Join our community chat (if available)
- Create a new issue with:
  - Clear description
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (OS, app version)
  - Relevant logs

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- Release notes
- CONTRIBUTORS.md (if created)

Thank you for contributing to SONU!
