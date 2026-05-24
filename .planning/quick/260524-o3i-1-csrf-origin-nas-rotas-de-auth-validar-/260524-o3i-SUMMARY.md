---
status: complete
quick_id: 260524-o3i
completed: 2026-05-24
code_commit: 61d70e5
---

# Quick Task 260524-o3i Summary

## Completed

- Added an auth POST origin guard that accepts only the configured `BETTER_AUTH_URL` origin or the current request host origin, using `Origin` first and `Referer` as fallback.
- Replaced the placeholder forgot-password behavior with random password reset tokens whose SHA-256 hashes are stored in `Verification` with a one-hour expiration.
- Added `POST /api/auth/reset-password` to consume reset tokens, update the credential password hash, and delete/invalidate the token before accepting the password change.
- Updated the reset-password page so token links show a new-password form.
- Added route-level tests for cross-origin sign-in, sign-up, sign-out, forget-password, reset token creation, expired token rejection, reused token rejection, and valid reset.

## Verification

- `corepack pnpm --filter web test -- tests/auth-routes.test.ts tests/auth.spec.ts`
- `corepack pnpm --filter web test`
- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web lint`

## Result

Quick task completed successfully in code commit `61d70e5`.
