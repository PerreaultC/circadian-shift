# Circadian Shift

A jet-lag planner. Input: flights + usual sleep hours. Output: a day-by-day
schedule of light, darkness, sleep, melatonin and caffeine that walks the
body clock onto destination time, exported to `.ics` and as a color-coded
picture.

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
5 state/storage, 6 render, 7 ICS, 7b the plan picture, 8 trip form, 9 wiring.

## The science, in short

Everything is anchored to **CBTmin**, the core body temperature minimum,
taken as habitual wake minus 3 h (per the Trip page's cited source and
its underlying PRC studies — not the commonly-quoted "minus 2 h" rule of
thumb). The light phase response curve pivots there:

| Light lands | Effect | Use when flying |
|---|---|---|
| after CBTmin | **advance** (clock earlier) | east |
| before CBTmin | **delay** (clock later) | west |

Melatonin's curve runs ~12 h out of phase with light's, so evening melatonin
advances. It is scheduled for eastward trips only; westward would need morning
melatonin, which just makes you sleepy when you need to be awake. Dose is
0.5 mg, taken 10 h before CBTmin. This is a primary-source number, not a
citation once removed: Revell, Burgess, Gazda, Smith, Fogg & Eastman,
"Advancing human circadian rhythms with afternoon melatonin and morning
intermittent bright light" (*J Clin Endocrinol Metab* 2006;91(1):54-9) gave
0.5 mg "5 h before baseline bedtime," advanced 1 h/day with the rest of the
schedule exactly like `cbt` is — which for a normal night's sleep is
`cbt-10*HOUR`, the same figure Burgess's book chapter cites this study for.

That 2006 trial is also where the dose choice comes from: 0.5 mg and 3.0 mg
produced statistically indistinguishable phase advances (2.5 h vs 2.6 h,
p=0.79) when each was given at its own correct time (3.0 mg was dosed 7 h
before bedtime, not 5 — Burgess, Revell, Molina & Eastman, "Human phase
response curves to three days of daily melatonin: 0.5 mg versus 3.0 mg,"
*J Clin Endocrinol Metab* 2010;95(7):3325-31, independently confirmed that
higher doses need *earlier*, not later/closer-to-bed, timing). But the
3.0 mg group in the 2006 trial "had slightly longer sleep latencies... and
correspondingly poorer sleep efficiencies," which is why its authors
recommended the lower dose: same phase-shifting benefit, worse sleep, no
reason to take more. This caveat lives in the Trip page's tips list (not
repeated per melatonin event) since it's exactly the kind of assumption a
user would otherwise carry over incorrectly if they took a different dose.

Rates: well-regulated (this app's only pace) advance 1.5 h/day, delay
2.0 h/day; unregulated advance 1.0 h/day, delay 1.5 h/day — Burgess's own
numbers (2011, Ch. 16), not the 2.5 h/day delay this file used to carry.
Advances are capped at 1.5 deliberately — past that the schedule outruns
the clock and morning light starts landing *before* CBTmin, where it
delays instead.

## Rules that are not obvious

- **No livability floor.** How early the user is willing to wake before
  departure is their call, not the page's — there used to be a `cfg.floor`
  cap on this and it was removed deliberately. The only cap left is the
  calendar: extra prep days buy smaller nightly steps, not a bigger total
  shift.
- **Prep nights use a flat 1 h/day — never the safety ceiling.** This is
  the one place the engine follows a cited source's actual numbers rather
  than an inference: Burgess, "Using Bright Light and Melatonin to Reduce
  Jet Lag" (2011, *Behavioral Treatments for Sleep Disorders*, Ch. 16 —
  the source already named on the Trip page), states plainly that an
  eastward traveler should "shift your habitual bed and wake times 1 hour
  earlier per day" and a westward one "1 hour later per day," and her
  Figure 16.2 example uses a **3-day** preflight shift. `prep` is 3, not
  4. `prepRate` is a flat `1` in both directions, not derived from `rate`
  — three earlier designs (a ramp, a flat rate at 2/3 of the safety
  ceiling, and a night-one-is-baseline variant) were tried and walked
  back for being unmoored from the literature, not just for looking too
  aggressive. Eastman et al., "Advancing circadian rhythms before
  eastward flight" (*Sleep* 2005;28(1):33-44) is the study behind the
  book chapter's number: it directly compared 1 h/day against 2 h/day and
  found the faster pace bought only a slightly bigger phase advance while
  misaligning sleep, concluding 2 h/day "is not better... because it was
  too fast." `rate` (1.5 h/day advance, 2 h/day delay) is the *outer
  safety limit* for later nights, never the prep-night target.
  `prepCum(n) = prepRate * n` is a flat per-night increment from night one
  — no ramp, no baseline night. `maxPre` is `prepCum(prep)`, capped by
  `total`; the remainder falls to the flight and the nights after landing.
