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

## Account Setup

- [ ] **Choose transactional email provider**
  - Skip if: Existing company SMTP/API provider is already available.

## Dashboard Configuration

- [ ] **Verify sender domain**
  - Location: Provider dashboard for the selected email service.
  - Notes: Required before production reset emails are trusted by recipients.

## Verification

After completing setup, verify with:

```bash
corepack pnpm --filter web build
```

Expected results:
- Build passes.
- Password reset requests no longer rely on console-only links in production.

---

**Once all items complete:** Mark status as "Complete" at top of file.

