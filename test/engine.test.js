const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, FIXED_TRIP } = require('./harness');

const H = 3600000;
const app = loadApp(['buildPlan', 'FIXED']);
const mk = (home, legs, over) => app.buildPlan(
  Object.assign({}, FIXED_TRIP, { homeTz: home }, app.FIXED, over || {}, { legs }));
const leg = (f, t, ftz, ttz, dep, arr) => ({ from: f, to: t, fromTz: ftz, toTz: ttz, dep, arr });

/* [home, legs, expected direction, expected "the long way round" flag].
   The expectations were read off a one-off run of buildPlan, not guessed --
   see the "picks the direction..." test below, which is the whole point of
   recording them: nothing else here checks that the routing choice itself,
   as opposed to its consequences, is the one the science calls for. */
const TRIPS = {
  'PHX->LHR eastbound':          ['America/Phoenix', [leg('PHX','LHR','America/Phoenix','Europe/London','2026-10-07T16:10','2026-10-08T10:30')], 'advance', false],
  'LHR->PHX westbound':          ['Europe/London',   [leg('LHR','PHX','Europe/London','America/Phoenix','2026-10-15T16:10','2026-10-15T19:05')], 'delay', false],
  'PHX->NRT wraps the dial':     ['America/Phoenix', [leg('PHX','NRT','America/Phoenix','Asia/Tokyo','2026-10-05T11:00','2026-10-06T15:30')], 'delay', false],
  'PHX->SYD dateline':           ['America/Phoenix', [leg('PHX','LAX','America/Phoenix','America/Los_Angeles','2026-11-02T08:00','2026-11-02T08:55'),
                                                       leg('LAX','SYD','America/Los_Angeles','Australia/Sydney','2026-11-02T22:30','2026-11-04T07:20')], 'delay', false],
  'PHX->DXB long way round':     ['America/Phoenix', [leg('PHX','DXB','America/Phoenix','Asia/Dubai','2026-10-05T20:00','2026-10-06T21:00')], 'delay', true],
  'PHX->JFK short hop':          ['America/Phoenix', [leg('PHX','JFK','America/Phoenix','America/New_York','2026-10-08T07:00','2026-10-08T14:45')], 'advance', false],
  'across a DST boundary':       ['America/Phoenix', [leg('PHX','ORD','America/Phoenix','America/Chicago','2026-10-30T15:10','2026-10-30T20:05'),
                                                       leg('ORD','CDG','America/Chicago','Europe/Paris','2026-10-30T21:45','2026-10-31T13:05')], 'advance', false],
  'dawn departure':              ['America/Phoenix', [leg('PHX','CDG','America/Phoenix','Europe/Paris','2026-10-07T06:00','2026-10-07T23:30')], 'advance', false],
  /* Every other westbound fixture above happens to be a long haul landing
     in the evening (nap, not slept through). The sleep-the-flight rule
     cares about arrival time, not direction, so it needs its own westbound
     example that lands in the morning. */
  'LHR->JFK westbound, lands in the morning': ['Europe/London', [leg('LHR','JFK','Europe/London','America/New_York','2026-10-10T10:00','2026-10-10T13:00')], 'delay', false],
  'ORD->PHX westbound short hop':             ['America/Chicago', [leg('ORD','PHX','America/Chicago','America/Phoenix','2026-10-08T09:00','2026-10-08T10:30')], 'delay', false],
  /* A shift too small to be interesting on its own -- included because
     nothing else here checks that the engine still behaves at the bottom
     of the range instead of only in the middle of it. */
  'PHX->DEN tiny shift':                      ['America/Phoenix', [leg('PHX','DEN','America/Phoenix','America/Denver','2026-10-05T08:00','2026-10-05T09:15')], 'advance', false]
};

