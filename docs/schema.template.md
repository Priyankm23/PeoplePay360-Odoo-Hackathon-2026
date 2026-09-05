# [ProjectName] — Schema

## 1. Conventions
- Primary key type:
- Timestamp fields (createdAt/updatedAt convention):
- Soft delete vs hard delete:
- Naming case (DB column vs API field, if they differ — and where the mapping happens):

## 2. Enums
One block per enum — name, values, which entity/field uses it.

```
EnumName: ValueA | ValueB | ValueC
```

## 3. Entities
Repeat this block per entity, in the same order as Build Order in overview.md.

### EntityName
**Priority:** [MUST/SHOULD/CUT] — the earliest feature tier that needs this entity. Lets the agent build tables in the right order instead of the whole schema at once.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK | |
| | | | |

**Relations:** EntityName → OtherEntity (1:N / N:1 / N:N), FK field name

## 4. Relationship Summary
Compact, one line per relationship, so the full entity graph can be sanity-checked without re-reading every entity block.

```
EntityA 1:N EntityB (via entityAId)
EntityB N:N EntityC (via join table X)
```

## 5. Derived / Computed Fields
Anything NOT a stored column but computed at read-time (e.g. "current holder" resolved from the latest active allocation, rather than duplicated onto the asset row). This is the section that prevents the agent from adding redundant columns.

## 6. Explicitly Out of Scope
Fields or entities the PS gestures at that this schema intentionally excludes, and why — mirrors overview.md's Non-Goals but at the data-model level.

## 7. Seed Fixture Specification
Single master fixture maintained in `prisma/seed.js` (and fixture files) shared by backend test scripts and initial frontend states.

### 7.1 Role Accounts & Baseline Credentials
Every supported role interacting with features has one pre-seeded account:
| Role | Email | Password | Pre-linked Entities / Context |
|---|---|---|---|
| Admin | admin@demo.com | Password123! | Full system permissions |
| [ManagerRole] | manager@demo.com | Password123! | Department / team scope |
| [EmployeeRole] | user@demo.com | Password123! | Individual scope |

### 7.2 Cumulative Feature Fixtures
- Tests do not use disposable random fixtures. Each feature test builds upon the standard role accounts above, so running tests progressively accumulates realistic profile data (history, logs, linked assets, transactions).
- Frontend begins with mock data mirroring this exact seed shape, then switches seamlessly to live API responses without schema mismatch.

