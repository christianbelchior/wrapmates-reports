// Runs inside the report page (the artifact frame). Kept as plain functions so main.js can send them as text.
// capture(): where the person is in the report (section, search, open client card, tab, scroll).
// restore(s): puts them back there after the page was reloaded (Back, hourly refresh, Reload now).
// back(): one step back inside the report (photo -> card -> section -> menu). Returns true if it did something.

module.exports.capture = function capture() {
  if (!document.getElementById('report-data')) return null;
  function txt(e) { return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  var s = { at: Date.now(), view: document.body.dataset.wmView || 'home', section: '', search: '', card: '', tab: '', y: window.scrollY || 0, sy: 0 };
  var bt = document.querySelector('#wm-bar .wm-bt');
  if (s.view !== 'home' && bt) s.section = txt(bt);
  var q = document.getElementById('srch-q');
  if (q && q.value) s.search = q.value;
  var sh = document.querySelector('.sheet');
  if (sh) {
    var l = sh.getAttribute('aria-label') || '';
    if (l.indexOf('Client details: ') === 0) s.card = l.slice(16);
    var on = sh.querySelector('.wx-chip.on');
    if (on) s.tab = on.dataset.k || '';
    var b = sh.querySelector('.sheet-b');
    if (b) s.sy = b.scrollTop || 0;
  }
  return s;
};

module.exports.restore = function restore(s) {
  // Returns 'wait' while the report is still loading, true when done, false if nothing to restore.
  if (!s) return false;
  var tiles = document.querySelectorAll('#wm-menu .wm-tile');
  if (!document.getElementById('report-data') || !tiles.length) return 'wait';
  if (window.__wmRestored) return true;
  window.__wmRestored = true;
  function txt(e) { return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function wait(fn, ms, cb) { var t0 = Date.now(); (function loop() { var r = fn(); if (r) return cb(r); if (Date.now() - t0 > ms) return cb(null); setTimeout(loop, 80); })(); }
  function scrollTo(y) { if (y > 0) setTimeout(function () { window.scrollTo(0, y); }, 250); }
  function openCard() {
    if (!s.card) { scrollTo(s.y); return; }
    var c = Array.prototype.find.call(document.querySelectorAll('article.client[data-client]'), function (e) { return e.dataset.client === s.card && !e.classList.contains('in-sheet'); });
    if (!c) { scrollTo(s.y); return; }
    scrollTo(s.y);
    setTimeout(function () {
      c.click();
      wait(function () { return document.querySelector('.sheet'); }, 3000, function (sh) {
        if (!sh) return;
        if (s.tab) {
          var n = 0;
          (function pick() {
            var ch = sh.querySelector('.wx-chip[data-k="' + s.tab + '"]');
            if (ch && !ch.classList.contains('on')) ch.click();
            if (++n < 6) setTimeout(pick, 400); // the card builds its tabs in steps; keep the chosen one selected
          })();
        }
        if (s.sy) setTimeout(function () { var b = sh.querySelector('.sheet-b'); if (b) b.scrollTop = s.sy; }, 300);
      });
    }, 300);
  }
  if (s.view !== 'home' && s.section) {
    var tile = Array.prototype.find.call(tiles, function (t) { return txt(t.querySelector('.wm-l')) === s.section; });
    if (tile) tile.click();
  }
  if (s.search) {
    var q = document.getElementById('srch-q');
    if (q) { q.value = s.search; q.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  setTimeout(openCard, 200);
  return true;
};

module.exports.back = function back() {
  if (!document.getElementById('report-data')) return false;
  function vis(e) { return !!(e && e.getClientRects().length); }
  var help = document.querySelector('.wmx-help');
  if (help) { help.remove(); return true; }
  var lb = document.getElementById('lb');
  if (lb && !lb.hidden) { var lc = document.getElementById('lb-close'); if (lc) { lc.click(); return true; } }
  var x = document.querySelector('.sheet .sheet-x');
  if (x) { x.click(); return true; }
  var bk = document.querySelector('#wm-bar .wm-back');
  if (bk && vis(bk)) { bk.click(); window.scrollTo(0, 0); return true; }
  return false;
};
