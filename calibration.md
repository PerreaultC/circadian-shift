# Calibration against a commercial jet-lag app

**Stale for the pre-flight nights.** The engine's prep-night pacing has
changed twice since this file was written — briefly to a ramp, then to a
flat rate at 2/3 of the safety cap, with `prep` dropped from 4 nights to 3
(see `CLAUDE.md`, "Rules that are not obvious") — so the pre-flight numbers
below reflect none of the current designs. The flight night and everything
from landing onward weren't touched by any of that and should still hold.

The engine's pacing, its livability brake and its sleep-the-flight rule were
derived from two real plans from a commercial jet-lag app, read off
screenshots. This file holds the **raw readings**, so the derivation can be
checked or redone — the summary tables in `README.md` are conclusions drawn
from what is below.

Trip: **PHX ↔ LHR, October 2026, AA194 out.** The commercial app's profile
appears to have been set to a 23:00–07:00 sleeper (its plan starts at
"Phoenix 7am" and finishes at a 07:00 wake), *not* the 22:00–06:00 the app
now defaults to. Comparisons must use 23:00–07:00 or everything shifts by
an hour.

## How to read one of its screenshots

Decoded from the two plans; useful if more are ever captured.

| Glyph | Meaning |
|---|---|
| solid yellow bar, sun icon | bright light, strongest tier |
| solid orange bar, sun icon | light, secondary tier |
| **hollow** orange capsule, crossed-out sun | **avoid** light |
| small circle, crossed-out sun | avoid-light onset marker |
| solid brown bar, coffee cup | caffeine allowed |
| hollow capsule, crossed-out cup | no caffeine |
| dark navy bar, sleeping face | main sleep |
| light blue bar, face | nap |
| thin vertical line, arrows | the flight |

Solid = do this. Hollow = avoid this. The timeline runs in origin time and
switches to destination time at arrival, marked by a divider band.

## Eastbound: PHX 16:10 -> LHR 10:30 next day (advance 8 h)

Plan opens Mon 5 Oct. All times Phoenix until the flight, London after.

```
Mon  5  light 08:00-11:30 (bright) then 11:30-17:00   caffeine 08:00-11:30
        no caffeine 11:30-20:30   avoid-light from ~20:30
        SLEEP 21:30 -> 05:30
Tue  6  light 06:00-09:45 then 09:45-15:00            caffeine 06:00-09:45
        no caffeine 10:00-19:00   avoid-light from ~19:00
        SLEEP 20:15 -> 04:45
Wed  7  light 05:00-09:00 then 09:00-15:00            caffeine 05:00-08:30
        (boards 16:10)
        SLEEP 16:00 -> 08:30 London      <- sleeps the whole flight,
                                            wakes 2 h before landing
Thu  8  (lands 10:30) light 08:30-13:30 then 13:30-21:00   caffeine 08:30-14:00
        avoid-light from ~21:30
        SLEEP 22:45 -> 06:45
Fri  9  light 07:15-09:30 then 09:30-16:30            caffeine 07:30-13:00
        avoid-light from ~21:15
        SLEEP 22:45 -> 07:00
Sat 10  "Done!"
```

CBTmin taken as wake − 2 h; Phoenix UTC−7, London UTC+1 (BST until 25 Oct).

| night ends | wake | CBTmin (UTC) | advance so far | that night |
|---|---|---|---|---|
| baseline | 07:00 Phx | 12.00 | 0.00 | |
| Mon 5 | 05:30 Phx | 10.50 | 1.50 | +1.50 |
| Tue 6 | 04:45 Phx | 9.75 | 2.25 | +0.75 |
| Wed 7 *(in flight)* | 08:30 Lon | 5.50 | 6.50 | **+4.25** |
| Thu 8 | 06:45 Lon | 3.75 | 8.25 | +1.75 |
| Fri 9 | 07:00 Lon | 4.00 | 8.00 | −0.25 |

**What this established.** Only 2.25 h of an 8 h advance happens at home, over
two nights, stopping at a 04:45 wake — a livability limit, not an arithmetic
one. The flight carries 4.25 h in a single block. The remainder is finished
over two nights after landing.

## Westbound: LHR 16:10 -> PHX 19:05 same day (delay 8 h)

Plan opens Tue 13 Oct. London time until arrival, Phoenix after.

```
Tue 13  AVOID light 08:00-11:00    caffeine 08:00-13:45   no caffeine 14:00-22:30
        light 18:00-22:00          avoid-light from ~22:15
        SLEEP 23:15 -> 07:45
Wed 14  AVOID light 08:00-11:30    caffeine 08:00-14:45   no caffeine 15:00-23:15
        light 19:00-22:45          avoid-light from ~23:15
        SLEEP 00:15 -> 08:45
Thu 15  AVOID light 09:00-13:00    no caffeine 09:00-16:00
        (departs 16:10)
        SLEEP 16:00-18:15          <- short, at departure
        caffeine 19:00-20:45
        NAP 20:00-00:30            <- over the body's night, mid-flight
        -- switches to Phoenix time --
        light 21:00-21:45 Phoenix  <- brief, bright, on arrival evening
        SLEEP 22:30 -> 06:30 Phoenix
Fri 16  caffeine 07:00-13:00       light 18:00-21:30   avoid-light from ~21:45
        SLEEP 22:45 -> 07:00
Sat 17  "Done!"
```

| night ends | wake | CBTmin (UTC) | delay so far | that night |
|---|---|---|---|---|
| baseline | 07:00 Lon | 4.00 | 0.00 | |
| Tue 13 | 07:45 Lon | 4.75 | 0.75 | +0.75 |
| Wed 14 | 08:45 Lon | 5.75 | 1.75 | +1.00 |
| Thu 15 *(travel)* | 06:30 Phx | 11.50 | 7.50 | **+5.75** |
| Fri 16 | 07:00 Phx | 12.00 | 8.00 | +0.50 |

**What this established**, and it is the least obvious finding in the project:
westbound is **not** a mirror of eastbound.

1. The flight is **not** slept through. It lands at 19:05; sleeping it would
   leave you rested at dinner time and wide awake at 03:00. The commercial
   app gives a short sleep at departure plus one nap over the body's night
   instead.
2. The **landing night** does almost all the work (+5.75 h). A travel day
   stretched by the whole time difference generates enough sleep pressure to
   carry you to local bedtime.
3. Evening light **stops ~1.25 h before bed**, not at bed. Light that late
   delays the clock but also delays sleep onset.
4. Morning light is actively **avoided** at home — it would advance the clock,
   the wrong direction.

## Agreement after calibration

Running this engine on that app's own inputs (23:00–07:00): the flight
night matches **exactly** in both directions, every other night is within
15–45 min, and both plans finish on the same calendar day. See `README.md`.

## Redoing this

Capture that app's timeline as overlapping screenshots top to bottom,
transcribe to the block format above, then convert wake times to CBTmin in UTC
(`wake − 2 h − zone offset`) and difference against baseline. Divergence in the
*nightly steps* points at the rate or the livability cap; divergence on the
*flight night* points at the sleep-the-flight rule.
