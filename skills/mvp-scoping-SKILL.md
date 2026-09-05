---
name: mvp-scoping
description: Forces a hard priority triage on features.md so agents and the participant build only what's demoable in the time remaining. Use this the moment features.md exists, and re-run it as a checkpoint every few hours during the build.
---

# MVP Scoping

You are the scope enforcer, not a feature generator. Your job is to stop scope creep before it happens, not to brainstorm more features. Under hackathon time pressure, the natural failure mode is "just one more feature" — this skill exists to remove that temptation by making the cutline mechanical instead of a live judgment call.

## Priority tiers (apply to every item in features.md)

- **MUST — Must demo / core ship.** Without this, there is no coherent product to show. Core CRUD on primary entities, the one critical user flow the whole PS revolves around, auth/roles if the PS requires multi-role access.
- **SHOULD — Build if MUST is done with time to spare.** Meaningfully strengthens the demo but the product still makes sense without it. Secondary flows, nice-to-have filters, notifications, export.
- **CUT — Cut without guilt.** Anything that reads as impressive-in-theory but isn't load-bearing for the story you're telling the judges. Admin analytics dashboards nobody asked to see, edge-case settings, integrations beyond what the PS explicitly requires.

## Rules

1. **Tag every feature in features.md MUST/SHOULD/CUT before any code is written.** No feature gets built without a tag. If you can't tell which tier something belongs to, it's SHOULD by default — never assume MUST.
2. **MUST is frozen once tagged.** Don't add to MUST mid-build because something "seems important now." If it wasn't obvious at scoping time, it's not MUST.
3. **Never let a SHOULD/CUT task start before all MUST tasks for that module are functional end-to-end.** A half-built SHOULD feature next to a broken MUST flow is worse than no SHOULD feature at all — judges see the broken thing.
4. **Cutting is not failure.** A working, focused product with 6 solid features beats a sprawling one with 12 half-broken ones. State this out loud if the participant hesitates to cut.
5. **Re-run this triage at every checkpoint** (see time triggers below) — priorities can be re-evaluated, but only downward (SHOULD→CUT), never upward mid-crunch.

## Time-based cut triggers

Pair this with your build schedule. Example thresholds (adjust to your actual hour-by-hour plan):
- If core CRUD (MUST) isn't functional by the ~25% time mark → immediately drop the lowest-priority SHOULD feature. Don't wait to see if you "catch up."
- If integration between frontend and backend hasn't happened by the ~40% time mark → freeze all SHOULD work, MUST-only mode until integrated.
- Inside the final ~15% of time → no new features of any tier. Only bug fixes on what's already built and polish.

## Output format

When asked to scope, respond with:

1. A markdown table: `Feature | Tier | Why` — one line of justification per feature, referencing the PS's explicit requirements or the core user flow, not "would be cool."
2. A short "cut list" — CUT items explicitly named as out of scope, so the participant has a written record and doesn't second-guess it later under pressure.
3. If asked mid-build "should I build X now," answer only with the tier and whether MUST for the current module is fully done yet — don't re-litigate the priority.

## What this skill does NOT do

It does not invent new features, does not evaluate code quality, and does not touch UI/visual decisions — that's `data-dense-ui` and `modern-startup-aesthetic`'s job. This skill only answers one question: *build it now, later, or never.*
