# SECURITY.md — Phase 11 (attachment-ui-pro-gating)

**Audit date:** 2026-06-05
**ASVS Level:** 1
**block_on:** high
**Threat register authored at:** plan time (verification-only audit — no new-threat scan performed)
**Result:** SECURED — 18/18 threats CLOSED, 0 open, 0 unregistered flags

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-11-01-01 | Information Disclosure | accept | CLOSED | Accepted risk (logged below). extractedText is the user's own document, isolated by userId+toolKind upstream (Phase 10). |
| T-11-01-02 | Tampering | mitigate | CLOSED | `attachmentContext.slice(0, MAX_EXTRACTED_CHARS)` in all 5 routes — formula/route.ts:121, sql:106, regex:103, scripts:106, template:97. Full text never passed; emitter receives `attachmentMeta` only (formula/route.ts:118-127). |
| T-11-01-03 | DoS | mitigate | CLOSED | `MAX_EXTRACTED_CHARS = 8_000` at context-messages.ts:19; slice applied per route (see T-11-01-02). |
| T-11-01-SC | Tampering | accept | CLOSED | No package.json modified during phase 11 (git log 2026-06-04/06 empty); SUMMARY tech_stack.added = []. |
| T-11-02-01 | XSS | mitigate | CLOSED | attachment-panel.tsx:28-32 renders `{extractedText}` as JSX text node inside `<pre>`. grep dangerouslySetInnerHTML/innerHTML across panel = 0. |
| T-11-02-02 | Elevation of Privilege | accept | CLOSED | Accepted (visual UX gate). Real defense: backend 403 pro_required in all 5 routes (formula:55, sql:52, regex:51, scripts:52, template:24). attachment-button.tsx:39-50 renders disabled button (no file input) when !isPro. |
| T-11-02-03 | Spoofing | accept | CLOSED | Accepted. Client validateFile (attachment-button.tsx:17-26) is UX; backend validates magic bytes (SEC-02, Phase 10). |
| T-11-02-SC | Tampering | accept | CLOSED | No new npm packages (see T-11-01-SC). |
| T-11-03-01 | XSS | mitigate | CLOSED | dangerouslySetInnerHTML = 0 in formula input/output panels; AttachmentPanel JSX text node (T-11-02-01). |
| T-11-03-02 | Elevation of Privilege | mitigate | CLOSED | formula-tool.tsx:151 `if (!isPro || mode !== "generate") return;` in onDrop before handleFileSelect; AttachmentButton disabled for free. Backend 403 (formula/route.ts:55). |
| T-11-03-03 | Tampering | mitigate | CLOSED | grep `content-type.*multipart` in hook = 0. use-formula-stream.ts:60-67: FormData branch sets NO content-type header (browser boundary); only JSON branch sets application/json. |
| T-11-03-04 | DoS | mitigate | CLOSED | formula-tool.tsx:135 `setPendingFile(null)` precedes await stream.submit at :139 (fileSnapshot captured prior). |
| T-11-03-SC | Tampering | accept | CLOSED | No new npm packages (see T-11-01-SC). |
| T-11-04-01 | XSS | mitigate | CLOSED | dangerouslySetInnerHTML = 0 across all 8 sql/regex/scripts/template input+output panels; AttachmentPanel centralized. |
| T-11-04-02 | Elevation of Privilege | mitigate | CLOSED | template-input-panel.tsx:41 `showProGate = !isPro \|\| proBlocked`; AttachmentButton rendered only `!showProGate ? (...)` at :56. Backend unconditional Pro-gate template/route.ts:23 (LANDMINE-02). |
| T-11-04-03 | Tampering | mitigate | CLOSED | grep `content-type.*multipart` in 4 hooks = 0. sql:57/60, regex:59/65, scripts:57/60, template:56/59 — JSON branch only sets application/json; FormData branch sets none. |
| T-11-04-04 | DoS | mitigate | CLOSED | onDrop `!isPro` guard before handleFileSelect: sql-tool.tsx:126, regex:140, scripts:127, template:122. |
| T-11-04-SC | Tampering | accept | CLOSED | No new npm packages (see T-11-01-SC). |
| T-11-05-01 | XSS | mitigate | CLOSED | formula-ui.test.tsx:348-353 reads attachment-panel.tsx via fs and asserts `.not.toContain("dangerouslySetInnerHTML")` — CI invariant. |
| T-11-05-02 | Elevation of Privilege | mitigate | CLOSED | formula-ui.test.tsx:114-118 `freeEntitlement` → `expect(btn).toBeDisabled()`; :125 pro → `.not.toBeDisabled()`. |
| T-11-05-SC | Tampering | accept | CLOSED | No new npm packages (see T-11-01-SC). |

---

## Accepted Risks Log

- **T-11-01-01 (Information Disclosure):** `extractedText` echoed in the NDJSON `attachment_grounded` event is the requesting user's own uploaded document. Access is isolated by `userId` + `toolKind` (Phase 10 upstream); no cross-tenant exposure. Accepted per plan.
- **T-11-02-02 (Elevation of Privilege):** The disabled AttachmentButton is a UX-only visual gate. The authoritative control is the backend 403 `pro_required` returned by all 5 tool routes via `getUserEntitlement`. Accepted per plan.
- **T-11-02-03 (Spoofing):** Client `validateFile` trusts the browser-declared MIME type / extension fallback. This is UX-only; the backend validates magic bytes (SEC-02, Phase 10). Accepted per plan.
- **T-11-0x-SC (Supply chain):** Phase introduced zero new npm dependencies (confirmed by empty package.json git history for the phase window and SUMMARY tech_stack.added = []). Accepted per plan.

---

## Unregistered Flags

None. All five SUMMARY.md `## Threat Flags` / `## Threat Surface Scan` sections report no new attack surface; every flagged mitigation maps to an existing registered threat ID.

---

## Notes

- Implementation files were not modified during this audit (read-only verification).
- All `mitigate` threats verified by locating the exact mitigation call/pattern at the cited file:line, confirmed across ALL entry points (5 tools / 8 panels / 5 routes), not a single sample.
