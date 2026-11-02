const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function dashboard() {
  const elements = new Map();
  const context = vm.createContext({console, setTimeout, Blob, URL, window: {}, document: {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {value:'', innerHTML:'', textContent:'', addEventListener(){}});
      return elements.get(id);
    }
  }});
  vm.runInContext(fs.readFileSync('docs/data.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('docs/app.js', 'utf8'), context);
  return {run: code => vm.runInContext(code, context), elements};
}
test('bundled logs load and produce consistent totals', () => {
  const {run} = dashboard();
  assert.ok(run('sessions.length') > 0);
  assert.equal(run('sessions.length'), run('filtered.length'));
  assert.equal(run('sessions.every(s => s.duration >= 0)'), true);
  assert.equal(run('Number($("starts").textContent.replaceAll(",", ""))'), run('sessions.reduce((n,s) => n+s.videos.length,0)'));
});
test('CSV quoting, BOM, and timestamp validation', () => {
  const {run} = dashboard();
  assert.equal(run('parseCSV(\'\uFEFFa,b\\r\\n"x,y","a""b"\\r\\n\')[1][1]'), 'a"b');
  assert.equal(run('Number.isNaN(timestamp("2026-02-30 12:00:00"))'), true);
  assert.equal(run('Number.isNaN(timestamp("2026-01-01 24:00:00"))'), true);
  assert.equal(run('timestamp("2026-10-31 09:00:00") - timestamp("2026-10-31 08:59:00")'), 60000);
});
test('combined topic/language matches same start; empty and invalid rows', () => {
  const {run} = dashboard();
  run(`load(${JSON.stringify([{name:'test.csv',text:'StartTime,EndTime,Videos Started\n2026-10-31 09:00:00,2026-10-31 09:01:00,ACP-English,LPA-Chinese\n2026-10-31 10:00:00,2026-10-31 10:00:00\ninvalid,invalid'}])}, 'Test')`);
  assert.equal(run('sessions.length'), 2);
  run('$("video").value="ACP"; $("language").value="Chinese"; applyFilters()');
  assert.equal(run('filtered.length'), 0);
  run('reset(); $("type").value="empty"; applyFilters()');
  assert.equal(run('filtered.length'), 1);
  assert.equal(run('filtered[0].duration'), 0);
  run('reset(); $("from").value="2026-11-01"; applyFilters()');
  assert.equal(run('filtered.length'), 0);
});
test('escaping protects imported text', () => {
  const {run} = dashboard();
  assert.equal(run('escapeHTML("<script> & ")'), '&lt;script&gt; &amp; ');
});
