# Sift

Sift is a local-first GitHub inbox organizer for people who live in pull requests and issues.

GitHub notifications are good at collecting activity and weak at prioritizing it. Sift pulls your inbox and adjacent repo activity into a local SQLite database, classifies it with explicit rules, and gives you a browser UI to work through it by signal instead of by noise.

## Layers

- `Needs You`: review requests, assignments, and PRs on repos you own
- `Your Circle`: activity from people you follow on repos you contribute to
- `Your Repos`: collaborator activity on repos you maintain
- `Interesting`: mentions, high-engagement threads, and hotter starred-repo activity
- `Everything Else`: background activity and lower-signal starred-repo activity

## Why local-first

- your data stays on your machine
- search runs locally against SQLite FTS
- setup is simple: one server, one browser UI, one GitHub token

Semantic ranking and richer filtering can come later. The current goal is to make the non-AI baseline opinionated, useful, and trustworthy.

## Platforms

Sift is intended to run locally on:

- macOS
- Linux
- Windows

On Linux, secure token storage uses Secret Service when available. On Windows, it uses the Windows Credential Vault. On macOS, it uses Keychain. If no secure credential store is available, Sift falls back to local config storage.

## Requirements

- Node.js 22+
- npm

On Apple Silicon, use native `arm64` Node. If `node -p process.arch` prints `x64`, you are running under Rosetta and native modules like `better-sqlite3` may break.

## Quick start

```bash
npm install
npm run rebuild:native
npm start
```

Then open the local URL printed by the server, usually `http://127.0.0.1:4185`.

If that port is busy, Sift will automatically move to the next available local port.

## GitHub token

Sift expects a GitHub personal access token with:

- `notifications`
- `read:user`
- `repo`

Sift stores the token in:

- macOS: Keychain
- Linux: Secret Service
- Windows: Credential Vault

If secure storage is unavailable, it falls back to the local config file in `~/.config/sift/config.json`.

## Commands

```bash
npm start
npm run dev
npm run dev:web
npm run build
npm test
```

## Environment

- `PORT` or `SIFT_PORT`: preferred local server port
- `SIFT_OPEN_BROWSER=0`: do not auto-open a browser tab on startup

## Current scope

Included now:

- local sync from GitHub notifications and search
- layered prioritization UI
- local full-text search
- periodic background sync
- local SQLite persistence
- secure token storage on macOS, Linux, and Windows when OS services are available

Not included yet:

- semantic search or embeddings
- saved views and deeper filters
- multi-account support
- hosted or collaborative mode

## License

[MIT](./LICENSE)
