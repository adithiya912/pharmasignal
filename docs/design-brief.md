# Design Brief — PharmaSignal Frontend

Do NOT default to a standard admin-dashboard grid (rows of white
rounded cards in a 3-column layout). That is the generic answer for
"medical dashboard" and it is explicitly rejected for this project.

## Concept
PharmaSignal's whole job is finding a signal inside noise — one real
pattern buried in thousands of scattered patient reports. The
interface should embody that: a continuous thread that runs through
the product and picks out signals from surrounding noise, not a wall
of equal-weight boxes.

## Signature element
A continuous vertical "signal line" (like a clinical monitor trace)
runs down the spine of every main view — the patient timeline, the
doctor's report queue, the admin trend view. Reports/events attach to
it as nodes along the line. When a cluster or interaction risk is
detected, the line visibly spikes or thickens at that point, like a
waveform reacting to an anomaly. This is the one bold, memorable
device — everything else stays quiet around it.

## Color
- Background (deep): `#0E1B2A` — near-black clinical navy, not pure black
- Background (panel): `#F6F1E7` — warm parchment, used for content
  panels floating over the navy, evokes paper case files/lab records
- Signal accent (default line/verified evidence): `#7A9B76` — muted sage
- Alert accent (medium risk): `#E8A33D` — signal amber
- Critical accent (high risk): `#D46A6A` — soft coral, used sparingly,
  only for genuine high-risk flags — never decorative

## Type
- Display (headlines, section titles): a serif with clinical/journal
  character — e.g. Newsreader or Source Serif 4. Used with restraint,
  larger sizes only.
- Body (UI text, forms): IBM Plex Sans — clean, neutral, legible at
  small sizes for data-dense doctor/admin views
- Data/mono (drug codes, extracted entities, dosages): IBM Plex Mono
  — makes extracted medical data visually distinct from prose, like
  a lab printout

## Layout
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

## Motion
One deliberate moment: when a new risk signal is detected, the
relevant point on the line animates (a subtle pulse/thicken), then
settles. No scattered hover animations elsewhere — keep the rest of
the interface still and calm, appropriate for a clinical tool.

## Writing/copy tone
Plain, clinical, no marketing language. Buttons say what they do
("Flag for review", not "Take action"). Empty states explain what's
missing and what to do next. Never editorialize a risk score — state
the level and the evidence, let the doctor conclude.

## Setup note
Anthropic's frontend-design plugin/skill (from the Claude Code
marketplace) should be enabled for this project — it enforces
distinctive, non-templated UI choices instead of defaulting to
generic dashboard patterns. Install it before starting frontend work.
