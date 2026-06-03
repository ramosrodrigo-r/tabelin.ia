---
phase: 09-extraction-infrastructure
reviewed: 2026-06-03T19:45:47Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - apps/web/src/server/ai/file-chat-stream.ts
  - apps/web/src/server/extraction/byte-validation.ts
  - apps/web/src/server/extraction/csv-xlsx-extractor.ts
  - apps/web/src/server/extraction/dispatcher.ts
  - apps/web/src/server/extraction/image-extractor.ts
  - apps/web/src/server/extraction/pdf-extractor.ts
  - apps/web/src/server/extraction/txt-extractor.ts
  - apps/web/src/server/extraction/types.ts
  - apps/web/src/server/extraction/zip-guard.ts
  - apps/web/tests/extraction/dispatcher.test.ts
  - apps/web/tests/extraction/reuse-extractors.test.ts
  - apps/web/tests/extraction/security-extractors.test.ts
  - apps/web/tests/extraction/zip-guard-deps.test.ts
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-06-03T19:45:47Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the extraction infrastructure: magic-byte validation, anti-ZIP-bomb guard, PDF/CSV/XLSX/image/TXT extractors, the dispatcher, the typed `ExtractionResult` contract, and the file-chat stream. The architecture is sound (magic-bytes-first routing, guard-before-parse ordering, typed error contract, no raw bytes logged) and matches the test expectations. However, the adversarial review surfaced two correctness/security gaps that defeat the stated anti-DoS goals and one defect in the row cap that the existing tests do not catch.

Key concerns:
- The ZIP-bomb guard trusts attacker-controlled `originalSize` metadata and never enforces an entry **size** cap or a compression-ratio cap — a real zip bomb passes it.
- The XLSX path never enforces the byte caps it claims, and re-reads/re-parses the workbook O(sheets) times.
- `detectFileType` runs `file-type` over the entire (potentially huge) buffer with no size precheck, and there is no overall input-size guard anywhere in the chain — large files reach `XLSX.read`, `unpdf`, and OCR base64 encoding unbounded.

## Critical Issues

### CR-01: ZIP-bomb guard relies on attacker-controlled `originalSize` and lacks per-entry / ratio caps

**File:** `apps/web/src/server/extraction/zip-guard.ts:42-56`
**Issue:** The guard returns `false` from the `filter` so fflate never decompresses, and reads `info.originalSize` straight from the ZIP central directory. That field is **attacker-controlled metadata** — a malicious XLSX can declare `originalSize: 1` per entry while the deflate stream actually expands to gigabytes. Because nothing decompresses here, the declared total stays tiny and the guard returns `{ ok: true }`. The file is then handed to `extractCsvXlsx` -> `XLSX.read`, which *does* decompress and expands the bomb in memory — exactly the DoS this guard is supposed to prevent. The guard also enforces no **per-entry** uncompressed cap and no **compression-ratio** cap (compressed size vs `originalSize`), which are the standard zip-bomb defenses. `info.size` (compressed) is available but never used.
**Fix:** Enforce a compression-ratio cap and a per-entry cap using the values fflate exposes, and treat oversized declared entries as a bomb:
```ts
const MAX_RATIO = 100;          // uncompressed/compressed
const MAX_ENTRY_UNCOMPRESSED = 25 * 1024 * 1024;

unzipSync(bytes, {
  filter(info) {
    count += 1;
    total += info.originalSize;
    if (
      count > MAX_ENTRIES ||
      total > MAX_TOTAL_UNCOMPRESSED ||
      info.originalSize > MAX_ENTRY_UNCOMPRESSED ||
      (info.size > 0 && info.originalSize / info.size > MAX_RATIO)
    ) {
      throw new Error("zip-bomb-cap");
    }
    return false;
  },
});
```
Additionally, cap the input `bytes.length` before the guard runs (see CR-02) so the central-directory scan itself cannot be abused. Document explicitly that `originalSize` is untrusted and that the ratio check is the real defense.

