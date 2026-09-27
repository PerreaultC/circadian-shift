const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, FIXED_TRIP } = require('./harness');

const H = 3600000;
const app = loadApp(['buildPlan', 'FIXED']);
const mk = (home, legs, over) => app.buildPlan(
  Object.assign({}, FIXED_TRIP, { homeTz: home }, app.FIXED, over || {}, { legs }));
const leg = (f, t, ftz, ttz, dep, arr) => ({ from: f, to: t, fromTz: ftz, toTz: ttz, dep, arr });

const TRIPS = {
  'PHX->LHR eastbound':      ['America/Phoenix', [leg('PHX','LHR','America/Phoenix','Europe/London','2026-10-07T16:10','2026-10-08T10:30')]],
  'LHR->PHX westbound':      ['Europe/London',   [leg('LHR','PHX','Europe/London','America/Phoenix','2026-10-15T16:10','2026-10-15T19:05')]],
  'PHX->NRT wraps the dial': ['America/Phoenix', [leg('PHX','NRT','America/Phoenix','Asia/Tokyo','2026-10-05T11:00','2026-10-06T15:30')]],
  'PHX->SYD dateline':       ['America/Phoenix', [leg('PHX','LAX','America/Phoenix','America/Los_Angeles','2026-11-02T08:00','2026-11-02T08:55'),
                                                  leg('LAX','SYD','America/Los_Angeles','Australia/Sydney','2026-11-02T22:30','2026-11-04T07:20')]],
  'PHX->DXB long way round': ['America/Phoenix', [leg('PHX','DXB','America/Phoenix','Asia/Dubai','2026-10-05T20:00','2026-10-06T21:00')]],
  'PHX->JFK short hop':      ['America/Phoenix', [leg('PHX','JFK','America/Phoenix','America/New_York','2026-10-08T07:00','2026-10-08T14:45')]],
  'across a DST boundary':   ['America/Phoenix', [leg('PHX','ORD','America/Phoenix','America/Chicago','2026-10-30T15:10','2026-10-30T20:05'),
                                                  leg('ORD','CDG','America/Chicago','Europe/Paris','2026-10-30T21:45','2026-10-31T13:05')]],
  'dawn departure':          ['America/Phoenix', [leg('PHX','CDG','America/Phoenix','Europe/Paris','2026-10-07T06:00','2026-10-07T23:30')]]
};

for (const [name, [home, legs]] of Object.entries(TRIPS)) {
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
    const cutoff = p.departTs - (app.FIXED.lead || 4) * H;
    const asleep = p.ev.filter(e =>
      e.k === 'sleep' && !e.onPlane && e.start < p.departTs && e.end > cutoff + 60000);
    assert.equal(asleep.length, 0, 'still asleep within 4 h of take-off');
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
