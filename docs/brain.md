# HACKATHON MASTER PLAN — Odoo Final Round (Sept 5)

One page. This is what you glance at, not what you reason through, at hour 18.

---

## 0. Flow overview

```
PS PDF drops
     |
     v
[Claude] explain PS -> you understand it too
     |
     v
[Claude] generate in ONE pass:
   overview.md -> schema.md -> features.md (MUST/SHOULD/CUT tagged) -> ia.md
     |
     v
FREEZE schema.md  (this is the contract — don't silently change it later)
     |
     v
   PHASE 1: BUILD  ---------------------------->  PHASE 2: INTEGRATE
   (parallel: backend / frontend)                 (one full flow works end-to-end)
     |                                                    |
     v                                                    v
   PHASE 3: POLISH  <----------------------------  commit checkpoint
   (frontend nitpick window — protected)
     |
     v
   PHASE 4: DEMO-PREP
   (demo-readiness skill runs here, once brief is known)
```

---

## 1. Phase gates (coarse, not clock-based)

Don't schedule sub-hour blocks — they break the moment reality drifts, which it will. Use phases + triggers instead.

| Phase | Exit condition to move on |
|---|---|
| **1. Build** | All MUST features have passing self-written tests, backend + frontend both exist |
| **2. Integrate** | At least one full MUST flow works end-to-end, frontend talking to real backend, not mocks |
| **3. Polish** | All MUST (and any completed SHOULD) screens pass the "generic AI tells" check; this window is protected — don't let late feature work eat it |
| **4. Demo-prep** | `demo-readiness` skill checklist fully green; speech drafted against actual eval brief |

---

## 2. Trigger rules (the actual adaptation mechanism)

These replace "adapt if it goes south" with something you don't have to think about under fatigue.

| If this happens... | Then do this, immediately, no debate |
|---|---|
| Core CRUD (MUST) not working by ~25% of total time elapsed | Cut the lowest-priority SHOULD feature right now |
| Frontend/backend not integrated by ~40% of time elapsed | Freeze all SHOULD work — MUST-only mode until integrated |
| An agent fails the same task twice | Escalate to Codex, or fix it yourself — don't try a 3rd time with the same model |
| Inside the final ~15% of time | No new features, any tier. Bug fixes and polish only |
| Freebuff (6×1hr) untouched by ~75% of time elapsed | Use it now for the polish pass — unused reserve at the end is wasted capacity |

---

## 3. Tool usage — one default, one escalation, nothing else to decide

Don't route tasks through a matrix mid-hackathon — it costs more decision time than it saves.

- **Default for everything:** Gemini Pro via Antigravity (2 accounts → 2 parallel agents once schema.md is frozen: one backend, one frontend)
- **Escalation only when Gemini fails a task twice:** Codex (100% quota — spend it on real blockers, not routine work)
- **Copilot / opencode (Big Pickle, Mimo, Nemotron):** not a routing decision — just whatever's open while you hand-fix something, or trivial boilerplate (seed script, README)
- **Freebuff (6×1hr):** emergency reserve / polish-phase push only. Don't touch before ~75% time elapsed.
- **Claude (this thread):** doc generation, architecture sanity-checks, unblocking stuck agents, flaw-flagging review

---

## 4. Doc generation (hour 0)

Generate all four in one continuous pass so entity names stay consistent across files:

1. **overview.md** — PS interpretation, tech stack, explicit constraints, non-goals, roles, build order
2. **schema.md** — entities, constraints — **freeze after this**
3. **features.md** — purpose, actors, endpoints, req/res shape, business rules, **MUST/SHOULD/CUT tag per feature** (same scale `mvp-scoping` uses — no translation step needed)
4. **ia.md** — maps entities to pages/nav, prevents nested-page sprawl

If Claude gets rate-limited mid-pass: paste what exists back into Gemini Pro with the same template, continue in the same format rather than restarting.

---

## 5. Skills (pre-built, loaded before the hackathon)

| Skill | Job | When it acts |
|---|---|---|
| `data-dense-ui` | Tables, forms, nav, charts for relational data | Passive, during build |
| `modern-startup-aesthetic` | Color/type/motion direction + tool stack + generic-AI-tells checklist | Passive, during build + active check during Polish |
| `mvp-scoping` | Enforces MUST/SHOULD/CUT tags against real elapsed time | Active at each phase gate |
| `demo-readiness` | Final checklist + speech prep | Phase 4 only, built once eval brief is known |

---

## 6. Per-feature backend loop (your proven branch-per-module flow — keep as-is)

```
git checkout -b feat/<module-name>          (matches your MVC module folder 1:1)
   |
   v
agent reads features.md -> writes implementation plan
   -> you review, correct if needed -> agent updates plan
      -> agent implements (controller/routes/service/validation)
         -> agent writes test script
            -> test asserts against features.md's documented
               req/res shape AND business rules (not just "runs")
               -> test uses the SHARED seed fixture, not a
                  throwaway per-feature fake dataset
                  -> run until it works 100% correctly
                     -> flaw found mid-way? flag to agent,
                        2nd fail on same issue -> escalate (Section 3)
                        -> git commit + push  feat/<module-name>
                           -> git checkout main -> git merge feat/<module-name>
                              -> next feature, same loop
```

Main only ever receives a module that's already proven — no half-working code lands there, so main is demo-safe at any point you stop. This is why worktrees stay unnecessary: you're never touching two branches' files at once, one feature branch is checked out at a time.

**Integration phase (Phase 2):** same principle, one commit per successfully integrated feature — i.e. commit once a given feature's frontend is actually talking to its real (merged) backend module, not before.

---

## 7. Cut list — decisions made, not to re-litigate on the day

- No git worktrees — sequential work, plain branches + 2 commit checkpoints/feature is enough
- No sub-hour schedule — phase gates + triggers only
- No fixed tool-routing matrix — one default + one escalation rule
- No per-feature disposable mock data — one shared, growing seed fixture
- No weekend-rate-limit dependency — front-load doc generation at hour 0 regardless