### CR-02: No overall input-size limit anywhere in the extraction chain

**File:** `apps/web/src/server/extraction/dispatcher.ts:39-52` (and `byte-validation.ts:31-35`, `pdf-extractor.ts:28-29`, `image-extractor.ts:47-51`)
**Issue:** `extractContent` accepts an arbitrarily large `Buffer` and immediately does `new Uint8Array(buffer)` plus a full second copy into a fresh `ArrayBuffer` (`dispatcher.ts:48-49`) — doubling memory for every file regardless of size. It then runs `detectFileType` over the whole buffer, and routes to `XLSX.read` / `unpdf.getDocumentProxy` / `Buffer.toString("base64")` (OCR) — none of which have a size guard. A multi-hundred-MB upload causes unbounded memory/CPU before any cap applies. The phase is explicitly about resource exhaustion, yet the only cap that exists is the post-decompression XLSX row cap in the parser. This is a direct resource-exhaustion vector on untrusted input.
**Fix:** Add a `MAX_INPUT_BYTES` guard at the top of `extractContent` and return a typed error before any allocation/parse:
```ts
const MAX_INPUT_BYTES = 25 * 1024 * 1024; // align with upload limit
if (buffer.length > MAX_INPUT_BYTES) {
  return {
    ok: false,
    code: "UNSUPPORTED_TYPE", // or add a dedicated FILE_TOO_LARGE code to ExtractionErrorCode
    message: "Arquivo excede o tamanho máximo permitido.",
  };
}
```
Prefer adding a `FILE_TOO_LARGE` member to `ExtractionErrorCode` in `types.ts` rather than overloading `UNSUPPORTED_TYPE`, so callers can message correctly.

## Warnings

### WR-01: D-06 row cap only relabels `rowCount`; full sheet (up to 1000 rows) is still parsed and the cap is effectively a no-op

**File:** `apps/web/src/server/extraction/csv-xlsx-extractor.ts:43-50`
**Issue:** `serializeSheet` clamps only the **reported** `rowCount` (`Math.min(schema.rowCount, 200)`) for display in `formatSchemaForPrompt`. The actual serialized sample is always `sampleRows.slice(0, 10)` (`sampleRowsToBlock`, line 24), which is already ≤10 regardless of the cap. So `MAX_ROWS_PER_SHEET = 200` changes a single printed number and nothing about token volume or parse cost. The comment claims it prevents "tokens ilimitados quando XLSX tem muitas abas com muitas linhas" — but per-sheet token output is fixed at 10 rows irrespective of this constant, and the parser already hard-caps at 1000 rows. The cap is misleading dead-ish logic: it can also *under-report* truth (a 30-row sheet still reports 30; a 5000-row sheet reports 200 even though only 1000 were parsed and 10 shown), creating an inaccurate schema description sent to the model.
**Fix:** Either remove the cap (the 10-row sample + 1000-row parse cap already bound output), or make it real by reporting the true parsed `rowCount` and capping the *number of sheets* serialized for multi-sheet workbooks. If kept for display, report `Math.min(schema.rowCount, MAX_ROWS)` consistently with what was actually parsed, not an arbitrary 200.

### WR-02: XLSX workbook is read and fully parsed N+1 times (once per sheet plus the enumeration read)

**File:** `apps/web/src/server/extraction/csv-xlsx-extractor.ts:83-93`
**Issue:** `XLSX.read(buffer, ...)` is called once to enumerate sheet names (line 83), then `parseFile(buffer, "xlsx", sheetName, ...)` is called inside the loop (line 89), and `parseFile` itself calls `XLSX.read` again for every sheet (see `file-parser.ts:113`). For a workbook with K sheets this decompresses and parses the entire archive K+1 times. Combined with CR-01 (no real bomb protection), this multiplies the memory/CPU blast radius of a malicious or merely large XLSX. While raw perf is out of v1 scope, this is a correctness-adjacent resource-amplification on untrusted input.
**Fix:** Read the workbook once and pass the parsed worksheet (or sheet rows) into the schema extraction, or extend `parseFile` to accept an already-read `WorkBook`. At minimum, reuse the `workbook` already obtained at line 83 instead of re-reading per sheet.

