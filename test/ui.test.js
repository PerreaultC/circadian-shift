const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, PHX_LHR } = require('./harness');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'app-body.html'), 'utf8');

test('every id the script reaches for exists in the markup', () => {
  const cut = SRC.lastIndexOf('<script>');
  const markup = SRC.slice(0, cut), js = SRC.slice(cut);
  const ids = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const missing = [...new Set([...js.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map(m => m[1]))]
    .filter(r => !ids.has(r));
  assert.deepEqual(missing, [], 'dangling: ' + missing.join(', '));
});

test('the file is pure ASCII, so nothing can be mojibaked', () => {
  const bytes = fs.readFileSync(path.join(__dirname, '..', 'app-body.html'));
  const bad = [...bytes].filter(b => b > 127).length;
  assert.equal(bad, 0, bad + ' non-ASCII bytes');
});

test('no native date or time pickers survive', () => {
  assert.equal((SRC.match(/type="(datetime-local|time)"/g) || []).length, 0);
});

function fillForm($, over) {
  const v = Object.assign({
    bed: '10 pm', wake: '6am', floor: '4:00 am', tz: 'America/Phoenix',
    from: 'PHX', to: 'LHR', dep: '10/07/2026 4:10 pm', arr: '10-08-2026 10:30 am'
  }, over || {});
  $('#fBed').value = v.bed; $('#fWake').value = v.wake; $('#fFloor').value = v.floor;
  $('#fHomeTz').value = v.tz;
  $('#lf0').value = v.from; $('#lt0').value = v.to;
  $('#ld0').value = v.dep; $('#la0').value = v.arr;
}
const msg = $ => ($('#buildMsg').hidden ? null : $('#buildMsg').textContent);

test('typing into the boxes and pressing Build produces a plan', () => {
  // No input events fire here on purpose: Build must read the form itself.
  const app = loadApp(['plan']);
  const $ = app.$;
  fillForm($);
  $('#build').click();
  assert.equal(msg($), null, 'refused: ' + msg($));
  assert.ok($('#pane-export').classList.contains('on'), 'did not land on Export');
  assert.ok(($('#icsText').value || '').length > 1000, 'no calendar produced');
});

test('an arrival left on the departure date is refused', () => {
  const app = loadApp(['plan']);
  fillForm(app.$, { arr: '10/07/2026 10:30 am' });
  app.$('#build').click();
  assert.match(msg(app.$) || '', /Arrival is before departure/);
});

test('unreadable input is named back, not silently dropped', () => {
  const app = loadApp(['plan']);
  fillForm(app.$, { dep: 'oct 7 2026 4pm' });
  app.$('#build').click();
  assert.match(msg(app.$) || '', /could not read the departure/);
});

test('an unknown airport code never inherits the local timezone', () => {
  const app = loadApp(['cfg', 'resolveLegTz', 'tripIssues']);
  const row = app.$('row');
  const leg = app.cfg.legs[0];
  Object.assign(leg, { from: 'PHX', dep: '2026-10-07T16:10', arr: '2026-10-08T10:30' });
  leg.to = 'LHT';                       // typo, not in the airport table
  app.resolveLegTz(0, row);
  assert.equal(leg.toTz, '', 'silently adopted a timezone');
  assert.match(app.tripIssues()[0] || '', /time zone/);
  leg.to = 'LHR';                       // corrected
  app.resolveLegTz(0, row);
  assert.equal(leg.toTz, 'Europe/London');
  assert.equal(app.tripIssues().length, 0);
});

test('Reset clears a stale error', () => {
  const app = loadApp(['plan']);
  app.$('#build').click();
  assert.ok(msg(app.$), 'expected a complaint on the empty form');
  app.$('#reset').click();
  assert.equal(msg(app.$), null, 'error survived Reset');
});

test('a saved trip opens on Plan; a fresh visitor opens on Trip', () => {
  const saved = JSON.stringify({
    homeTz: 'America/Phoenix', bed: '22:00', wake: '06:00', floor: '04:00',
    legs: PHX_LHR
  });
  const fresh = loadApp(['plan'], {});
  assert.ok(fresh.$('#pane-trip').classList.contains('on'), 'fresh visitor not on Trip');
  const back = loadApp(['plan'], { circshift: saved });
  assert.ok(back.$('#pane-plan').classList.contains('on'), 'returning visitor not on Plan');
});
