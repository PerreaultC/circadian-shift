const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./harness');

const app = loadApp(['parseTime', 'showTime', 'parseWhen', 'showWhen']);

test('times: accepts what people actually type', () => {
  const cases = {
    '10:00 pm': '22:00', '10 pm': '22:00', '10pm': '22:00',
    '22:00': '22:00', '2200': '22:00',
    '6:00 am': '06:00', '6am': '06:00', '6': '06:00', '06:30': '06:30',
    '12:00 am': '00:00', '12 pm': '12:00'
  };
  for (const [input, want] of Object.entries(cases))
    assert.equal(app.parseTime(input), want, JSON.stringify(input));
});

test('times: rejects nonsense rather than guessing', () => {
  for (const bad of ['25:00', 'banana', '', null, '13 pm', '0:99'])
    assert.equal(app.parseTime(bad), null, JSON.stringify(bad) + ' was accepted');
});

test('times: round-trip back to a readable form', () => {
  assert.equal(app.showTime('22:00'), '10:00 pm');
  assert.equal(app.showTime('00:00'), '12:00 am');
  assert.equal(app.showTime('12:00'), '12:00 pm');
  assert.equal(app.showTime('06:30'), '6:30 am');
});

test('dates: separators, 2- and 4-digit years, month- or year-first', () => {
  for (const input of ['10/07/2026 4:10 pm', '10/7/2026 4:10pm', '10-07-26 16:10',
                       '10.7.2026 4:10 PM', '10/07/2026, 4:10 pm', '2026/10/07 4:10 pm'])
    assert.equal(app.parseWhen(input), '2026-10-07T16:10', JSON.stringify(input));
});

test('dates: a missing time is refused, not defaulted', () => {
  for (const bad of ['10/07/2026', '13/07/2026 4:10 pm', 'oct 7 2026 4pm', ''])
    assert.equal(app.parseWhen(bad), null, JSON.stringify(bad) + ' was accepted');
});

test('dates: round-trip', () => {
  assert.equal(app.showWhen('2026-10-07T16:10'), '10/07/2026  4:10 pm');
});
