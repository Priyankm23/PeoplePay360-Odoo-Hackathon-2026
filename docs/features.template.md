# [ProjectName] — Features

> Format per feature: Priority tag → Purpose → Actors → Endpoints → Business Rules → Side Effects.
> All requests/responses use the global envelope and conventions from overview.md. Field/entity definitions are pulled from schema.md by reference — don't repeat them here.

---

# [N]. [Feature Name] **[MUST/SHOULD/CUT]**

**Purpose:** one sentence — why this feature exists.
**Actors:** which roles touch it and how.

### METHOD /api/path
Request: `{ field, field }`
Response `2xx`: shape (reference schema.md entity, don't redefine fields)
Rules: request-level validation notes

**Business Rules:**
Feature-specific rules — conflict checks, validation logic, anything a judge is likely to test directly. If a rule produces a specific error shape (e.g. a `409` with a particular code), show it as a JSON block so the agent implements it verbatim.

**Side Effects:**
What else changes as a result of this endpoint succeeding — another entity's status, a notification, an activity log entry. This is where cross-feature coupling gets made explicit instead of discovered mid-build.

---

[Repeat the block above per feature, in the same order as Build Order in overview.md.]

---

# Dashboard (composed, not a standalone feature)
If the PS has a dashboard/home screen that aggregates other features, document it last and note explicitly that it introduces no new entities — only scoped reads across existing ones, scoped per role.