### WR-03: `extractCsvXlsx` swallows all errors into `EMPTY_EXTRACTION`, masking malformed-input vs empty-input

**File:** `apps/web/src/server/extraction/csv-xlsx-extractor.ts:104-110`
**Issue:** The bare `catch {}` maps every failure — corrupt XLSX, CSV parse exception, OOM from a bomb that slipped past the guard, encoding errors — to `code: "EMPTY_EXTRACTION"` with message "Não foi possível processar o arquivo." A genuinely empty file and a maliciously malformed one are indistinguishable to the caller, and the dedicated `INVALID_BYTES` code in the contract (`types.ts:11`) is never used by this path. This hides real failures and weakens observability of attack attempts.
**Fix:** Catch and classify: return `INVALID_BYTES` for parse/decode exceptions, reserve `EMPTY_EXTRACTION` for the genuine no-columns/no-sheets case (already handled explicitly above). Do not log raw content (PRIV-02), but a generic error-type discriminator is safe.

### WR-04: `INVALID_BYTES` error code is declared but never produced by any extractor

**File:** `apps/web/src/server/extraction/types.ts:11` (consumers: `dispatcher.ts`, all extractors)
**Issue:** `ExtractionErrorCode` includes `"INVALID_BYTES"`, but no code path in the reviewed modules ever returns it. Corrupt PDFs return `EMPTY_EXTRACTION` (`pdf-extractor.ts:47`), corrupt XLSX/CSV return `EMPTY_EXTRACTION` (WR-03), and unknown binaries return `UNSUPPORTED_TYPE`. A declared-but-unreachable contract member is dead surface that misleads callers into handling a case that never occurs, and signals a missing validation branch.
**Fix:** Either wire `INVALID_BYTES` into the parse-failure paths (see WR-03) or remove it from the union. Prefer wiring it in, since distinguishing "corrupt/malicious bytes" from "empty" is security-relevant.

### WR-05: `history` roles passed to OpenAI are cast, not validated — `system` role injection possible

**File:** `apps/web/src/server/ai/file-chat-stream.ts:64-67`
**Issue:** `history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))` casts `m.role` (typed `string`) with no runtime check. If any caller (now or later) populates history from client-controlled data, an attacker could set `role: "system"` and inject a competing system prompt downstream of the anti-injection delimiter block — undermining the T-04-01-04 prompt-injection mitigation this file is built around. The `as` cast hides the gap from the type checker.
**Fix:** Validate/normalize each role before sending:
```ts
...history
  .filter((m) => m.role === "user" || m.role === "assistant")
  .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
```
Drop or coerce any other role rather than trusting the cast.

### WR-06: `detectFileType` ignores the declared MIME for binaries but `dispatcher` still trusts declared extension for text — `.csv` magic-less binaries route to parser

**File:** `apps/web/src/server/extraction/dispatcher.ts:55-96`
**Issue:** The dispatcher correctly routes binaries by detected type. But for `kind: "text"` (no magic bytes), it routes purely on `declaredName` extension. A file with no recognized magic bytes but binary/garbage content named `x.csv` is handed to `parseFile` -> `csv-parse`, and a `.txt` to `TextDecoder`. This is acceptable for genuinely text-less formats, but note that `file-type` returns `undefined` for many real binary formats it doesn't recognize (not just text). Such an unrecognized binary named `.csv` is treated as CSV. The comment at `byte-validation.ts:38-40` asserts "se fosse binário disfarçado, a lib teria detectado" — that is not guaranteed; `file-type` only knows the formats in its signature table. The blast radius is limited (parser is row-capped), but the security claim in the comment is overstated.
**Fix:** Soften the comment to reflect that `undefined` means "no known binary signature," not "definitely safe text." Optionally, for the `text` branch, run a lightweight printable-character / NUL-byte heuristic before treating unrecognized bytes as CSV/TXT and reject control-byte-heavy content as `INVALID_BYTES`.