for (const [name, [home, legs, expectDir, expectLongWay]] of Object.entries(TRIPS)) {
  test(name + ': picks the direction and routing the science calls for', () => {
    const p = mk(home, legs);
    assert.equal(p.dir, expectDir, 'direction');
    assert.equal(p.longWay, expectLongWay, 'long-way-round flag');
  });

  test(name + ': sleep blocks never overlap', () => {
    const sl = mk(home, legs).ev.filter(e => e.k === 'sleep').sort((a, b) => a.start - b.start);
    for (let i = 1; i < sl.length; i++)
      assert.ok(sl[i].start >= sl[i - 1].end, 'overlap at block ' + i);
  });

  test(name + ': the shift only ever moves forward', () => {
    const sl = mk(home, legs).ev.filter(e => e.k === 'sleep').sort((a, b) => a.start - b.start);
    for (let i = 1; i < sl.length; i++)
      assert.ok(sl[i].shift >= sl[i - 1].shift - 1e-6, 'went backwards at block ' + i);
  });

  test(name + ': the plan actually reaches its target', () => {
    const p = mk(home, legs);
    const sl = p.ev.filter(e => e.k === 'sleep');
    assert.ok(sl.length, 'no sleep blocks at all');
    assert.ok(Math.abs(sl[sl.length - 1].shift - p.total) < 0.02,
      'ends at ' + sl[sl.length - 1].shift + ' of ' + p.total);
  });

  test(name + ': light and dark land on the right side of CBTmin', () => {
    const p = mk(home, legs);
    for (const e of p.ev) {
      if (e.k !== 'light' && e.k !== 'dark') continue;
      if (e.hyg || e.h === 'Keep the lights low') continue;  // hygiene, not phase work
      const rel = ((e.start + e.end) / 2 - e.cbt) / H;
      const wantAdvanceZone = (p.dir === 'advance') === (e.k === 'light');
      assert.ok(wantAdvanceZone ? (rel > 0 && rel < 10) : (rel < 0 && rel > -11),
        e.h + ' sits ' + rel.toFixed(1) + ' h from CBTmin');
    }
  });

  test(name + ': no light window collides with a dark one', () => {
    const p = mk(home, legs);
    const light = p.ev.filter(e => e.k === 'light' || e.k === 'light2');
    const dark = p.ev.filter(e => e.k === 'dark');
    for (const a of light) for (const b of dark)
      assert.ok(!(a.start < b.end && a.end > b.start), a.h + ' overlaps ' + b.h);
  });

  test(name + ': never asleep inside the airport window', () => {
    const p = mk(home, legs);
    const lead = app.FIXED.lead || 5;
    const cutoff = p.departTs - lead * H;
    const asleep = p.ev.filter(e =>
      e.k === 'sleep' && !e.onPlane && e.start < p.departTs && e.end > cutoff + 60000);
    assert.equal(asleep.length, 0, 'still asleep within ' + lead + ' h of take-off');
  });

  test(name + ': settles for one consolidation night, then stops', () => {
    const p = mk(home, legs);
    /* "Instructions" meaning phase work, not the wind-down/"Keep the lights
       low" hygiene events that are excluded from the CBTmin check above for
       the same reason. */
    const instructional = p.ev.filter(e =>
      ['light', 'light2', 'dark', 'mel'].includes(e.k) && !e.hyg && e.h !== 'Keep the lights low');
    const settledNights = new Set(
      instructional.filter(e => e.shift >= p.total - 0.01).map(e => e.i));
    assert.ok(settledNights.size <= 1,
      'kept prescribing light/dark/melatonin after settling: nights ' + [...settledNights]);
  });

  test(name + ': nightly steps never exceed the daily rate', () => {
    const p = mk(home, legs);
    const step = p.preDays ? p.maxPre / p.preDays : 0;
    assert.ok(step <= p.rate + 1e-6, step.toFixed(2) + ' h/night vs rate ' + p.rate);
  });
}

test('a flight landing in the evening is never slept through', () => {
  const p = mk('Europe/London', TRIPS['LHR->PHX westbound'][1]);
  assert.equal(p.flightIdx, -1, 'tried to sleep a westbound day flight');
  assert.ok(p.ev.some(e => e.k === 'nap'), 'no nap offered instead');
});

test('a flight landing in the morning is slept end to end', () => {
  const p = mk('America/Phoenix', TRIPS['PHX->LHR eastbound'][1]);
  assert.ok(p.flightIdx >= 0, 'did not use the flight');
  assert.ok(p.flightShift > 3, 'flight yielded only ' + p.flightShift + ' h');
});

test('melatonin is eastbound only', () => {
  const east = mk('America/Phoenix', TRIPS['PHX->LHR eastbound'][1]);
  const west = mk('Europe/London', TRIPS['LHR->PHX westbound'][1]);
  const dose = p => p.ev.filter(e => e.k === 'mel' && e.h.indexOf('Melatonin 1') === 0).length;
  assert.ok(dose(east) > 0, 'no melatonin flying east');
  assert.equal(dose(west), 0, 'melatonin scheduled flying west');
});
