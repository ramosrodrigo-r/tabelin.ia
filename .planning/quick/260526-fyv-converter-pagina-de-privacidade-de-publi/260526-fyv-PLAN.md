---
phase: quick-260526-fyv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/app/privacidade/page.tsx
  - apps/web/public/privacidade.html
autonomous: true
requirements: [PRIV-03]
must_haves:
  truths:
    - "GET /privacidade returns the full privacy policy content without requiring auth"
    - "All text sections from the original HTML are preserved"
    - "The static file apps/web/public/privacidade.html is deleted"
  artifacts:
    - path: "apps/web/src/app/privacidade/page.tsx"
      provides: "Next.js RSC page for /privacidade route"
      exports: ["default function PrivacidadePage"]
  key_links:
    - from: "apps/web/src/app/privacidade/page.tsx"
      to: "/privacidade"
      via: "Next.js file-system routing"
      pattern: "export default function PrivacidadePage"
---

<objective>
Convert the static file apps/web/public/privacidade.html into a proper Next.js RSC page at apps/web/src/app/privacidade/page.tsx, then delete the static file.

Purpose: The privacy policy must be served at /privacidade (not /privacidade.html) via Next.js routing, matching LGPD compliance requirements already implemented in Phase 04. The static HTML file is a leftover artifact.
Output: apps/web/src/app/privacidade/page.tsx — public RSC page with all original content. apps/web/public/privacidade.html — deleted.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create /privacidade Next.js RSC page and delete static HTML</name>
  <files>apps/web/src/app/privacidade/page.tsx, apps/web/public/privacidade.html</files>
  <action>
Create the directory apps/web/src/app/privacidade/ and write page.tsx as a server component (no "use client" directive needed — pure static content, no interactivity).

The component is a plain RSC: export default function PrivacidadePage() returning JSX. No auth check, no redirect — this route is public. No imports needed beyond React (implicit in Next.js 13+).

Translate the HTML structure from public/privacidade.html directly to JSX with these mappings:
- Inline `<style>` block → use a `<style>` tag with `dangerouslySetInnerHTML={{ __html: ... }}` OR inline Tailwind classes. Prefer a `<style jsx global>` is NOT available; instead place a `<style>` tag with `dangerouslySetInnerHTML` at the top of the returned JSX, inside a fragment, to preserve the existing CSS exactly as-is (no Tailwind rework needed).
- All HTML attributes → JSX attributes (class → className, for → htmlFor, target → target, rel → rel).
- Self-closing tags must be properly closed in JSX.
- The `<html>`, `<head>`, and `<body>` tags are NOT included — only the body content (the `<style>` block + everything that was inside `<body>`).
- Export metadata: add `export const metadata = { title: 'Privacidade de Dados — Tabelin.IA' }` above the component for Next.js `<title>` injection. Set lang via the root layout (already configured for pt-BR), so no override needed here.

After creating page.tsx, delete the static file: apps/web/public/privacidade.html.

Do NOT add any navigation wrapper (Sidebar, Topbar) — this is a standalone public page matching the original standalone HTML design.
  </action>
  <verify>
    <automated>cd /home/rodrigo/tabelin.ia && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -i "privacidade" || echo "TypeScript OK for privacidade page"</automated>
  </verify>
  <done>
- apps/web/src/app/privacidade/page.tsx exists and exports a default RSC component
- apps/web/public/privacidade.html does not exist
- TypeScript compilation has no errors in the new file
- Visiting /privacidade in the running app shows the full privacy policy without a login requirement
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| public internet → /privacidade | No auth boundary — page is intentionally public |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-fyv-01 | Information Disclosure | /privacidade route | accept | Static public content; no user data exposed |
| T-fyv-SC | Tampering | npm/build tooling | accept | No new packages installed; pure JSX translation |
</threat_model>

<verification>
1. File exists: apps/web/src/app/privacidade/page.tsx
2. File deleted: apps/web/public/privacidade.html must not exist
3. TypeScript: no compilation errors in new file
4. Route accessible: GET /privacidade returns 200 without session cookie
</verification>

<success_criteria>
- /privacidade is reachable without authentication and renders all sections from the original HTML
- /privacidade.html no longer exists as a static file (removed from public/)
- No TypeScript errors introduced
</success_criteria>

<output>
Create .planning/quick/260526-fyv-converter-pagina-de-privacidade-de-publi/260526-fyv-SUMMARY.md when done
</output>
