---
name: data-dense-ui
description: Use when building or reviewing any UI screen that displays lists, tables, dashboards, analytics/charts, or forms tied to relational data — admin panels, CRM/ERP screens, resource-management or booking interfaces. Apply this instead of generic marketing/landing-page design guidance whenever the screen's job is to help a user scan, filter, drill into, or edit structured records rather than persuade or showcase.
---

# Data-Dense UI

The goal on these screens is fast comprehension, not visual flourish. A reviewer or user should understand what they're looking at in under 3 seconds. Every rule below exists to protect that.

## Information hierarchy

- One primary action per screen, visually dominant (top-right button or similar convention) — never bury "Create" or "Add" among secondary actions.
- Group related fields/columns visually (spacing or subtle dividers) instead of one flat wall of data.
- Most important data first, left-to-right and top-to-bottom: identity/name columns before metadata, status before timestamps.
- Never let two elements compete for attention at the same visual weight — if everything is bold, nothing is.

## Tables and lists

- Every table needs: search, at least one filter, and sort on the primary column, even if the dataset is small in the demo — reviewers will test this.
- Show 8–15 rows before pagination or infinite scroll kicks in; don't dump 200 rows unpaginated.
- Status/enum fields render as colored badges, not plain text — one consistent color mapping across the whole app (e.g. green = active/completed, amber = pending, red = inactive/failed, gray = draft).
- Numeric and date columns right-align; text columns left-align.
- Row click target is the whole row (or a clear "view" affordance), not a tiny icon buried in a corner.
- Relational fields (e.g. a foreign key like `departmentId`) always render as the related name, never a raw ID or UUID.
- Every table has a real empty state: short explanation + a call to action, never just a blank white box.
- Destructive actions (delete) always require a confirm step; never a single click.

## Forms

- Multi-step (wizard) only when the entity genuinely has distinct phases (e.g. booking: pick resource → pick time → confirm). Otherwise use a single well-grouped form — don't wizard-ize simple CRUD.
- Group fields into visually distinct sections when a form has more than ~6 fields (e.g. "Basic Info" / "Assignment" / "Schedule").
- Inline validation on blur, not only on submit. Error messages sit directly under the field, specific ("End date must be after start date"), never generic ("Invalid input").
- Foreign key fields are searchable selects showing the related record's name, never a raw dropdown of IDs.
- Disable submit + show a spinner during async submission; never allow double-submit.
- Pre-fill sensible defaults where the schema defines them (e.g. status defaults to Active) so the form isn't asking the user to answer things the system already knows.

## Navigation for nested/relational data

- If entity B is meaningfully owned by or nested under entity A (e.g. Assets under Department), that relationship must be browsable both ways: A's detail page lists its B's, and B's detail page shows a link back to its A.
- Breadcrumbs on any page more than 1 level deep (List → Detail → Nested Detail).
- Sidebar/nav groups by domain area, not alphabetically — mirror how a user thinks about the system (e.g. group Assets, Maintenance, Audit under one "Assets" nav section).
- Never require more than 3 clicks to get from the dashboard to any record's detail page.

## Dashboards and analytics (admin)

Charts are a near-certain requirement, so treat this as first-class, not an afterthought bolted on at the end.

**Chart selection — match the chart to the question, don't default to bar charts for everything:**
- Trend over time → line or area chart.
- Comparing categories → horizontal bar chart if labels are long (department names, etc.), vertical if short.
- Part-of-whole (status breakdown, category share) → donut chart, not pie — donut leaves room for a center label (e.g. total count). Never use a pie/donut for more than 5–6 categories; group the rest into "Other."
- Single important number (total assets, active bookings) → a KPI stat card with a large number, short label, and a small trend indicator (▲/▼ vs. last period) — not a chart at all.
- Two correlated metrics → combo chart (bars + line) only if both are genuinely worth comparing on one axis; otherwise use two separate charts.

**Visual execution rules:**
- Top of dashboard = 3–5 KPI stat cards (single numbers), charts and tables below — orient the viewer with numbers before showing them trends.
- Consistent color palette across every chart in the app — pick 4–6 colors and reuse them for the same meaning everywhere (e.g. the color for "Active" status in a badge is the same color for "Active" in a chart legend).
- Axis labels and legends always visible — never a chart with unlabeled axes forcing the viewer to guess units.
- Gridlines light/subtle, never competing visually with the data itself.
- Every chart has a clear title stating what it shows, not just a generic card header.
- Tooltips on hover showing exact values — don't make the user estimate from the visual alone.
- Round numbers sensibly in labels (e.g. "1.2k" not "1247.83") but show exact values in tooltips.
- Loading state for charts is a skeleton/placeholder shaped like the eventual chart, not a spinner — reduces layout shift.
- If a chart would have no data yet (empty dataset), show an explicit "No data yet" state inside the chart area, never an empty axis with no explanation.
- Responsive: charts must not overflow or clip on smaller viewports — test at least one narrower breakpoint before calling a dashboard done.

## Loading / error / empty states (applies everywhere above)

- Loading: skeleton screens matching the eventual layout, not generic spinners, for anything above a simple button-level action.
- Error: specific, human message + a retry action, never a raw stack trace or generic "Something went wrong."
- Empty: always distinguish "no data yet" from "no results for this filter" — the message and CTA should differ (create-first-record vs. clear-filters).

## Self-check before calling a screen done

- Can I tell what this screen is for in 3 seconds without reading any body text?
- Does every table have search + filter + sort?
- Does every chart have a title, labeled axes, and a legend if it has more than one series?
- Are foreign keys shown as names everywhere, with zero raw IDs visible?
- Does every list/table/chart have a real empty state?
- Is there one dominant primary action, not several competing ones?
