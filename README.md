# Circadian Shift

A jet lag planner. Give it your flights and your usual sleep hours; it
builds a day-by-day schedule of light, darkness, sleep, melatonin and
caffeine that walks your body clock onto destination time before you
land — and tells you, at any moment, what you should be doing right now.

No backend, no API keys, no tracking. Everything runs in the browser and
your trip is stored in `localStorage` on your own device.

## The science

Every instruction is anchored to **CBTmin**, your core body temperature
minimum — the low point of your circadian cycle, roughly two hours before
your habitual wake time. The light phase response curve pivots there:

| Light lands…            | Effect on your clock | Use it when flying |
|-------------------------|----------------------|--------------------|
| after CBTmin (morning)  | **advance** (earlier)| east               |
| before CBTmin (evening) | **delay** (later)    | west               |

Melatonin's phase response curve runs roughly 12 hours out of phase with
light's, so evening melatonin advances the clock and reinforces morning
light. The app schedules melatonin only for eastward (advance) trips;
westward delays would need morning melatonin, which mostly just makes you
sleepy when you need to be awake.

Sleep is placed so that waking falls at CBTmin + 2 h. That is what keeps
every waking hour of morning light on the advancing side of the curve.

**Rates.** Delays run about twice as fast as advances, so for large
eastward jumps the app checks whether going *the long way round* —
delaying 15 h instead of advancing 9 h — lands you there sooner, and
takes that route when it does. Aggressive pace is 1.5 h/day advance and
2.5 h/day delay. It stops at 1.5 h for advances on purpose: past that,
the schedule outruns the clock and morning light starts landing *before*
CBTmin, where it delays instead of advancing.

**The livability brake.** Arithmetic alone will cheerfully ask you to
wake at 01:00 the day before an 8-hour eastward flight. Nobody does that.
So the plan takes an *earliest wake at home* (default 04:30), advances
only as far as that allows, starts only as many days early as it needs to
get there, and buys the rest back later.

**The flight does the heavy lifting.** A long-haul leg is a dark, quiet
block you will spend sitting still anyway, so the plan sleeps it end to
end — from shortly after take-off to two hours before landing — and takes
whatever shift that yields. On a Phoenix–London overnight that single
block is worth about 4 hours, more than any three days on the ground.

## Calibration

The pacing, the livability brake and the sleep-the-flight rule were
calibrated against a real Timeshifter plan for PHX→LHR (AA194, departing
16:10, arriving 10:30 the next morning; 8 hours to advance). Running this
engine on the same inputs:

| Night | Timeshifter | This app | Difference |
|---|---|---|---|
| 1 | 21:30 → 05:30 (−1.50 h) | 21:45 → 05:45 (−1.25 h) | 15 min |
| 2 | 20:15 → 04:45 (−2.25 h) | 20:30 → 04:30 (−2.50 h) | 15 min |
| 3 (in flight) | 16:00 → 08:30 (−6.50 h) | 16:30 → 08:30 (−6.50 h) | **exact** |
| 4 | 22:45 → 06:45 (−8.25 h) | 23:00 → 07:00 (−8.00 h) | 15 min |
| 5 | 22:45 → 07:00 (−8.00 h) | 23:00 → 07:00 (−8.00 h) | exact |

Both stop the pre-flight advance around a 04:45 wake, both sleep the
whole flight and wake two hours out, and both finish the last couple of
hours over the two nights after landing.

The return leg (LHR→PHX, departing 16:10 and landing 19:05 the same day;
8 hours to delay) was used as a second, independent check — and westbound
turned out not to be a mirror of eastbound at all:

| Night | Timeshifter | This app | Difference |
|---|---|---|---|
| 1 | 23:15 → 07:45 (+0.75 h) | 00:15 → 08:15 (+1.25 h) | 30 min |
| 2 | 00:15 → 08:45 (+1.75 h) | 01:30 → 09:30 (+2.50 h) | 45 min |
| 3 *(travel day)* | 22:30 → 06:30 (+7.50 h) | 23:00 → 07:00 (+8.00 h) | 30 min |
| 4 | 23:00 → 07:00 (+8.00 h) | 23:00 → 07:00 (+8.00 h) | exact |

Both plans finish on the same calendar day in both directions. Three
westbound-specific rules came out of this comparison:

