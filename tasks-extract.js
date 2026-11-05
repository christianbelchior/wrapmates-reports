// Runs inside the report page (the artifact frame). Returns the clients that need action from us,
// in priority order, or null if this frame is not a WrapMates report page.
// Kept as a plain function so main.js can send it to the frame as text.
module.exports = function extract() {
  var el = document.getElementById('report-data');
  if (!el) return null;
  var d;
  try { d = JSON.parse(el.textContent); } catch (e) { return null; }
  var snz = {};
  try { snz = JSON.parse(localStorage.getItem('wm-snooze') || '{}') || {}; } catch (e) {}
  var now = Date.now();
  function isDone(k) { try { return !!(window.WMDONE && window.WMDONE.is(k)); } catch (e) { return false; } }
  function snoozed(k) { var v = snz[k]; var u = v && Date.parse(v.until); return !!(u && u > now); }
  // "since 30/10 07:40" -> sortable number (older first)
  function age(s) {
    var m = /(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(s || '');
    if (!m) return 9e12;
    var y = new Date().getFullYear(), mo = +m[2] - 1, dt = new Date(y, mo, +m[1], +(m[3] || 0), +(m[4] || 0)).getTime();
    if (dt > now + 864e5) dt = new Date(y - 1, mo, +m[1], +(m[3] || 0), +(m[4] || 0)).getTime();
    return dt;
  }
  var cards = {};
  document.querySelectorAll('.client[data-client]').forEach(function (c) { cards[c.dataset.client] = 1; });
  var seen = {}, out = [];
  (d.people || []).forEach(function (p) {
    (p.sections || []).forEach(function (sec) {
      var st = String(sec.title || '').toLowerCase();
      (sec.items || []).forEach(function (it) {
        var k = it.client;
        if (!k || seen[k]) return;
        seen[k] = 1;
        if (isDone(k) || snoozed(k)) return;
        var w = typeof it.waiting === 'string' ? it.waiting : '';
        var oursWait = w && w !== 'waiting_on_client';
        var fl = it.flag && it.flag.level ? it.flag : null;
        if (fl && /^lost$/i.test(String(fl.text || '').trim())) fl = null;
        var lvl = it.wait_level, isNew = st.indexOf('new enquir') === 0;
        var tier = null, why = '';
        if (isNew) { tier = 0; why = 'New enquiry'; }
        else if (lvl === 'bad') { tier = 1; why = 'Waiting too long'; }
        else if (fl && fl.level === 'urgent') { tier = 2; why = fl.text || 'Urgent'; }
        else if (lvl === 'mid') { tier = 3; why = 'Waiting on us'; }
        else if (it.design_waiting === true) { tier = 4; why = 'Design needed'; }
        else if (oursWait) { tier = 5; why = 'Waiting on us'; }
        else if (fl && fl.level === 'late') { tier = 6; why = fl.text || 'Promised'; }
        if (tier === null) return;
        var when = oursWait ? w : '';
        out.push({
          client: k, title: it.title || '', why: why, when: when, tier: tier,
          heat: +it.heat || 0, age: age(when), section: sec.title || '',
          owner: it.owner || '', channel: (it.channel && (it.channel.name || it.channel.type)) || '',
          card: !!cards[k]
        });
      });
    });
  });
  out.sort(function (a, b) { return a.tier - b.tier || b.heat - a.heat || a.age - b.age || a.client.localeCompare(b.client); });
  return { at: d.subtitle ? String(d.subtitle).slice(0, 40) : '', items: out };
};
