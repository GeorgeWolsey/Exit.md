# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for a charity organization. Currently a single placeholder `index.html` at the repo root - no framework, no `package.json`, no build/lint/test tooling. Preview locally by opening `index.html` in a browser.

## Deployment (Azure Static Web Apps)

- **Pushing to `main` deploys to production** at https://lively-sand-042b83310.4.azurestaticapps.net via `.github/workflows/azure-static-web-apps-lively-sand-042b83310.yml` (Azure-generated; auth uses the `AZURE_STATIC_WEB_APPS_API_TOKEN_LIVELY_SAND_042B83310` repo secret plus a GitHub OIDC token).
- PRs targeting `main` get a temporary preview environment; closing the PR deletes it (`close_pull_request_job`).
- There is no `workflow_dispatch` trigger - a run can only be started by a push or PR event.
- Verify a deploy against the live site (e.g. `curl -s <live-url>/`), not just the green Actions run.

## The repo root is the published site

The workflow uses `app_location: "/"` with `skip_app_build: true`, so **every non-dot file in the repo is uploaded as-is and publicly served**. Dot-prefixed paths are not served (`/.github/...` returns 404) - that is why this file lives in `.claude/` instead of the root. Keep notes, drafts, scripts and tooling files out of non-dot paths, or move the site into a subfolder (e.g. `src/`) and point `app_location` at it.

SWA routing, headers, redirects and a custom 404 page are configured via `staticwebapp.config.json` in the app location (none exists yet).

## Versioning design iterations (required)

The site is for **EXIT**, a project of AO "Viață fără limită" being rebuilt after it was abandoned. The user wants every iteration of the design kept:

- Saved iterations live in `.versions/vN-<slug>/` (`index.html` plus a one-paragraph `NOTES.md` saying what changed and why). Dot-prefixed, so never deployed.
- The repo-root `index.html` is the **working copy**: the active version, and what deploys.
- Before starting a new iteration, make sure the current working copy is already saved as a version. Iterate in the root `index.html`, then snapshot it to the next `vN-<slug>/` when the iteration is done.
- When asked for several alternatives, save the agreed starting point as its own version first (e.g. `v4-base`), then build each alternative directly into its own version folder from that base. The root stays at the base until the user picks one.
- Never edit a saved version afterwards. Changes go into a new version.
- If the user asks to go back to an older version, copy it to the root `index.html` (no new version needed unless it's then changed).

## Local preview

`node .tools/serve.js` serves http://localhost:8765/ (working copy) and http://localhost:8765/versions/ (all saved iterations). It reads files on every request and 404s dot-paths like SWA does. Start it in the background and **leave it running** after work is done; the user uses it to play with the site.

## Workflow pitfalls

- Do not add `npm install` (or anything that writes `package.json`/`node_modules`) at the repo root in the workflow. A root `package.json` makes the deploy action's Oryx builder detect Node.js and fail with "Could not find either 'build' or 'build:azure'"; with `skip_app_build` it would instead get published to the site. The OIDC token step uses the `core` object that `actions/github-script` injects - no install needed (fixed in 935e558).
- If a build step is introduced later (bundler, static site generator): remove `skip_app_build`, add a `build` script to `package.json`, and set `output_location` to the build output directory.
- A run not starting after a push is usually a GitHub-side webhook delay - check https://www.githubstatus.com before pushing again (a re-push queues a second deploy).
