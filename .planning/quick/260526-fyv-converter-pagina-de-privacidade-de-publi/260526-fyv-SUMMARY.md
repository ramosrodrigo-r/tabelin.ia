---
phase: quick-260526-fyv
plan: "01"
subsystem: web/privacy-page
tags: [next.js, rsc, lgpd, privacy]
dependency_graph:
  requires: []
  provides: [/privacidade route via Next.js file-system routing]
  affects: [apps/web/src/app/privacidade/]
tech_stack:
  added: []
  patterns: [Next.js RSC page, metadata export, dangerouslySetInnerHTML for inline styles]
key_files:
  created:
    - apps/web/src/app/privacidade/page.tsx
  modified: []
  deleted:
    - apps/web/public/privacidade.html
decisions:
  - Preserved original CSS via inline <style> with dangerouslySetInnerHTML — no Tailwind rework needed for a standalone public policy page
metrics:
  duration: "1 min"
  completed_date: "2026-05-26"
  tasks_completed: 1
  files_changed: 2
---

# Quick Task 260526-fyv: Convert privacidade.html to Next.js RSC Page — Summary

**One-liner:** Static privacy policy HTML converted to Next.js RSC at `/privacidade` with full content preservation, metadata export, and deletion of the leftover static file.

## What Was Done

Converted `apps/web/public/privacidade.html` (a leftover standalone HTML file) into a proper Next.js App Router RSC page at `apps/web/src/app/privacidade/page.tsx`. The route `/privacidade` is now served via Next.js file-system routing instead of the static file server.

## Tasks

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create /privacidade Next.js RSC page and delete static HTML | 2c71b1b | Done |

## Key Implementation Details

- **RSC page:** No `"use client"` directive — pure server component with static content, no interactivity required.
- **Metadata:** `export const metadata = { title: 'Privacidade de Dados — Tabelin.IA' }` at module level for Next.js `<title>` injection.
- **Styles:** Original CSS preserved verbatim using a `<style dangerouslySetInnerHTML={{ __html: styles }} />` tag inside a React fragment — no Tailwind rework needed.
- **HTML → JSX translation:** All `class` → `className`, self-closing tags corrected, `<html>/<head>/<body>` wrappers removed. Text nodes with adjacent elements handled with `{' '}` spacing.
- **No auth guard:** Route is intentionally public (LGPD compliance page accessible without login).
- **Static file deleted:** `apps/web/public/privacidade.html` removed — Next.js routing now owns `/privacidade`.

## Verification

- TypeScript: no compilation errors (`npx tsc --noEmit` on `apps/web/tsconfig.json` — clean)
- `apps/web/src/app/privacidade/page.tsx` exists with `export default function PrivacidadePage`
- `apps/web/public/privacidade.html` confirmed deleted
- `export const metadata` present for title injection
- All original text sections preserved (verified against source HTML)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all content is static and fully rendered from the original HTML source.

## Threat Flags

None — page serves static public content (LGPD policy), no user data exposed (T-fyv-01 accepted).

## Self-Check: PASSED

- FOUND: apps/web/src/app/privacidade/page.tsx
- CONFIRMED: apps/web/public/privacidade.html deleted
- FOUND: default export PrivacidadePage
- FOUND: metadata export
- Commit 2c71b1b verified in git log
