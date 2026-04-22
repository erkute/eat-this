# Project Rules

## Git Hygiene (parallel sessions)

This repo is occasionally worked on in **multiple Claude sessions simultaneously**. The working tree and git index are shared between them, which means one session's staged changes can accidentally be committed by another.

**Before any `git commit`:**

1. Run `git status` and read it fully.
2. If there are staged changes you did not make yourself in this session, **stop and ask the user** — they may belong to another parallel session.
3. Only commit files you explicitly edited in this session. Never use `git add .`, `git add -A`, or `git add -u`. Always stage specific paths.
4. If the user confirms unknown staged files are unrelated, unstage them with `git restore --staged <path>` before committing.

**Before any `git push` to `main`:**

- Confirm the commit range only contains your intended changes (`git log origin/main..HEAD --stat`).
- If anything looks foreign, ask before pushing — `main` auto-deploys to Firebase App Hosting.

## Deployment

- `nextjs/` is the live app. Push to `main` → Firebase App Hosting auto-builds and deploys.
- Service worker cache bump (`nextjs/public/sw.js` `CACHE_VERSION`) is required when shipping breaking asset changes.
- CSS source lives in `nextjs/css/`, minified output in `nextjs/public/css/`. Never edit the minified file directly.
