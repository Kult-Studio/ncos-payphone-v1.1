/* No dependencies, network requests, or storage: also runs directly from disk. */
'use strict';
const $ = id => document.getElementById(id);
const number = n => n.toLocaleString();
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sessions = [], filtered = [], page = 0, descending = true;
const pageSize = 50;

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || !field) quoted = !quoted;
      else throw new Error('Unexpected quote');
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      row.push(field); if (row.some(v => v.trim())) rows.push(row);
      row = []; field = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed quoted field');
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

function timestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return NaN;
  const [, y, m, d, h, min, s] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, h, min, s));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d && date.getUTCHours() === h && date.getUTCMinutes() === min && date.getUTCSeconds() === s ? +date : NaN;
}

function load(files, source) {
  const next = []; let skipped = 0, invalidFiles = 0, empty = 0;
  for (const file of files) {
    let rows;
    try { rows = parseCSV(file.text); } catch { invalidFiles++; continue; }
    const header = rows.shift();
    if (!header || header[0].trim() !== 'StartTime' || header[1]?.trim() !== 'EndTime' || header[2]?.trim() !== 'Videos Started') { invalidFiles++; continue; }
    if (!rows.length) empty++;
    for (const row of rows) {
      const start = row[0].trim(), end = (row[1] || '').trim();
      const a = timestamp(start), b = timestamp(end);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) { skipped++; continue; }
      const videos = row.slice(2).map(v => v.trim()).filter(Boolean).map(name => {
        const split = name.lastIndexOf('-');
        return {name, topic: split > 0 ? name.slice(0, split) : name, language: split > 0 ? name.slice(split + 1) : 'Unknown'};
      });
      next.push({start, end, duration: (b - a) / 1000, videos, source: file.name});
    }
  }
  sessions = next;
  for (const [id, key, label] of [['video','topic','All videos'], ['language','language','All languages']]) {
    const values = [...new Set(sessions.flatMap(s => s.videos.map(v => v[key])))].sort();
    $(id).innerHTML = `<option value="">${label}</option>` + values.map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join('');
  }
  $('status').textContent = `${source} · ${files.length} files · ${number(next.length)} sessions · ${empty} header-only files. ${skipped} invalid rows and ${invalidFiles} unsupported files skipped. Files are combined without deduplication.`;
  reset();
}

function reset() {
  for (const id of ['from','to','video','language','type','search']) $(id).value = '';
  $('minimum').value = 0;
  applyFilters();
}
function applyFilters() {
  const from = $('from').value, to = $('to').value, video = $('video').value, language = $('language').value;
  const search = $('search').value.trim().toLowerCase(), type = $('type').value;
  const minimum = Math.max(0, Number($('minimum').value) || 0);
  filtered = sessions.filter(s => (!from || s.start.slice(0,10) >= from) && (!to || s.start.slice(0,10) <= to)
    && s.duration >= minimum && (!type || (type === 'played' ? s.videos.length > 0 : !s.videos.length))
    && ((!video && !language) || s.videos.some(v => (!video || v.topic === video) && (!language || v.language === language)))
    && (!search || [s.start, s.end, s.source, ...s.videos.map(v => v.name)].join(' ').toLowerCase().includes(search)));
  page = 0;
  render();
}
function duration(seconds) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m`;
}
function count(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()];
}
function bars(id, entries) {
  const max = Math.max(1, ...entries.map(e => e[1]));
  $(id).innerHTML = entries.length ? entries.map(([label, value]) => `<div class="bar-row"><span class="bar-label">${escapeHTML(label)}</span><div class="track"><div class="fill" style="width:${100 * value / max}%"></div></div><span class="bar-value">${number(value)}</span></div>`).join('') : '<p class="empty">No matching data</p>';
}
function render() {
  const videos = filtered.flatMap(s => s.videos), total = filtered.reduce((n,s) => n + s.duration, 0);
  $('sessions').textContent = number(filtered.length);
  $('session-note').textContent = `of ${number(sessions.length)} loaded sessions`;
  $('starts').textContent = number(videos.length);
  $('average').textContent = filtered.length ? duration(total / filtered.length) : '—';
  $('total').textContent = duration(total);
  bars('daily', count(filtered.map(s => s.start.slice(0,10))).sort((a,b) => a[0].localeCompare(b[0])));
  bars('topics', count(videos.map(v => v.topic)).sort((a,b) => b[1] - a[1]));
  bars('languages', count(videos.map(v => v.language)).sort((a,b) => b[1] - a[1]));
  const hours = Array(24).fill(0);
  filtered.forEach(s => hours[Number(s.start.slice(11,13))]++);
  const max = Math.max(1, ...hours);
  $('hourly').innerHTML = hours.map((n,h) => `<div class="hour" style="height:${Math.max(1, n / max * 100)}%" role="img" aria-label="${h}:00: ${n} sessions" title="${h}:00 — ${n} sessions"></div>`).join('');
  renderTable();
}
function renderTable() {
  filtered.sort((a,b) => descending ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  $('rows').innerHTML = filtered.slice(page * pageSize, (page + 1) * pageSize).map(s => `<tr><td>${escapeHTML(s.start)}</td><td>${escapeHTML(s.end)}</td><td>${duration(s.duration)}</td><td>${s.videos.length ? s.videos.map(v => `<span class="tag">${escapeHTML(v.name)}</span>`).join('') : '<span class="muted">No video starts</span>'}</td><td>${escapeHTML(s.source)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No sessions match these filters.</td></tr>';
  $('results').textContent = `${number(filtered.length)} matching sessions`;
  $('page').textContent = `Page ${page + 1} of ${pages}`;
  $('previous').disabled = page === 0;
  $('next').disabled = page + 1 >= pages;
  $('export').disabled = !filtered.length;
  $('sort').textContent = `Start time ${descending ? '↓' : '↑'}`;
}
function exportCSV() {
  // Guard spreadsheet formula injection, including imported filenames.
  const cell = value => '"' + String(value).replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"';
  const rows = [['StartTime','EndTime','DurationSeconds','Source','Videos Started'], ...filtered.map(s => [s.start,s.end,s.duration,s.source,...s.videos.map(v => v.name)])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'payphone-filtered-sessions.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const id of ['from','to','video','language','type','minimum','search']) $(id).addEventListener('input', applyFilters);
$('reset').addEventListener('click', reset);
$('restore').addEventListener('click', () => load(window.BUNDLED_LOGS || [], 'Bundled logs'));
$('upload').addEventListener('change', async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  try { load(await Promise.all(files.map(async f => ({name:f.name,text:await f.text()}))), 'Local import'); }
  catch { $('status').textContent = 'Could not read the selected files. Please try again.'; }
  event.target.value = '';
});
$('sort').addEventListener('click', () => { descending = !descending; renderTable(); });
$('previous').addEventListener('click', () => { page--; renderTable(); });
$('next').addEventListener('click', () => { page++; renderTable(); });
$('export').addEventListener('click', exportCSV);
load(window.BUNDLED_LOGS || [], 'Bundled logs');
