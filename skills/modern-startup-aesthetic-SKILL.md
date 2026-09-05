---
name: modern-startup-aesthetic
description: Use when establishing or reviewing the visual identity of a UI — font choices, color palette, spacing, corner radius, shadows, and micro-interactions. Apply alongside data-dense-ui (which governs layout/structure) whenever the goal is a polished, modern, "funded startup" look rather than a generic admin-template or default-framework appearance. Trigger on any request to make a UI look "modern," "clean," "sleek," "premium," or "professional."
---

# Modern Startup Aesthetic

The failure mode this skill exists to prevent: default Inter font, pure black-on-white or a random purple-to-blue gradient, 8px rounded corners on everything, harsh drop shadows, no defined color scale — the visual signature of an ungoverned AI-generated UI. None of these are wrong individually; the problem is picking them by default instead of on purpose. Every choice below should feel deliberate, not templated.

## Typography

- Never rely on default framework fonts as-is (system-ui, plain Inter with no pairing). Pick two fonts max: one for headings/display, one for body/UI text. It's fine for both to be sans-serif, but they should be different enough to create hierarchy.
- Startup-modern pairings that read as intentional (pick one, don't mix across projects):
  - Geist (headings) + Geist (body) — Vercel's font, very "modern SaaS," works as a single-font system if weight contrast is used well.
  - General Sans or Cabinet Grotesk (headings, bold/semibold) + Inter or IBM Plex Sans (body) — geometric heading with a neutral, highly legible body.
  - Instrument Serif (headings, used sparingly for large display text only) + Inter or Söhne-alternative like Public Sans (body) — adds an editorial, less generic feel; use the serif only above ~28px, never in body text or tables.
- Type scale: define once, reuse everywhere — e.g. 12 / 14 / 16 / 20 / 24 / 32 / 48px. Body text defaults to 14–16px, never smaller than 12px for anything a user must read closely.
- Font weight does more hierarchy work than size — prefer 500/600 (medium/semibold) for emphasis over jumping several sizes up.
- Line height: 1.5 for body text, 1.1–1.3 for large headings. Tight headings, breathable body — not the reverse.
- Letter-spacing: default (0) for body; small negative tracking (-0.01 to -0.02em) on large headings reads more premium; avoid letter-spacing tricks on body text or tables, it hurts scanability.

## Color

- Never ship the default gradient-purple-to-blue "AI app" look unless the brand genuinely calls for it. Pick one anchor brand/accent color deliberately tied to the product's domain, not a random pick.
- Build a real scale, not just one hex value: 50 (near-white tint) through 900 (near-black shade) for the primary color, plus a neutral gray scale (also 50–900) for backgrounds, borders, and text. Most of the UI should be built from the neutral scale; the accent color is used sparingly — primary buttons, active states, key data highlights — not as a background wash everywhere.
- Backgrounds: avoid pure #FFFFFF or pure #000000 as the base canvas — use a warm, minimal beige or soft oat canvas (e.g. #F7F4EE / #F9F8F5) in light mode or a warm deep charcoal (#181716) in dark mode. Pure sterile white next to dense data tables reads harsh and template-like.
- Semantic status colors (success/warning/error/info) must be desaturated and visually distinct from the brand accent color — never reuse the brand color as both "primary action" and a status badge.
- Contrast: body text on background must comfortably exceed 4.5:1 contrast; use deep ink navy or dark espresso (#192438 / #2D231E) for body copy, never light washed-out grays for essential data.
- Avoid the generic AI tells: purple-to-blue gradients, high-saturation neon greens, and default unconfigured slate/indigo. Instead, adopt one of these three minimal, classic enterprise ERP directions:
  1. **Warm Beige & Deep Navy (with Dull Orange CTA)**:
     - Canvas / Neutral: Warm soft beige canvas (#F7F4EE), border tone (#E5E1D8), deep navy body text (#192438).
     - Accent / CTA: Dull warm orange (#C86D3B) for primary actions and active navigation highlights (used sparingly, never as a full background wash).
     - Status badges: Success moss green (#3F6E4E), Warning ochre (#B8822A — hue-shifted from the dull orange), Error deep brick (#9E3836), Neutral warm slate (#6B7280).
     - *Tone:* Classic, reliable, human — feels like a modern Bloomberg/Odoo hybrid.
  2. **Warm Oat & Espresso Brown (with Dull Terracotta)**:
     - Canvas / Neutral: Pale oat/linen (#F9F8F5), warm stone borders (#E8E4DA), deep espresso walnut text & headers (#2D231E).
     - Accent / CTA: Muted terracotta / warm tobacco (#BA5A31) for primary buttons and selection rings.
     - Status badges: Success olive forest (#4A6B48), Warning warm amber (#BD8527), Error dried rust (#A13535), Neutral pebble gray (#78716C).
     - *Tone:* Grounded, operational, industrial — ideal for inventory, manufacturing, logistics, and physical assets.
  3. **Cream Alabaster & Deep Wine / Muted Magenta (with Slate Navy)**:
     - Canvas / Neutral: Pale cream alabaster (#F8F7F4), soft chalk borders (#E7E5E0), deep charcoal slate text (#1E222D).
     - Accent / CTA: Deep wine / muted magenta (#782548) for primary CTA and key metrics — distinctive, elegant, and unmistakably bespoke.
     - Status badges: Success pine green (#386850), Warning deep gold (#B3862B), Error crimson plum (#942A38), Neutral muted ash (#64748B).
     - *Tone:* Authoritative, executive, financial — ideal for billing, CRM, audit, and executive dashboards.
- General rule for ERP systems: status colors must be muted enough to sit in dense 20-row tables without vibrating, while the accent color directs user focus to the single primary action per view.
- Dark mode isn't just inverted colors — re-check contrast and desaturate the accent color slightly in dark mode (a fully saturated accent color often looks too loud against near-black).

## Spacing, shape, and elevation

- Use a consistent spacing scale (4px base: 4/8/12/16/24/32/48/64) — no arbitrary one-off margins.
- Pick one corner-radius system and apply it everywhere: e.g. 6px for inputs/buttons, 12px for cards, 16–20px for modals. Don't mix sharp and heavily rounded elements in the same view.
- Shadows should be subtle and used to indicate elevation, not decoration — prefer soft, low-opacity shadows (e.g. `0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)`) over harsh single dark shadows. A thin 1px border often reads more premium than a heavy shadow for cards sitting flat on the page.
- Whitespace is a feature, not empty space to fill — generous padding inside cards/sections (24–32px) reads more premium than cramped content.

## Micro-interactions and finishing touches

- Transitions on interactive elements (hover, focus, state change): 150–200ms, ease-out. Anything longer feels sluggish; anything instant feels cheap.
- Hover states should be subtle: slight background shift, slight elevation increase, or accent-color border — not large scale/color jumps.
- Use one consistent icon set throughout (e.g. Lucide) — never mix icon libraries or styles (outline vs. filled) within the same screen.
- Focus states must be visible and consistent (accessibility + polish) — a visible focus ring in the accent color, not the browser default blue outline.
- Buttons: one clear visual hierarchy — solid/filled for primary action, outline or ghost for secondary, text-only for tertiary. Never more than one solid-filled button competing for attention in the same view.

## Self-check before calling the visual pass done

- Would this be visually distinguishable from the default output of a UI generator with no styling instructions?
- Are there exactly two fonts in use, applied consistently (not a third sneaking in via a component library default)?
- Is there a real color scale (not just 3–4 arbitrary hex values), and is the accent color used sparingly rather than everywhere?
- Do buttons, cards, and inputs share one consistent corner-radius and shadow system?
- Does dark mode (if present) get its own contrast/saturation pass, not just inverted values?
