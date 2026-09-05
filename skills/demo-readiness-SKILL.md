---
name: demo-readiness
description: Use during Phase 4 (final demo prep) to run the pre-flight checklist, structure the 2-3 minute judge pitch, verify seed reset scripts, and prepare defenses for live reviewer questioning.
---

# Demo Readiness

Reviewers don't evaluate code line-by-line; they evaluate a 2-3 minute live demonstration, confidence, and system stability under questioning. This skill prepares you for that final evaluation window.

---

## 1. Pre-Flight Phase Gate Checklist

Run through this checklist before touching any pitch slides or rehearsing:

- [ ] **All MUST Features Green**: Every feature tagged MUST in `overview.md` runs end-to-end talking to the real backend database (zero hardcoded mock data in the main demo path).
- [ ] **Clean Browser Console**: Open DevTools console on all primary screens. There must be zero unhandled red errors, React key warnings, or 404 failed network calls.
- [ ] **One-Command Seed Reset Tested**: Verify `npm run seed` (or `npx prisma db seed`) wipes and restores the database to a known clean state in under 5 seconds. If a test during rehearsal leaves the DB in an awkward state, you must be able to reset it instantly.
- [ ] **Multi-Role Accounts Ready**: Browser tabs or profiles pre-logged into the key roles (e.g., Chrome Profile 1 = Admin, Chrome Incognito / Profile 2 = Employee) so you don't waste 30 seconds logging out and back in during a tight demo.
- [ ] **Data Density & Polish Pass**: Verify tables show human-readable names (no raw UUIDs), status badges are colored and readable, and empty states don't break layouts.

---

## 2. The 3-Minute Judge Pitch Arc (Tailored for Odoo)

Odoo judges are engineers and product architects. They care about business workflow realism, relational integrity, and rock-solid state management.

```
[0:00 - 0:30]  The Operational Context (The "Why")
      |
[0:30 - 1:45]  The Golden Path (End-to-End Live Workflow)
      |
[1:45 - 2:30]  The Foolproof Test (Handling Concurrency & Rules)
      |
[2:30 - 3:00]  Architecture & Engineering Defense
```

### Minute 0:00 – 0:30: The Operational Context
- Open on the main dashboard.
- State the exact enterprise problem: *"In operational workflows, manual handoffs cause discrepancies in status, untracked modifications, and double-allocation. We built [ProjectName] as a modular system that guarantees ACID state transitions and full auditability across [Role A] and [Role B]."*

### Minute 0:30 – 1:45: The Golden Path Workflow
- Execute the primary flow live across roles:
  1. Act as **Role A (Requester / Employee)**: Submit an action (e.g., create a request / transaction). Highlight inline validation.
  2. Switch to **Role B (Approver / Admin)**: Open the role-scoped view. Show the pending item appearing with status badge.
  3. Approve / Process: Execute the status transition.
  4. Point out the immediate side effects: audit log created, status updated, relational cascade updated.

### Minute 1:45 – 2:30: The "Foolproof" Showcase (The Judge Trap)
- Most hackathon teams only show things working when everything goes right. **Win the judges by showing how the app stops things going wrong:**
  - Try to trigger a forbidden transition or double-booking.
  - Show the clean HTTP 400/409 validation response surfaced clearly in the UI.
  - Explain: *"Our service layer wraps state changes in Prisma database transactions to prevent race conditions and illegal status hops."*

### Minute 2:30 – 3:00: Architecture & Tech Stack Defense
- Open the codebase for 15 seconds:
  - Show `src/modules/<feature>`: Route $\rightarrow$ Validation (Zod) $\rightarrow$ Controller $\rightarrow$ Service.
  - Emphasize: *"We structured the backend as a feature-first modular monolith with PostgreSQL, Prisma ORM, and Zod runtime validation, ensuring high cohesion and zero data drift."*

---

## 3. Judge Question Defense Matrix

| If a judge asks... | Point to and explain... |
|---|---|
| *"What happens if two users perform this action at the exact same second?"* | `prisma.$transaction` and PostgreSQL database constraints (e.g., unique composite keys or status checks). |
| *"How is security and role permissions enforced?"* | Centralized `authenticate` JWT middleware and `authorize([roles])` RBAC middleware on the routes, verified before the controller runs. |
| *"How did you validate incoming data?"* | Strict Zod schemas executed at the middleware level before business logic is touched. |
| *"How does the frontend handle API failures?"* | Standard API response envelope (`{ success, error: { code, message, details } }`) with UI error banners and field highlights. |

---

## 4. Emergency Backup Protocol

1. **If the backend crashes during rehearsal**: Kill node, check `.env`, run `npm run dev`.
2. **If database data is corrupted or inconsistent**: Run the seed reset script immediately.
3. **If network fails**: Run everything on `localhost:5000` and `localhost:5173` without external internet dependencies.
