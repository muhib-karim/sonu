# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.6.x (Tauri) | :white_check_mark: |
| 2.4.x – 2.5.x (Tauri) | :white_check_mark: |
| 2.2.x – 2.3.x (Tauri) | :x:                |
| 2.0.x – 2.1.x (Tauri) | :x:                |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public issue
2. Email security details to: [GitHub Security](https://github.com/muhib-karim/sonu/security/advisories/new)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Features

- **Local-First Processing**: Audio capture and local transcription happen entirely on-device
- **Network Is Optional**: Cloud transcription and LLM post-processing are strictly opt-in and disabled by default; the only other outbound traffic is model downloads and update checks
- **Local Storage**: Settings and history stay on-device (JSON settings, SQLite history); API keys are stored in the OS keychain, never in plain files
- **No Telemetry**: Zero tracking or analytics
- **Open Source**: Full code transparency

## Best Practices

- Keep dependencies updated
- Review code changes carefully
- Test security-critical features
- Follow secure coding practices

## Response Time

We aim to respond to security reports within 48 hours and provide updates within 7 days.

Thank you for helping keep SONU secure!