- **Home time zone is derived, not asked for.** `homeTz` in `buildPlan` is
  `legs[0].fromTz` — wherever the earliest-departing leg leaves from —
  computed after `legs` is sorted by departure time. There is no home-zone
  field in the Trip form any more; the departure airport already answers
  the question, and asking twice invited the two to disagree.
- **Sleep the flight, but only if it lands you in the morning.** A long leg
  arriving 03:00–12:00 local is slept end to end (take-off + 20 min to landing
  − 2 h) and yields most of the shift. A westbound leg landing in the evening
  must NOT be slept; it gets one nap over the body's night instead.
- **Westbound is not a mirror of eastbound.** The landing night aims straight
  at the destination's own bedtime; sleep pressure from a stretched travel day
  carries it. Evening light stops 90 min before bed (later light delays sleep
  onset), and the wind-down window after it is sleep hygiene, not phase work
  (`hyg: true` — exclude it from PRC assertions).
- **A westbound flight slept end to end is still a delay day.** The
  post-wake "Block light" window and the pre-bedtime "Stay in the
  light"/"Bright light" windows are computed from two different anchors
  (wake, and the *next* night's bedtime) that are normally many hours
  apart — except on the flight-sleep cycle of a westbound trip landing in
  the morning, where they can end up close enough to collide. "Block
  light" is capped at the start of the afternoon window for exactly this
  reason; it has no real calibrated example to check against (the one
  westbound route in `calibration.md` lands in the evening and never
  takes this branch).
- **Light windows run a full 4 h past CBTmin, both directions.** Burgess:
  seek light "for at least the 4 hours after your Tmin" to advance, avoid
  light "for at least the 4 hours after your Tmin" to delay (a different
  clause from the one that governs seeking light before Tmin to delay).
  The advance branch's "Bright light" event spans `wake` to `wake+4*HOUR`
  (anchored to wake rather than cbt because the first 3 of those 4 hours
  fall before waking, where you can't act on them anyway; `wake = cbt+3h`
  makes this equivalent to `cbt` to `cbt+7h`, i.e. the mandated window plus
  3 more hours once you're actually up). The delay branch's post-wake
  "Block light" event, by contrast, must be anchored to `cbt` itself
  (`darkTo = cbt+4*HOUR`, not `darkFrom+4*HOUR`): most of that window also
  falls before waking (it's `cbt` to `cbt+4h = wake+1h`), but there is no
  wake-anchored restatement for this side the way there is for advance's
  morning light, so extending it to a fresh `wake+4h` — as this file did
  until it was caught and fixed — overshot the actual rule by 3 hours.
  The delay branch's own evening "Bright light" window (`nextBed-5.5h` to
  `nextBed-1.5h`) was already the right 4 h and needed no change.
- **Departure morning is set by the flight.** `DEF_LEAD = 5` h before take-off
  (time at the airport plus getting there and getting ready — not sleeping
  that close to a flight is a practicality rule, not a phase-science one).
  Guaranteed invariant: never asleep inside that window. If the user is up
  before CBTmin, light is blocked until CBTmin passes — switching the lights on
  at 02:00 is in the *delay* zone and undoes days of work.
- **Long way round.** For large eastward gaps, delaying can arrive sooner since
  delays shift ~2x faster. Checked automatically.
- **Once settled**, instructions stop after one consolidation night.

## Design intent

Decisions the owner made explicitly. Treat these as settled unless he reopens
them; several were arrived at by reversing an earlier choice.

- **The intro is the owner's voice, not boilerplate.** The Trip page opens
  with why he built this (an academic travelling on a tight schedule, no
  luxury of arriving days early), when he actually uses it (outbound, not
  the return leg — home is easier to re-entrain in), and three plain-language
  notes on how to use it (it's the consistency that works, not sleeping
  through "block light," and the calendar is the real mechanism, the picture
  just a glance). It closes with a one-line privacy note and, at the very
  bottom of the page, the actual sources the rules are drawn from
  (Eastman & Burgess, Rush University). This replaced an earlier, much
  thinner pitch line that was cut for being filler — the difference is
  substance, not just length.
- **The page is a generator, not a travel companion.** You build the plan once
  before the trip, export it, and close the tab. During the trip you live off
  calendar alerts. A web page cannot wake you at 04:00, and one you must
  remember to open is no use at 04:00 either. The live "now" line (`renderNow`,
  `stateAt`, the per-second `setInterval`) that used to sit at the top of Plan
  as a convenience is gone entirely now — not even a convenience earns a
  place if the page's whole premise is that you won't have it open. The
  day-by-day list still dims past events and marks the live one
  (`.ev.past`/`.ev.live`) for the times you do happen to have it open, which
  is enough of a nod to "now" without a whole line of the page and a running
  timer maintaining it.
- **Minimal, to a fault — but the owner's document style, not an app's.**
  Black on white, hairline rules, no cards, no shadows, no rounded corners.
  Prose was cut hard, twice now; prefer deleting a sentence to adding one.
  Type now deliberately matches the owner's own site (perreaultc.github.io),
  not just its font: body text at 16px/1.58 in `#222`, and section
  headings styled like that site's `h2` — sentence case, semibold, a
  `border-bottom` rule, no small tracked-out uppercase labels. The font
  stack is `Arial,Helvetica,sans-serif` for both `--mono` and `--sans`, no
  webfont loaded. That reverses an earlier choice (IBM Plex Mono via
  Google Fonts at ~13.5px, all-caps tracked labels for headings, "an
  emacs-using computer scientist's little open-source project"); the
  downloadable picture still needs *a* monospace font for its character
  grid, so its canvas text asks for `ui-monospace, monospace` — whatever
  the system provides, not a specific loaded one.
- **One page, not three.** Plan and Export used to be separate tabs; Export
  is gone and its cards now render inside Plan, in this order: the demo
  banner, **Strategy**, **Calendar export**, the picture, then the
  day-by-day list. Pressing Build lands there directly. Nav is just
  `trip` / `plan` now. The "One more step" nudge card that used to point at
  the separate Export tab is gone too — with the calendar-export card
  always inline, a second card asking the reader to go export their
  calendar read as two competing prompts for the same action.
- **No separate legend.** It used to be its own card, below everything
  else, translating color dots back into event names. The picture now
  draws its own legend directly into the image (see "Solid color bars,
  not ASCII" below), so a second, separate legend for the same colors
  was explaining something already explained.
- **Times and a heading, not a paragraph, per event.** The day-by-day list
  used to carry a description under every event heading ("Get outside.
  Indoors, a 10,000 lux box."). Dropped from the on-screen row — the
  heading plus start/end times already say what to do — but `e.d` is
  untouched in the data model and still is the `.ics` alarm body
  (`buildIcs`); the calendar notification is the one place that text still
  earns its keep, read at a glance with no page open at all.
- **No settings that do not earn their place.** A standard/aggressive toggle,
  melatonin dose and timing dropdowns, a prep-days slider, an "earliest
  you'll wake" livability floor, and (most recently) an explicit home-time-zone
  field were all built and then removed. What survives: sleep hours, the
  flights. Everything else is fixed in `FIXED` / `DEF_LEAD`, or, for home
  time zone, derived from the flights themselves. Explanatory prose that
  didn't earn its place either: the iOS install note, the medical
  disclaimer, the "starts 4 days before departure" filler, and the live
  "X h before you fly ... Y nights to finish after you land" preview under
  the sleep-hours fields are all gone too. The front-page pitch line was
  also cut, then reinstated with real substance — the owner's own
  reasons for building this (see "The intro is the owner's voice, not
  boilerplate" below) — rather than restored as filler. The disclaimer's
  removal is the owner's own call, not a safety-review conclusion, so
  restore it without hesitation if this ever leaves personal use.
- **Solid color bars, not ASCII.** This reverses the original "Pure ASCII
  output" choice: the picture used to render the literal character grid
  (`planAscii`, one `S`/`*`/`#`/`~`/`m` per hour) as monospace text, which
  meant memorizing a legend to read a glance-able overview. `planAscii` and
  the character grid are gone entirely — no copyable text version exists any
  more, on-screen or otherwise. `planRows` (in `renderPlanImage`) now walks
  the same events but keeps each window's *exact* fractional start/end hour
  (`f0`/`f1`, not a character index) and draws it as a filled rectangle;
  `planColors` reads the actual `--c-*` custom properties the Plan page's
  own event rail uses (hardcoded fallback for the headless test harness,
  which has no real CSSOM), so the picture and the on-screen list can never
  show different colors for the same thing. Melatonin and take-off are
  point markers (a dot, a triangle) rather than a character. Every hour
  still gets a tick and a rotated label on the ruler — a photo has no
  phone-width limit to respect — and the canvas text is plain
  `Arial,Helvetica,sans-serif` now too, since nothing in a bar chart needs
  a monospace grid the way character art did. The calendar download stays
  the one styled as the primary action; the picture is the take-away, not
  the mechanism.
- **The picture's title is just the route.** It used to be
  `"PHX -> LHR   advance 8 h at 1.5 h/day"` with a date-range subtitle below
  it (`fmtDate` of the first and last row). Both are gone: the direction,
  total, and rate are already the Strategy card's job in prose, and the
  picture repeating them as a second, terser restatement wasn't adding
  information, just a second place to keep in sync. `L0.from+" to "+LN.to`
  is the whole title now; `fmtDate` was deleted as dead code once nothing
  else called it.
- **The legend only lists what's actually drawn.** `legendItems` used to be
  a fixed list regardless of the plan; a westbound trip with no melatonin,
  or an eastbound one with no nap, still got a swatch for it. It's now
  filtered against a `usedKinds` set built from that plan's own `bars` and
  `points`, so "In-flight nap" only appears on the westbound trips that
  actually get one, and "Melatonin" only on the eastbound ones that do.
- **Plan has two named sections, not an implicit split.** "Overview" (the
  `imgCard`) and "Full breakdown" (`planList`) are real `<h2>`s now,
  matching Strategy and Calendar export instead of the picture and the
  day-by-day list just starting with no heading of their own.
- **Hand-typed dates.** Native `datetime-local` / `time` pickers were removed
  as fiddly. Fields are plain text with forgiving parsers (`parseTime`,
  `parseWhen`) and canonical reformatting on blur.
- Owner's own hours, used as defaults: **22:00 / 06:00**, Phoenix.

## Calibration

**Stale throughout.** The pre-flight formula and the CBTmin anchor have
both changed since these numbers were measured (see "Rules that are not
obvious" and "The science" above: `prep`, `prepRate`, and CBTmin =
wake − 3 h rather than − 2 h all moved), so even the flight night's exact
match no longer applies — CBTmin shifting by an hour shifts every
absolute time in the comparison. Needs a fresh comparison run before any
"validated" claim is reinstated.

Originally validated against real plans from a commercial jet-lag app for
PHX↔LHR, on that app's own inputs (23:00–07:00): the flight night matched
exactly and every other night was within 15 min; both plans ended on the
same calendar day in both directions. Full tables in `README.md`; the raw
screenshot transcriptions and the derivation are in `calibration.md`.

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
