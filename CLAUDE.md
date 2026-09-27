# Circadian Shift

A jet-lag planner. Input: flights + usual sleep hours. Output: a day-by-day
schedule of light, darkness, sleep, melatonin and caffeine that walks the
body clock onto destination time, exported to `.ics` and as an ASCII chart.

Single static page, no backend, no dependencies, no build step beyond
`build.py`. Trip state lives in `localStorage`.

## Layout

- `app-body.html` — **the source of truth.** Everything lives here: styles,
  markup, engine. It is published as an artifact body (no `<html>`/`<head>`
  wrapper) and is also the input to the build script.
- `build.py` — wraps `app-body.html` into a standalone `index.html` with a
  head, charset, manifest link and service-worker registration. Run after
  every edit to `app-body.html`.
- `index.html` — **generated. Never edit directly.**
- `sw.js`, `manifest.webmanifest`, `icon*` — PWA shell for GitHub Pages.

Script sections in `app-body.html` are numbered in comments: 1 airports,
2 timezone math, 3 the engine (`buildPlan`), 4 current-state lookup,
5 state/storage, 6 render, 7 ICS, 7b ASCII chart, 8 trip form, 9 wiring.

## The science, in short

Everything is anchored to **CBTmin**, the core body temperature minimum,
taken as habitual wake minus 2 h. The light phase response curve pivots there:

| Light lands | Effect | Use when flying |
|---|---|---|
| after CBTmin | **advance** (clock earlier) | east |
| before CBTmin | **delay** (clock later) | west |

Melatonin's curve runs ~12 h out of phase with light's, so evening melatonin
advances. It is scheduled for eastward trips only; westward would need morning
melatonin, which just makes you sleepy when you need to be awake.

Rates: advance 1.5 h/day, delay 2.5 h/day. Advances are capped at 1.5
deliberately — past that the schedule outruns the clock and morning light
starts landing *before* CBTmin, where it delays instead.

## Rules that are not obvious

- **Livability floor.** Pre-flight shifting is capped by how early the user
  will wake (`cfg.floor`, default 04:00), not by the calendar. Extra prep days
  buy smaller nightly steps, not a bigger total shift.
- **Sleep the flight, but only if it lands you in the morning.** A long leg
  arriving 03:00–12:00 local is slept end to end (take-off + 20 min to landing
  − 2 h) and yields most of the shift. A westbound leg landing in the evening
  must NOT be slept; it gets one nap over the body's night instead.
- **Westbound is not a mirror of eastbound.** The landing night aims straight
  at the destination's own bedtime; sleep pressure from a stretched travel day
  carries it. Evening light stops 90 min before bed (later light delays sleep
  onset), and the wind-down window after it is sleep hygiene, not phase work
  (`hyg: true` — exclude it from PRC assertions).
- **Departure morning is set by the flight.** `DEF_LEAD = 4` h before take-off.
  Guaranteed invariant: never asleep inside that window. If the user is up
  before CBTmin, light is blocked until CBTmin passes — switching the lights on
  at 02:00 is in the *delay* zone and undoes days of work.
- **Long way round.** For large eastward gaps, delaying can arrive sooner since
  delays shift ~2x faster. Checked automatically.
- **Once settled**, instructions stop after one consolidation night.

## Design intent

Decisions the owner made explicitly. Treat these as settled unless he reopens
them; several were arrived at by reversing an earlier choice.

- **The page is a generator, not a travel companion.** You build the plan once
  before the trip, export it, and close the tab. During the trip you live off
  calendar alerts. A web page cannot wake you at 04:00, and one you must
  remember to open is no use at 04:00 either. A compact "now" line survives at
  the top of Plan as a convenience, not as the mechanism.
- **Minimal, to a fault.** Black on white, monospace, hairline rules, no cards,
  no shadows, no rounded corners. The reference point given was "an emacs-using
  computer scientist's little open-source project". Prose was cut hard once
  already; prefer deleting a sentence to adding one.
- **No settings that do not earn their place.** A standard/aggressive toggle,
  melatonin dose and timing dropdowns, and a prep-days slider were all built
  and then removed. What survives: sleep hours, home zone, earliest wake, the
  flights. Everything else is fixed in `FIXED` / `DEF_LEAD`.
- **Show consequences, not just controls.** Where a setting is kept, the form
  states what it does with the current trip ("2 h before you fly, the flight
  adds 3.5 h, 2 nights to finish after you land") rather than leaving the user
  to infer it.
- **Pure ASCII output.** The plan picture is an ASCII chart, not a drawn one —
  it survives any encoding, stays sharp at any zoom, and fits phone width at
  ~37 columns. A literal arrow character previously rendered as mojibake.
- **Hand-typed dates.** Native `datetime-local` / `time` pickers were removed
  as fiddly. Fields are plain text with forgiving parsers (`parseTime`,
  `parseWhen`) and canonical reformatting on blur.
- Owner's own hours, used as defaults: **22:00 / 06:00**, Phoenix.

## Calibration

Validated against real Timeshifter plans for PHX↔LHR. On Timeshifter's own
inputs (23:00–07:00) the flight night matches exactly and every other night is
within 15 min; both plans end on the same calendar day in both directions.
Full tables in `README.md`; the raw screenshot
transcriptions and the derivation are in `calibration.md`.

## Testing

```sh
npm test          # node --test, no dependencies
python3 build.py  # regenerate index.html
```

`test/harness.js` is a hand-rolled DOM stub. It deliberately returns `null`
for ids absent from the markup, because a permissive stub previously hid a
crash. It cannot render, lay out, or fire real events.

## Known gaps

1. ~~The page has never been visually verified.~~ Verified 2026-09-27: served
   locally and checked in a real browser at desktop and 375px widths. Layout,
   fonts, the trip/plan/export panes, and the canvas PNG export all render
   correctly. `npm test` (74 tests) also passes clean.
2. `.ics` alarms (`VALARM`) are honoured by Apple Calendar but inconsistently
   by Google Calendar, which may substitute its own default reminder.
3. The airport table holds ~330 codes; anything else falls back to a manual
   timezone picker.
4. Keep the file pure ASCII (`\uXXXX` escapes in JS, entities in markup) — a
   literal `→` previously rendered as mojibake.
