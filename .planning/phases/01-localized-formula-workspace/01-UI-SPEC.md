---
phase: 01
slug: localized-formula-workspace
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-23
---

# Phase 1 - UI Design Contract

Visual and interaction contract for the Localized Formula Workspace. Generated inline through the `gsd-ui-phase` workflow because Phase 1 has `UI hint: yes`.

## Design System

| Property | Value |
|----------|-------|
| Tool | none initially |
| Preset | not applicable |
| Component library | Radix primitives only if needed for menus/tabs/dialogs |
| Icon library | lucide-react |
| Font | Inter or system sans fallback |
| Layout posture | Operational SaaS workspace, dense and restrained |

## Spacing Scale

Declared values must be multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline status marks |
| sm | 8px | Compact controls, button gaps |
| md | 16px | Default panel padding, form groups |
| lg | 24px | Main content padding |
| xl | 32px | Column gaps on desktop |
| 2xl | 48px | Auth page vertical spacing |

Exceptions: none.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 600 | 1.35 |
| Compact meta | 12px | 500 | 1.35 |
| Section heading | 16px | 650 | 1.35 |
| Page title | 20px | 700 | 1.25 |

No viewport-scaled font sizing. Letter spacing stays `0`.

## Color

| Role | Value | Usage |
|------|-------|-------|
| App background | `#F7F8FA` | Page background |
| Surface | `#FFFFFF` | Main panels and form surfaces |
| Sidebar | `#1F2933` | Primary navigation |
| Text | `#111827` | Primary text |
| Muted text | `#5E6A75` | Metadata and helper text |
| Border | `#D9DEE5` | Dividers, control borders |
| Primary accent | `#0B6B57` | Active tool, primary action, success feedback |
| Info accent | `#2F6FED` | Neutral links and informational marks |
| Warning | `#B54708` | Assumptions/warnings |
| Destructive | `#B42318` | Auth errors and destructive confirmations only |

Accent reserved for: active nav item, primary submit, copied state, focus ring, and compact status badges. Do not color every interactive element green.

## Navigation Contract

- First viewport after sign-in is the app workspace, not a landing page.
- Left sidebar contains Formula as active and may show future tools as disabled: Scripts, SQL, Regex, File Analysis, OCR.
- Disabled future tools must not imply implemented behavior; use muted labels and no route unless a read-only disabled state is implemented.
- Mobile uses a collapsible navigation button with an icon and tooltip/label. Main tool controls remain accessible without horizontal scrolling.

## Formula Workspace Contract

Primary screen structure:

1. Top app bar with product name, signed-in user affordance, and sign-out.
2. Sidebar navigation.
3. Main formula workspace with two compact modes: generate formula and explain formula.
4. Input panel with required platform selector and formula-language selector.
5. Output panel with streaming result, metadata, assumptions/warnings, errors, and copy button.

Controls:

- Platform selector: segmented control or compact select with Microsoft Excel, Google Sheets, Airtable, LibreOffice Calc.
- Formula language selector: segmented control with `Português (Brasil) ;` and `English ,`.
- Mode selector: tabs for `Gerar formula` and `Explicar formula`.
- Copy action: icon button using lucide `Copy`, switches to `Check` after success, with tooltip text.
- Submit action: verb+noun text, `Gerar formula` or `Explicar formula`.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA generate | Gerar formula |
| Primary CTA explain | Explicar formula |
| Empty output heading | Resultado |
| Empty output body | O resultado aparece aqui assim que a resposta comecar. |
| Missing selector error | Escolha a plataforma e o idioma da formula. |
| Missing prompt error | Descreva a tarefa da planilha antes de gerar. |
| Copy success | Copiado |
| AI validation error | Nao consegui validar a resposta. Ajuste o pedido e tente novamente. |
| Assumptions heading | Premissas |
| Warnings heading | Atencao |

Portuguese UI copy should be concise and native-sounding. Avoid tutorial paragraphs inside the app.

## State Contract

Required states:

- Signed-out: auth pages for sign-in, sign-up, and password reset.
- Workspace empty: Formula tool open with no output.
- Input validation: missing prompt, platform, or language.
- Loading: request accepted before first stream chunk.
- Streaming: output panel visibly updates with a progress/draft state.
- Validated complete: output marked copy-ready after schema validation.
- Assumptions/warnings: visible below metadata before the copy area.
- Error: provider/network/schema errors preserve user input and show a retry path.
- Copied: button state changes immediately and returns after a short delay.

## Responsive Contract

- Desktop: sidebar fixed width between 220px and 260px; main content uses two columns when space allows.
- Tablet/mobile: sidebar collapses; input and output stack vertically.
- Output blocks use fixed minimum heights and overflow wrapping so formulas do not resize controls or overlap adjacent content.
- Buttons and segmented controls must not truncate meaningful labels on common mobile widths.

## Accessibility Contract

- All icon-only buttons require accessible labels and tooltips.
- Form controls require labels associated with inputs.
- Keyboard focus must be visible against both light surfaces and dark sidebar.
- Streaming status should use polite live-region behavior where practical.
- Color is never the only indicator for warnings, errors, selected states, or copied feedback.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none planned | not required |
| third-party registries | none | prohibited unless reviewed first |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-23

## UI-SPEC COMPLETE
## UI-SPEC VERIFIED
