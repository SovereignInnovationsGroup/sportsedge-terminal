# Codex Project Guidance

This repo is the SportsEdge terminal service checkout on `dev-server-1`.

## Environment

- Work from `/home/simon/development/sportsedge/terminal`.
- The parent `/home/simon/development/sportsedge` folder is an organizational container, not the Git repo for this service.
- Do not use `/opt` as a development working copy. `/opt` is reserved for deployed/runtime destinations.
- Treat `.env`, private keys, tokens, and deployment credentials as secrets. Do not print, copy, or commit secret values.

## Git

- GitHub repo: `SovereignInnovationsGroup/sportsedge-terminal`.
- The main branch tracks `origin/main`.
- Start work with `git status --short --branch`.
- Pull current code with `git pull --ff-only` when the working tree is clean.
- Keep generated output, logs, dependency folders, and secret files out of commits.
- Push only intentional commits after checking the diff.

## Project Notes

- This service owns the SportsEdge terminal-facing application surface.
- Coordinate cross-service changes with `/home/simon/development/sportsedge/api` and `/home/simon/development/sportsedge/worker` when API contracts or workflows change.
- Prefer existing scripts, Docker setup, and local patterns over adding new tooling.