### WR-07: Module-level mutable state `_lastOriginalSizes` is shared across requests

**File:** `apps/web/src/server/extraction/zip-guard.ts:28,59,68,77`
**Issue:** `_lastOriginalSizes` is module-global mutable state written on every `guardXlsxZip` call. In a server runtime handling concurrent requests, two simultaneous XLSX uploads race on this variable; `getLastOriginalSizes()` can return another request's sizes. The doc says "exclusivo para testes / não usar em produção," but nothing enforces that — it is exported from a production module and mutated on the hot path of every real call. Beyond the test-only intent, writing shared state per request is a latent correctness hazard and a small information-leak between requests if ever read in prod.
**Fix:** Move the discharge-A2 capture out of the production function. Have `guardXlsxZip` optionally return the sizes (e.g. `{ ok: true; sizes?: number[] }`) and let the test read them from the return value, eliminating module-level mutable state entirely. If retained, at minimum reset `_lastOriginalSizes` at function entry and document the concurrency caveat.

## Info

### IN-01: Redundant double `instanceof Date` cast

**File:** `apps/web/src/server/ai/file-chat-stream.ts:22`, `apps/web/src/server/extraction/csv-xlsx-extractor.ts:28`
**Issue:** `v instanceof Date ? (v as Date).toISOString() : ...` — after the `instanceof Date` guard, TypeScript already narrows `v` to `Date`, so the `as Date` cast is redundant noise that suggests uncertainty about the type.
**Fix:** Remove the cast: `v instanceof Date ? v.toISOString() : String(v ?? "")`.

### IN-02: `ocrToMarkdown` emits a malformed table when `rows` is empty

**File:** `apps/web/src/server/extraction/image-extractor.ts:9-14`
**Issue:** When `headers.length > 0` but `rows.length === 0`, `body` is `""`, and `[head, sep, ""].filter(Boolean)` drops the empty body, producing a header+separator with no rows. That is a valid-but-empty Markdown table — acceptable, but the `extractImageFromOcrResult` empty-check only guards `headers.length === 0` (line 24), so a headers-present/rows-empty OCR result returns `ok: true` with a contentless table. Minor: the model then receives an "extracted table" with zero data rows.
**Fix:** Consider also returning `EMPTY_EXTRACTION` when `result.rows.length === 0`, or document that a header-only table is intentional.

### IN-03: SCANNED_PDF threshold is a bare magic number with a fragile heuristic

**File:** `apps/web/src/server/extraction/pdf-extractor.ts:18,32`
**Issue:** `SCANNED_TEXT_THRESHOLD = 50` is named (good), but the heuristic `text.trim().length < 50` will misclassify legitimate short PDFs (a one-line invoice, a short note) as scanned, and will pass a scanned PDF that happens to OCR-embed >50 chars of junk. This is inherent to the heuristic and documented (D-12), so it is informational, not a defect.
**Fix:** None required; consider logging (without content) when the heuristic triggers to tune the threshold from real data.

### IN-04: Tests assert on brittle substrings that can produce false negatives

**File:** `apps/web/tests/extraction/reuse-extractors.test.ts:116-118`
**Issue:** The D-06 cap test asserts `result.text.not.toContain("500")` to prove the raw total wasn't reported. This is brittle: any incidental "500" in sample data (e.g. a price of 500) would fail the test for unrelated reasons, and conversely the assertion passes even though the cap logic is essentially a no-op (see WR-01). The `toContain(String(MAX_ROWS_PER_SHEET))` assertion likewise matches "200" appearing anywhere in the output, not specifically as the row count.
**Fix:** Assert on the specific `Total de linhas: 200` line rather than substring presence/absence, and add a test that exercises real per-sheet output volume to give the cap meaningful coverage.

---

_Reviewed: 2026-06-03T19:45:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
