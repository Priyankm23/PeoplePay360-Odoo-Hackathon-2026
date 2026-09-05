# [ProjectName] — Design Prompt (Stitch / Bolt / Lovable)

> Not a docs/ file the coding agent reads. This is assembled FROM the other docs — don't invent anything here that isn't already decided elsewhere:
> - Screens & composition → pulled from `ia.md` §1–3
> - Status values → pulled from `schema.md` enums (every value gets a color, none invented, none missing)
> - Palette/typography direction → pulled from the aesthetic skill's non-default direction
> Generated once, after ia.md is finalized. Reused verbatim for Bolt/Lovable scaffolding once Stitch output is approved.

## 1. Framing
One or two sentences: what the app is, who uses it day-to-day, and the tone directive — e.g. "an internal operational tool used many times a day by people who need to scan a dense screen fast, not a marketing site: design for clarity and speed of comprehension over decoration, while still being genuinely distinctive."

## 2. Anti-Generic Constraints
Explicit list of what to avoid, named directly: generic AI-tool defaults (purple-to-blue gradients, high-voltage neon chartreuse/green, sterile pure-white backgrounds with harsh drop shadows, default unconfigured shadcn slate/indigo). State the chosen minimal classic ERP direction instead (e.g. warm beige canvas with deep navy/espresso text, dull orange/terracotta/muted magenta accents), grounded in the PS's real-world operational domain, not an abstract mood.

## 3. Palette
- Base surfaces: dark nav/header color, light working-surface color (not pure white/black)
- Accent: single color, used sparingly, for primary actions + active nav state
- Status colors: one row per enum value from `schema.md` — pull the literal list, don't re-derive it

| Enum value (from schema.md) | Color | Notes |
|---|---|---|
| | | desaturated enough not to fight the accent |

## 4. Typography
- Heading/body font direction (family + weight character, e.g. "clean, slightly condensed grotesk")
- Signature field treatment: name the specific field(s) from `schema.md` that get special typographic treatment (e.g. a monospace face for a human-readable ID field) and state it applies everywhere, no exceptions

## 5. Layout Conventions
- Persistent nav: reuse `ia.md` §1 verbatim — same items, same order, same active-state behavior
- Top-of-screen pattern: page title, search bar (where the page has one), 1–2 primary action buttons
- Where KPI rows appear (pull from Page Inventory — which pages actually need summary stats)
- Main content area type per page family: table / calendar / kanban / form

## 6. Mock Data
Static screens need real-looking data to actually judge, not placeholder text — density and legibility can't be evaluated against `[Field Name]` filler.

- Every field value must be a valid instance of its type/enum from `schema.md` — status badges use only that entity's real enum values, never invented ones.
- A small, fixed set of sample entities recurs across every screen that shows them (same asset, same 2-3 people, same department names) — continuity, not fresh random data per screen, so the demo reads as one coherent org, not disconnected fixtures.
- Row counts per table/list should be enough to show real density (10-15+ rows, not 3) — plus at least one screen showing the empty state per §7's tone rule.

## 7. Screens to Design
One block per page, generated directly from `ia.md` §2 (Page Inventory) and §3 (Page Composition). Translate composition into visual language rather than re-deciding it:

### [Page Name]
- Layout: [table / calendar / kanban / form / card grid]
- Key components: [pulled from ia.md's composition block for this page]
- Composite elements: [tabs → rendered as tabbed panel; modals → rendered as slide-over or centered modal, state which]
- Anything the PS calls out as a signature interaction on this screen (e.g. a conflict/blocked-state that needs to read as intentional, not like an error)

[Repeat per page in Page Inventory, in priority order — MUST pages first.]

## 8. Interaction Details (cross-page consistency rules)
- Status badges: one consistent visual language across every screen they appear on — ties directly to §3's table
- Signature field treatment: ties directly to §4 — restate "no exceptions" here too, since this is the part most likely to drift during generation
- Empty states: tone rule (e.g. "an invitation to act, not a bare 'no data'")
- Motion: restraint rule (e.g. "subtle transitions on state change only, nothing decorative")

## 9. Output Instructions
- Number of screens to generate (should match Page Inventory's MUST + SHOULD count, unless explicitly time-cutting)
- Fidelity level (high-fidelity, not wireframe)
- Single design system / source of truth requirement (one component language reused across every screen, not styled per-screen)
- Responsiveness floor (e.g. "down to tablet width at minimum")
