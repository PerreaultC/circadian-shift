/* A hand-rolled DOM stub, enough to boot app-body.html in node.
   It is deliberately STRICT: querySelector('#missing') returns null exactly
   as a browser would, because a permissive stub once hid a crash that made
   the Build button silently dead. It cannot lay out, render, or fire real
   events -- see CLAUDE.md "Known gaps". */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..', 'app-body.html');

function buildDom() {
  const reg = new Map();
  const known = new Set();
  const re = /\bid="([^"]+)"/g;
  const html = fs.readFileSync(APP, 'utf8');
  let m; while ((m = re.exec(html))) known.add(m[1]);

  class El {
    constructor(key, tag) {
      this.key = key; this.tag = tag || 'div';
      this.id = key && key[0] === '#' ? key.slice(1) : '';
      this.children = []; this.dataset = {};
      this._html = ''; this._text = '';
      this.hidden = false; this.value = ''; this.checked = false;
      this.style = { setProperty: (k, v) => { this.style[k] = v; } };
      this.classList = {
        _s: new Set(),
        add: x => this.classList._s.add(x),
        remove: x => this.classList._s.delete(x),
        toggle: (x, on) => { on ? this.classList._s.add(x) : this.classList._s.delete(x); },
        contains: x => this.classList._s.has(x)
      };
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); this.children = []; }
    get textContent() { return this._text; }
    set textContent(v) { this._text = String(v); }
    set className(v) { this._cls = v; } get className() { return this._cls || ''; }
    setAttribute(k, v) { this['attr_' + k] = v; }
    getAttribute(k) { return this['attr_' + k]; }
    appendChild(c) { this.children.push(c); return c; }
    remove() {}
    addEventListener(t, f) { (this._ls = this._ls || {})[t] = f; }
    click() { if (this._ls && this._ls.click) this._ls.click({ preventDefault() {} }); }
    querySelector(sel) { return get(this.key + ' ' + sel, 'div'); }
    querySelectorAll() { return this.children.slice(); }
    select() {} scrollIntoView() {}
  }

  function get(key, tag) {
    if (typeof key === 'string' && key[0] === '#' && !key.includes(' ')) {
      const id = key.slice(1);
      // leg fields are created at runtime by renderLegs()
      if (!known.has(id) && !id.startsWith('pane-') && !/^(lf|lt|ld|la|zf|zt)\d+$/.test(id))
        return null;
    }
    if (!reg.has(key)) reg.set(key, new El(key, tag));
    return reg.get(key);
  }

  const NAV = ['trip', 'plan', 'export'].map(p => { const e = get('nav' + p, 'button'); e.dataset.p = p; return e; });
  const PANES = ['trip', 'plan', 'export'].map(p => get('#pane-' + p, 'section'));

  // a canvas that records nothing: the ASCII chart is asserted as text elsewhere
  const ctx = new Proxy({}, { get: (_, k) =>
    k === 'measureText' ? (() => ({ width: 10 })) : (() => {}) });
  global.document = {
    createElement: t => t === 'canvas'
      ? { width: 0, height: 0, getContext: () => ctx, toBlob: cb => cb({ size: 1 }) }
      : new El('new' + Math.random(), t),
    querySelector: sel => get(sel, 'div'),
    querySelectorAll: sel => sel === 'nav button' ? NAV : sel === '.pane' ? PANES : [],
    body: { appendChild() {} }
  };
  global.window = { addEventListener() {}, claude: undefined };
  global.navigator = { clipboard: { writeText: async () => {} } };
  global.setInterval = () => 0;
  global.setTimeout = () => 0;
  global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  global.Blob = function () {};
  return get;
}

/* Boot the app and hand back the named internals. */
function loadApp(names, store) {
  const get = buildDom();
  const d = store || {};
  global.localStorage = {
    getItem: k => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = v; },
    removeItem: k => { delete d[k]; }
  };
  const html = fs.readFileSync(APP, 'utf8');
  const a = html.lastIndexOf('<script>'), b = html.lastIndexOf('</' + 'script>');
  const src = html.slice(a + 8, b).replace(/^"use strict";/, '');
  const tail = names.map(n => 'globalThis.__x_' + n + '=' + n + ';').join('');
  (0, eval)(src + '\n;' + tail);
  const out = { $: get };
  for (const n of names) out[n] = globalThis['__x_' + n];
  return out;
}

const FIXED_TRIP = {
  homeTz: 'America/Phoenix', bed: '22:00', wake: '06:00', floor: '04:00'
};
const PHX_LHR = [{ from: 'PHX', to: 'LHR', fromTz: 'America/Phoenix', toTz: 'Europe/London',
                   dep: '2026-10-07T16:10', arr: '2026-10-08T10:30' }];
const LHR_PHX = [{ from: 'LHR', to: 'PHX', fromTz: 'Europe/London', toTz: 'America/Phoenix',
                   dep: '2026-10-15T16:10', arr: '2026-10-15T19:05' }];

module.exports = { loadApp, FIXED_TRIP, PHX_LHR, LHR_PHX, APP };