- **Never sleep through a flight that lands in the evening.** Sleeping a
  daytime westbound leg gets you to the hotel rested at 19:05 and awake
  at 03:00. The app now only sleeps a flight when it delivers you into
  the destination's morning; otherwise it prescribes a single nap placed
  over the body's night and well clear of landing, then "stay awake".
- **The landing night does the work.** You have been awake through a day
  stretched by the whole time difference, so sleep pressure carries you
  to local bedtime and that one night closes most of a westward shift.
- **Evening light stops 90 minutes before bed.** Light right up against
  bedtime delays the clock but also delays falling asleep. The wind-down
  window that follows is sleep hygiene, not phase work, and is labelled
  as such.

Timeshifter's own algorithm is proprietary; this is an independent
implementation of the same published science that lands in the same
place, checked in both directions.

Built on the published work of Charmane Eastman and Helen Burgess
(Rush University) on pre-flight phase advancing, and the standard
light/melatonin phase response curves.

> Not medical advice. Melatonin dose and timing interact with some
> medications and conditions — check with a physician before standardising
> on a protocol.

## Deploy to GitHub Pages

1. Create a repository (private is fine — Pages works on private repos
   for paid plans; use a public repo otherwise).
2. Commit these files at the repository root:

   ```
   index.html
   manifest.webmanifest
   sw.js
   icon.svg
   icon-180.png
   icon-192.png
   icon-512.png
   ```

3. **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, branch `main`, folder `/ (root)`. Save.
4. Wait a minute, then open `https://<you>.github.io/<repo>/`.

## Install it on your iPhone

Open the Pages URL in **Safari** (not Chrome — only Safari can install a
PWA on iOS), tap **Share → Add to Home Screen**. It then launches
full-screen with no browser chrome, and the service worker keeps it
working with no signal, including in airplane mode.

## Notifications

A web app on iOS cannot schedule local alerts that fire offline. The way
around it: build your plan, then **Plan → Download .ics** and open the
file. Apple Calendar imports every light, dark, sleep, melatonin and
flight event with a 5-minute alert. Those alerts are native and fire with
no network — which is the point, since you will be at 38,000 ft for a
good part of the schedule.

Put them in their own calendar so you can hide or delete the lot after
the trip: in Calendar, **Calendars → Add Calendar**, then choose it when
importing.

## How it is meant to be used

The page is a **generator**, not a travel companion. You use it once,
before the trip:

1. **Trip** — enter your flights and your usual sleep hours.
2. **Plan** — check the schedule it produced. A strategy note at the top
   explains why the plan goes the direction it does.
3. **Export** — send it to your calendar, and save the picture.

Then close the tab. During the trip you live off the **calendar alerts**,
which fire natively and offline, including mid-flight with the phone in
airplane mode. That is the whole point of the export: a web page cannot
wake you at 04:00, and a web page you have to remember to open is no use
at 04:00 either.

The **picture** is the second half of that. One PNG of the entire trip —
days down the page, 24 hours across, drawn in whatever clock you are
living in that day, with the cumulative shift marked on each row. On a
phone, press and hold it and Save to Photos. It answers "what does this
week look like" in a glance, which the calendar is bad at.

The Plan tab also carries a small live card showing what you should be
doing right now, for the times you do happen to have the page open. It is
a convenience, not the mechanism.

## Sharing it

The app is a single static page with no backend and no analytics. Each
visitor's trip lives in `localStorage` on their own device — nothing is
sent anywhere, and no two users can see each other's data. That makes it
safe to hand the URL to colleagues.

A first-time visitor lands on the Trip tab with an empty form, their own
timezone already detected, and an "Load an example" button if they want
to see the shape of it first. After building a plan they are prompted
once to export it to their calendar. From then on the app opens on Now.

To make it public: use a **public** repository, and the Pages URL works
for anyone with the link, no account needed. Worth adding to the repo
description that it is a personal tool, not a clinical one — the
in-app disclaimer covers the same ground.

Released under the MIT license (see `LICENSE`), so anyone can fork it.

## Editing

`app-body.html` is the source. `index.html` is generated from it:

```sh
python3 build.py
```

The scheduling engine is section 3 of the script (`buildPlan`); the
airport → IANA timezone table is section 1. Unknown airport codes fall
back to a full timezone picker, so the table only needs to cover the
airports you actually use. All timezone and DST handling comes from the
browser's own `Intl` database — there is nothing to keep up to date.
