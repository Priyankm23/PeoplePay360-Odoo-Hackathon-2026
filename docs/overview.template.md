# [ProjectName] — Overview

> Priority legend used across this whole doc set: **[MUST]** must-ship · **[SHOULD]** should-ship · **[CUT]** cut-first if behind schedule. Defined once here in Build Order; features.md and ia.md only reference these tags, never redefine them.

## 1. Vision
One paragraph. What the system is, who it's for, what manual process it replaces.

## 2. Problem Statement Interpretation
3–5 bullets paraphrasing the PS in your own words — a comprehension checkpoint, not a copy of the PDF. Flag any ambiguity in the PS explicitly as `**AMBIGUOUS:**` so it's visible before build starts, not discovered mid-build.

## 3. Non-Goals
Explicit list of what is intentionally NOT being built, even if the PS gestures at it. This is what stops the agent from scope-creeping into "improvements."

## 4. Tech Stack
- Frontend:
- Backend:
- DB / ORM:
- Auth:
- Validation:

State each decision once, here. No other doc re-litigates stack choices.

## 5. Roles & Permissions
Table: `Role | Core Permissions | Notes`
Call out any "critical rule" about role assignment / self-elevation explicitly — this is usually judge-tested.

## 6. Global API Conventions
- Response envelope (strict contract across all endpoints):
  - **Success (2xx):**
    ```json
    {
      "success": true,
      "message": "Operation completed successfully",
      "data": {}
    }
    ```
  - **Error (4xx / 5xx):**
    ```json
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error explanation",
        "details": null
      }
    }
    ```
- HTTP status codes: 200 (OK), 201 (Created), 400 (Validation / Bad Request), 401 (Unauthenticated), 403 (Forbidden / Unauthorized role), 404 (Not Found), 409 (Business rule conflict / state error), 500 (Internal Server Error)
- Field naming convention: camelCase for all API request/response keys and models
- Date format: ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- ID format: UUID v4 strings, plus any human-readable secondary identifiers (e.g. `AST-001`, `ORD-1002`)

## 7. Auth Conventions
- JWT/session payload shape
- Middleware order
- Bootstrap plan for the first privileged user (seed script only — never a live endpoint)

## 8. Key Business Rules (Cross-Feature)
The 1–3 rules the entire PS is built around — the ones a judge tests first. State them precisely enough to write a unit test from. Full detail lives in features.md; this is the "read this before anything else" summary.

## 9. Entity Lifecycles / State Machines
For every entity with a non-trivial status field, the state diagram (text arrows are fine). Full trigger table (what event causes what transition) lives in features.md — this is the at-a-glance version.

## 10. Build Order
Numbered, tiered list. This *is* the priority system — everything else tags against it.

**[MUST]**
1. ...

**[SHOULD]**
1. ...

**[CUT]**
1. ...

> If behind schedule mid-hackathon: this order is the decision already made. Don't re-litigate live — just stop at whatever tier you've reached.

## 11. Reference Docs
- `schema.md` — entities, enums, relations (authoritative)
- `features.md` — endpoints + feature-specific rules, tagged by priority
- `ia.md` — page/nav structure mapped to entities and features

**Instruction for the coding agent:** schema.md and features.md are literal and authoritative. If something looks wrong or incomplete for what you're building, stop and flag it back — don't silently deviate.
