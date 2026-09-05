# [ProjectName] — Information Architecture

> Purpose: map entities and features to actual pages and navigation, so the agent doesn't invent a nested-page structure mid-build. Priority tags: **MUST / SHOULD / CUT** — same three tags as overview.md's Build Order, never renamed here.

## 1. Navigation Structure
Per role (or shared, if identical), top-level nav items in order. One nav pattern (sidebar / tabs / top-nav) picked once.

**Role: [RoleName]**
- Nav item → page it opens

## 2. Page Inventory
One row per page that will actually exist. `Composite` flags pages complex enough to need a full breakdown in §3 — anything with 2+ entities or 2+ actions on it.

| Page | Route | Priority | Roles | Primary entity | Composite? |
|---|---|---|---|---|---|
| | / | MUST | | | Y/N |

## 3. Page Composition (only for pages flagged Composite in §2)
One block per composite page. This is the section that actually decides UI structure — spell out every surface on the page and what triggers it, so there's nothing left to improvise.

### [Page Name] (`/route`)
- **Page body:** [core fields/entity shown by default]
- **Tab: [name]** — [what it shows] — read-only / editable
- **Tab: [name]** — [what it shows]
- **Modal: [action name]** — triggered by [button/condition] — calls `[METHOD /endpoint]`
- **Modal: [action name]** — triggered by [button/condition] — calls `[METHOD /endpoint]`

Simple (non-composite) pages don't get a block here — the Page Inventory row is enough.

## 4. Routing Rule
One line, derived from §3, not asserted independently: "No route exists for anything documented above as a tab, modal, or drawer — those never get their own URL, no matter how deep the PS's original wording nests them."

## 5. Role-Based View Variations
For pages shared across roles, what actually differs — scope of data, which actions are visible. Table, not prose.

| Page | Role | What differs |
|---|---|---|
| | | |
