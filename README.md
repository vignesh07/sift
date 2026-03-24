# Sift

Sift is a local-first GitHub inbox organizer for people who live in pull requests and issues.

Instead of a flat notification list, it classifies activity into layers:

- `Needs You`: review requests, assignments, and PRs on repos you own
- `Your Circle`: activity from people you follow on repos you contribute to
- `Your Repos`: collaborators active on repos you maintain
- `Interesting`: starred repos, mentions, and high-engagement threads
- `Everything Else`: everything that did not hit a stronger signal

## Why it exists

GitHub notifications are good at collection and weak at prioritization. Sift pulls your inbox and adjacent activity into a local SQLite database, classifies it with explicit rules, and gives you a browser UI to work through the result.

This repo is intentionally local-only right now:

- your data stays on your machine
- the UI is served from a local server
- search runs against a local SQLite FTS index

Semantic ranking and richer filters can be layered on top later. The current goal is to make the non-AI baseline trustworthy first.

## Quick start

### Requirements

- Node.js 22+
- npm
- macOS Keychain if you want secure token storage without a fallback file

### Install

```bash
npm install
npm rebuild better-sqlite3
```

`better-sqlite3` is native. If dependencies were installed under the wrong architecture, rebuild it again.

### Run

```bash
npm start
```

The app will:

- build the web client
- start the local server
- open a browser tab unless you disable it

### Development

```bash
npm run dev
npm run dev:web
```

The server runs on `127.0.0.1` and the browser UI talks to `/api`.

## Authentication

Sift expects a GitHub personal access token that can read:

- `notifications`
- `read:user`
- `repo`

On macOS, Sift stores the token in Keychain when it can. If secure storage is unavailable, it falls back to the local config file under `~/.config/sift/config.json`.

## Environment

- `PORT` or `SIFT_PORT`: preferred port for the local server
- `SIFT_OPEN_BROWSER=0`: do not auto-open the browser on startup

If the preferred port is already in use, Sift will try the next available local port.

## Commands

```bash
npm test
npm run build
```

## Current scope

What is in:

- local sync from GitHub notifications and search
- local SQLite persistence
- layered prioritization UI
- local full-text search
- periodic background sync

What is not in yet:

- semantic search or embeddings
- advanced filtering and saved views
- multi-account support
- collaborative or hosted mode

## Before publishing

This repo still needs an explicit `LICENSE` file before a public open-source release.
