# Design Brief — PharmaSignal Frontend

**Revision 2 — supersedes the "signal line" brief below the line marked
`--- Revision 1 (archived) ---`.** The product now ships three separate
portals (Patient/Doctor/Admin) plus a public marketing site, and the visual
direction has moved to a modern AI SaaS register — the kind of polish users
already expect from Vercel, Linear, Stripe, or Notion — rather than a single
clinical case-file motif stretched across every surface. Kept from Revision
1: plain, evidence-first copy, and the rule that risk/interaction data is
never decorative or invented.

## Concept
Three audiences, three jobs. A patient needs reassurance and clarity. A
doctor needs density and speed without clutter. An admin/regulator needs
trend visibility at a glance. One shared design *system* (tokens, primitives,
motion rules) serves all three, but each portal's information density and
navigation model is tuned to its job — this is not one dashboard reskinned
three times.

Explicitly rejected: a generic 3-column grid of identical white cards with
no hierarchy. Every dashboard needs a clear focal element (a hero stat, a
primary chart, a triage list) — cards support it, they don't replace it.

## Color
Two themes, both fully supported (`next-themes`, class-based, user-toggleable
— not a fixed single look like Revision 1):

- **Dark** (default): near-black navy-charcoal background
  (`oklch(0.16 0.02 260)`), glass panels at `oklch(0.22 0.02 260 / 0.6)` with
  `backdrop-blur`, hairline borders at `oklch(1 0 0 / 10%)`.
- **Light**: soft off-white background (`oklch(0.98 0.005 260)`), glass
  panels at `oklch(1 0 0 / 0.7)` with `backdrop-blur`, hairline borders at
  `oklch(0 0 0 / 8%)`.
- **Brand accent** (both themes): an indigo-violet gradient
  (`oklch(0.6 0.19 280)` → `oklch(0.65 0.18 255)`) for primary actions,
  active nav states, and the hero/marketing surfaces only — not sprinkled
  everywhere.
- **Risk tiers** (both themes, carried over from Revision 1's semantics
  because clinicians already read them correctly): sage-green (low),
  amber (medium), coral-red (high). These three colors are reserved
  exclusively for risk/severity signaling — never used decoratively.

## Type
- UI/body: **Geist Sans** (or Inter as fallback) — the clean grotesque this
  entire SaaS register is built around.
- Data/mono (drug codes, dosages, extracted entities, timestamps): **Geist
  Mono** (or IBM Plex Mono fallback) — keeps machine-extracted data visually
  distinct from prose.
- Display (landing-page hero, section headers): the same Geist Sans at
  larger weights/tracking, not a separate serif — one typeface family,
  fewer decisions, matches the reference products named in the brief.

## Layout
- **Marketing/landing**: full-bleed sections, generous vertical rhythm,
  centered max-width content column (`max-w-6xl`), asymmetric hero (copy +
  CTA left, animated illustration right on desktop, stacked on mobile).
- **Patient portal**: sidebar + topbar app shell, single-column content
  focused on one task at a time (the report wizard, one dashboard screen),
  generous whitespace — calm, not dense.
- **Doctor portal**: same app shell, denser content (tables, split
  list/detail views, inline charts) — clinicians scan fast, don't need
  patient-style whitespace.
- **Admin portal**: same app shell again, KPI row + multi-chart layout, but
  every KPI must trace to a real aggregate query — no placeholder numbers.
- All three portals share one `AppShell` component (collapsible sidebar,
  topbar with search/theme-toggle/user menu) so the navigation *chrome* is
  consistent even though each portal's *content* density differs.

## Motion
Framer Motion, used with intent, not decoration:
- Page/section entrances: short fade+rise (150–250ms, ease-out), staggered
  for lists/grids.
- The AI analysis sequence (report submission → result) is the one
  showcase animation: each real pipeline stage lights up in order as its
  actual API call resolves — this animates *real* async state, never a
  fixed timer standing in for work that isn't happening.
- Hover/press states: subtle (scale 0.98–1.02, 100–150ms) on interactive
  elements only.
- Respect `prefers-reduced-motion` — all entrance/hover animation must have
  a reduced/no-motion fallback.

## Writing/copy tone
Plain, evidence-first, no black-box claims — unchanged from Revision 1.
Marketing copy (landing page) may be warmer and more persuasive than in-app
copy, but numbers on the landing page must be real aggregates, and any
claim about the AI must stay inside what `docs/features.md` actually
documents (e.g. never claim a specific model accuracy that isn't backed by
a real, current evaluation).

## Setup note
Anthropic's frontend-design plugin/skill should stay enabled — it's what
catches "default card-grid dashboard" drift before it ships. shadcn/ui base
components live in `src/components/ui/` (style: `base-nova`, built on
`@base-ui/react`, not Radix — keep using the shadcn CLI, not manual Radix
installs, to stay consistent). New shared primitives (`AppShell`,
`GlassCard`, `StatTile`, `RiskBadge`, `StepperWizard`, `EmptyState`) live in
`src/components/` and are imported by all three portals rather than
duplicated per portal.

---
## Revision 1 (archived — no longer the active direction)

Do NOT default to a standard admin-dashboard grid (rows of white
rounded cards in a 3-column layout). That is the generic answer for
"medical dashboard" and it is explicitly rejected for this project.

### Concept
PharmaSignal's whole job is finding a signal inside noise — one real
pattern buried in thousands of scattered patient reports. The
interface should embody that: a continuous thread that runs through
the product and picks out signals from surrounding noise, not a wall
of equal-weight boxes.

### Signature element
A continuous vertical "signal line" (like a clinical monitor trace)
runs down the spine of every main view — the patient timeline, the
doctor's report queue, the admin trend view. Reports/events attach to
it as nodes along the line. When a cluster or interaction risk is
detected, the line visibly spikes or thickens at that point, like a
waveform reacting to an anomaly. This is the one bold, memorable
device — everything else stays quiet around it.

### Color (archived)
- Background (deep): `#0E1B2A` — near-black clinical navy, not pure black
- Background (panel): `#F6F1E7` — warm parchment, used for content
  panels floating over the navy, evokes paper case files/lab records
- Signal accent (default line/verified evidence): `#7A9B76` — muted sage
- Alert accent (medium risk): `#E8A33D` — signal amber
- Critical accent (high risk): `#D46A6A` — soft coral, used sparingly,
  only for genuine high-risk flags — never decorative

### Type (archived)
- Display (headlines, section titles): a serif with clinical/journal
  character — e.g. Newsreader or Source Serif 4. Used with restraint,
  larger sizes only.
- Body (UI text, forms): IBM Plex Sans — clean, neutral, legible at
  small sizes for data-dense doctor/admin views
- Data/mono (drug codes, extracted entities, dosages): IBM Plex Mono
  — makes extracted medical data visually distinct from prose, like
  a lab printout

### Layout (archived)
Reject symmetric grid columns. Instead:
- Content is organized as an asymmetric "case file" — the signal
  line runs down one side (offset, not centered), panels of varying
  width branch off it and stagger vertically rather than aligning to
  a column grid
- Patient view: a single vertical case history, reports as nodes on
  the line, most recent at top
- Doctor view: the line becomes a triage queue — urgent nodes pull
  slightly left/forward, routine ones sit back and smaller
- Admin/regulator view: multiple signal lines side by side (one per
  drug class or region), NOT a grid of stat cards

### Motion (archived)
One deliberate moment: when a new risk signal is detected, the
relevant point on the line animates (a subtle pulse/thicken), then
settles. No scattered hover animations elsewhere — keep the rest of
the interface still and calm, appropriate for a clinical tool.
