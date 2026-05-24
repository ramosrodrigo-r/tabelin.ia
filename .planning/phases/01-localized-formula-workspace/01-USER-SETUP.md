# Phase 01: User Setup Required

**Generated:** 2026-05-24
**Phase:** 01-localized-formula-workspace
**Status:** Incomplete

Complete these items before production password reset delivery is enabled. Local development works with console reset links.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `EMAIL_FROM` | Chosen transactional email provider sender address | `.env.local` |
| [ ] | `EMAIL_SERVER` | Chosen provider SMTP/API connection string, if the final Better Auth adapter requires it | `.env.local` |
| [ ] | `OPENAI_API_KEY` | OpenAI dashboard API key | `.env.local` |
| [ ] | `OPENAI_MODEL` | Configured text model name, default documented in `.env.example` | `.env.local` |

## Account Setup

- [ ] **Choose transactional email provider**
  - Skip if: Existing company SMTP/API provider is already available.
- [ ] **Create or reuse OpenAI API project**
  - Skip if: An API key for this app already exists.

## Dashboard Configuration

- [ ] **Verify sender domain**
  - Location: Provider dashboard for the selected email service.
  - Notes: Required before production reset emails are trusted by recipients.
- [ ] **Set OpenAI project limits**
  - Location: OpenAI dashboard project settings.
  - Notes: Use project-level limits appropriate for early MVP testing.

## Verification

After completing setup, verify with:

```bash
corepack pnpm --filter web build
```

Expected results:
- Build passes.
- Password reset requests no longer rely on console-only links in production.
- Formula routes can use the configured model for real provider calls when enabled.

---

**Once all items complete:** Mark status as "Complete" at top of file.
