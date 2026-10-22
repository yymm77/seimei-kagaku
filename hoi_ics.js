// 方位予定帖：カレンダーとのやり取り（iCalendar ＝ .ics、Google カレンダーの予定）
// 画面に依存しない計算だけを置く。ブラウザでは window.HoiICS、検算用に Node でも読める。
(function (root) {
  'use strict';
  const p2 = n => String(n).padStart(2, '0');
  const isoOf = (y, m, d) => `${y}-${p2(m)}-${p2(d)}`;
  function addDaysISO(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  const weekday = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // ── 時間帯の換算 ──────────────────────────────
  // 端末の時間帯（予定帖の暦日はこの時間帯で数える）
  const localTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'; } catch (e) { return 'Asia/Tokyo'; } };
  // ある瞬間（UTCミリ秒）を、指定の時間帯の壁時計（年月日時分）に直す
  function wallIn(ms, tz) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const o = {}; f.formatToParts(new Date(ms)).forEach(x => { o[x.type] = x.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }
  // 指定の時間帯の壁時計 → その瞬間（UTCミリ秒）
  function instantOf(y, m, d, h, mi, s, tz) {
    const guess = Date.UTC(y, m - 1, d, h, mi, s || 0);
    let t = guess;
    for (let i = 0; i < 3; i++) {
      const w = wallIn(t, tz);
      const diff = Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - guess;
      if (diff === 0) break;
      t -= diff;
    }
    return t;
  }
  function validTZ(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } }
  // Windows 系の時間帯名（Outlook などが書き出す）の主なもの
  const WIN_TZ = { 'Tokyo Standard Time': 'Asia/Tokyo', 'UTC': 'UTC', 'GMT Standard Time': 'Europe/London', 'Pacific Standard Time': 'America/Los_Angeles', 'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago', 'China Standard Time': 'Asia/Shanghai', 'Korea Standard Time': 'Asia/Seoul', 'W. Europe Standard Time': 'Europe/Berlin', 'Romance Standard Time': 'Europe/Paris', 'AUS Eastern Standard Time': 'Australia/Sydney' };
  function normTZ(tz) {
    if (!tz) return null;
    tz = tz.replace(/^"|"$/g, '').replace(/^\/[^/]*\/[^/]*\//, '');   // "/mozilla.org/20070129_1/Asia/Tokyo" の形
    if (validTZ(tz)) return tz;
    return WIN_TZ[tz] || null;
  }

  // ── .ics を読む ───────────────────────────────
  function unescapeText(s) { return s.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N') ? '\n' : c); }
  function parseLines(text) {
    const raw = text.replace(/\r\n|\r/g, '\n').split('\n');
    const lines = [];
    raw.forEach(l => { if (/^[ \t]/.test(l) && lines.length) lines[lines.length - 1] += l.slice(1); else if (l.length) lines.push(l); });
    return lines.map(l => {
      // 名前;引数=値;...:値 （引用符の中の : や ; は区切りにしない）
      let i = 0, q = false;
      for (; i < l.length; i++) { const c = l[i]; if (c === '"') q = !q; else if (c === ':' && !q) break; }
      const head = l.slice(0, i), value = l.slice(i + 1);
      const parts = []; let cur = ''; q = false;
      for (const c of head) { if (c === '"') q = !q; if (c === ';' && !q) { parts.push(cur); cur = ''; } else cur += c; }
      parts.push(cur);
      const params = {};
      parts.slice(1).forEach(x => { const k = x.indexOf('='); if (k > 0) params[x.slice(0, k).toUpperCase()] = x.slice(k + 1).replace(/^"|"$/g, ''); });
      return { name: parts[0].toUpperCase(), params, value };
    });
  }
  // 日付・日時の値 → { date:'YYYY-MM-DD', time:'HH:MM' か ''、allDay }（端末の時間帯に直す）
  function parseDT(prop, toTZ) {
    if (!prop) return null;
    const v = prop.value.trim();
    const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!m) return null;
    const [, Y, M, D, h, mi, s, z] = m;
    if (prop.params.VALUE === 'DATE' || h === undefined) return { date: `${Y}-${M}-${D}`, time: '', allDay: true };
    let ms;
    if (z) ms = Date.UTC(+Y, +M - 1, +D, +h, +mi, +(s || 0));
    else {
      const tz = normTZ(prop.params.TZID);
      if (!tz) return { date: `${Y}-${M}-${D}`, time: `${h}:${mi}`, allDay: false };   // 時間帯の書いていない時刻は、その土地の時刻として扱う
      ms = instantOf(+Y, +M, +D, +h, +mi, +(s || 0), tz);
    }
    const w = wallIn(ms, toTZ);
    return { date: isoOf(w.y, w.m, w.d), time: `${p2(w.h)}:${p2(w.mi)}`, allDay: false, ms };
  }
  function parseRRule(s) {
    if (!s) return null;
    const r = {};
    s.replace(/^RRULE:/i, '').split(';').forEach(kv => { const [k, v] = kv.split('='); if (k && v !== undefined) r[k.toUpperCase()] = v; });
    return r.FREQ ? r : null;
  }
  // .ics のカレンダー名（X-WR-CALNAME）
  function calNameOf(text) {
    const l = parseLines(text.slice(0, 4000)).find(x => x.name === 'X-WR-CALNAME');
    return l ? unescapeText(l.value).trim() : '';
  }
  // zip（Google カレンダーの書き出し）から .ics を取り出す
  async function readZip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('zip ではありません');
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const out = [];
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const flag = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const nameBytes = u8.subarray(p + 46, p + 46 + nlen);
      const name = new TextDecoder((flag & 0x800) ? 'utf-8' : 'utf-8').decode(nameBytes);
      p += 46 + nlen + xlen + clen;
      if (!/\.ics$/i.test(name)) continue;
      const lo = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const data = u8.subarray(lo, lo + csize);
      let bytes;
      if (method === 0) bytes = data;
      else if (method === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('この端末では zip を開けません');
        const ds = new Response(data).body.pipeThrough(new DecompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(ds).arrayBuffer());
      } else continue;
      out.push({ name: name.split('/').pop(), text: new TextDecoder('utf-8').decode(bytes) });
    }
    return out;
  }

  // .ics の本文 → 予定の一覧（共通の形）
  function parseICS(text, toTZ) {
    toTZ = toTZ || localTZ();
    const lines = parseLines(text);
    const out = [];
    let ev = null, depth = 0;
    lines.forEach(l => {
      if (l.name === 'BEGIN') { if (l.value.toUpperCase() === 'VEVENT' && !ev) { ev = { props: {}, multi: {} }; depth = 0; } else if (ev) depth++; return; }
      if (l.name === 'END') { if (ev && depth > 0) { depth--; return; } if (ev && l.value.toUpperCase() === 'VEVENT') { out.push(ev); ev = null; } return; }
      if (!ev || depth > 0) return;   // VALARM などの中身は読まない
      if (l.name === 'EXDATE' || l.name === 'RDATE') (ev.multi[l.name] = ev.multi[l.name] || []).push(l);
      else ev.props[l.name] = l;
    });
    return out.map(e => {
      const P = e.props;
      const start = parseDT(P.DTSTART, toTZ);
      if (!start) return null;
      let end = parseDT(P.DTEND, toTZ);
      if (!end && P.DURATION && !start.allDay && start.ms !== undefined) {
        const d = P.DURATION.value.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
        if (d) { const w = wallIn(start.ms + ((+d[1] || 0) * 7 * 86400 + (+d[2] || 0) * 86400 + (+d[3] || 0) * 3600 + (+d[4] || 0) * 60) * 1000, toTZ); end = { date: isoOf(w.y, w.m, w.d), time: `${p2(w.h)}:${p2(w.mi)}`, allDay: false }; }
      }
      const ex = [];
      (e.multi.EXDATE || []).forEach(l => l.value.split(',').forEach(v => { const x = parseDT({ value: v, params: l.params }, toTZ); if (x) ex.push(x.date); }));
      const rid = parseDT(P['RECURRENCE-ID'], toTZ);
      return {
        uid: P.UID ? P.UID.value.trim() : '',
        title: P.SUMMARY ? unescapeText(P.SUMMARY.value).trim() : '',
        place: P.LOCATION ? unescapeText(P.LOCATION.value).trim() : '',
        memo: P.DESCRIPTION ? unescapeText(P.DESCRIPTION.value).trim() : '',
        start, end, rrule: parseRRule(P.RRULE && P.RRULE.value), exdates: ex,
        recurrenceId: rid ? rid.date : '',
        cancelled: !!(P.STATUS && P.STATUS.value.toUpperCase() === 'CANCELLED'),
      };
    }).filter(Boolean);
  }

  // Google カレンダーの予定（list_events の一件）→ 共通の形
  function fromGoogle(g, toTZ) {
    toTZ = toTZ || localTZ();
    const conv = x => {
      if (!x) return null;
      if (x.date) return { date: x.date, time: '', allDay: true };
      if (!x.dateTime) return null;
      const ms = Date.parse(x.dateTime);
      if (isNaN(ms)) return null;
      const w = wallIn(ms, toTZ);
      return { date: isoOf(w.y, w.m, w.d), time: `${p2(w.h)}:${p2(w.mi)}`, allDay: false, ms };
    };
    const start = conv(g.start);
    if (!start) return null;
    const rule = (g.recurrence || []).find(s => /^RRULE:/i.test(s));
    const ex = [];
    (g.recurrence || []).filter(s => /^EXDATE/i.test(s)).forEach(s => {
      const l = parseLines(s)[0];
      if (l) l.value.split(',').forEach(v => { const x = parseDT({ value: v, params: l.params }, toTZ); if (x) ex.push(x.date); });
    });
    return {
      uid: g.iCalUID || ('g:' + g.id), gid: g.id,   // iCalUID はアカウントをまたいでも同じ予定なら同じ recurringId: g.recurringEventId || '',
      title: (g.summary || '').trim(), place: (g.location || '').trim(),
      memo: (g.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
      start, end: conv(g.end), rrule: parseRRule(rule), exdates: ex,
      recurrenceId: g.originalStartTime ? (conv(g.originalStartTime) || {}).date || '' : '',
      cancelled: g.status === 'cancelled',
    };
  }

  // ── 繰り返しの展開 ────────────────────────────
  // 予定帖の「毎週」「毎月」にそのまま置き換えられるか
  function simpleRepeat(ev) {
    const r = ev.rrule;
    if (!r || r.COUNT || r.UNTIL || (r.INTERVAL && r.INTERVAL !== '1') || ev.exdates.length || ev.hasOverrides) return null;
    if (r.FREQ === 'WEEKLY') {
      if (r.BYDAY && r.BYDAY.split(',').length === 1 && r.BYDAY.replace(/^[+-]?\d+/, '') !== WD[weekday(ev.start.date)]) return null;
      if (r.BYDAY && r.BYDAY.split(',').length > 1) return null;
      return Object.keys(r).every(k => ['FREQ', 'BYDAY', 'WKST', 'INTERVAL'].includes(k)) ? 'weekly' : null;
    }
    if (r.FREQ === 'MONTHLY') {
      const day = +ev.start.date.slice(8);
      const keys = Object.keys(r).filter(k => !['FREQ', 'WKST', 'INTERVAL'].includes(k));
      if (!keys.length) return day <= 28 ? 'monthly' : null;   // 29日以降は、月によって飛ばす作りの暦があるため展開して取り込む
      if (keys.length === 1 && r.BYMONTHDAY === String(day)) return day <= 28 ? 'monthly' : null;
      // 予定帖が書き出す「月末に寄せる」形（BYMONTHDAY=28,29,30,31;BYSETPOS=-1 など）
      if (keys.sort().join() === 'BYMONTHDAY,BYSETPOS' && r.BYSETPOS === '-1') {
        const days = r.BYMONTHDAY.split(',').map(Number);
        if (days[0] === 28 && days[days.length - 1] === day && days.length === day - 27) return 'monthly';
      }
    }
    return null;
  }
  function untilDate(r, toTZ) {
    if (!r.UNTIL) return null;
    const x = parseDT({ value: r.UNTIL, params: {} }, toTZ);
    return x ? x.date : null;
  }
  // 繰り返しの予定を、日付の並びに開く（from〜to、上限 max 件）
  function expandDates(ev, from, to, max, toTZ) {
    const r = ev.rrule, s = ev.start.date, out = [];
    const step = Math.max(1, +(r.INTERVAL || 1));
    const until = untilDate(r, toTZ), count = r.COUNT ? +r.COUNT : Infinity;
    const ex = new Set(ev.exdates);
    let n = 0;
    const push = iso => {
      if (iso < s) return true;
      if (until && iso > until) return false;
      if (n >= count) return false;
      n++;
      if (iso > to) return false;
      if (iso >= from && !ex.has(iso)) out.push(iso);
      return out.length < max;
    };
    const [sy, sm] = s.split('-').map(Number);
    if (r.FREQ === 'DAILY') {
      for (let iso = s, i = 0; i < 20000; iso = addDaysISO(iso, step), i++) if (!push(iso)) break;
    } else if (r.FREQ === 'WEEKLY') {
      const days = (r.BYDAY ? r.BYDAY.split(',').map(x => WD.indexOf(x.replace(/^[+-]?\d+/, ''))) : [weekday(s)]).filter(x => x >= 0).sort((a, b) => a - b);
      let wk = addDaysISO(s, -weekday(s));   // その週の日曜
      outer: for (let i = 0; i < 3000; i++, wk = addDaysISO(wk, 7 * step)) for (const d of days) if (!push(addDaysISO(wk, d))) break outer;
    } else if (r.FREQ === 'MONTHLY' || r.FREQ === 'YEARLY') {
      const sd = +s.slice(8);
      for (let i = 0; i < 2400; i++) {
        const k = (r.FREQ === 'YEARLY' ? 12 : 1) * step * i;
        const y = sy + Math.floor((sm - 1 + k) / 12), m = (sm - 1 + k) % 12 + 1;
        const ld = lastDay(y, m);
        let cands = [];
        if (r.BYDAY && (r.FREQ === 'MONTHLY' || r.BYMONTH)) {
          r.BYDAY.split(',').forEach(x => {
            const mm = x.match(/^([+-]?\d+)?([A-Z]{2})$/); if (!mm) return;
            const wd = WD.indexOf(mm[2]); if (wd < 0) return;
            const all = []; for (let d = 1; d <= ld; d++) if (weekday(isoOf(y, m, d)) === wd) all.push(d);
            if (!mm[1]) all.forEach(d => cands.push(d)); else { const k2 = +mm[1]; const d = k2 > 0 ? all[k2 - 1] : all[all.length + k2]; if (d) cands.push(d); }
          });
        } else if (r.BYMONTHDAY) {
          cands = r.BYMONTHDAY.split(',').map(Number).map(d => d < 0 ? ld + 1 + d : d).filter(d => d >= 1 && d <= ld);
        } else if (sd <= ld) cands = [sd];
        cands = [...new Set(cands)].sort((a, b) => a - b);
        if (r.BYSETPOS && cands.length) { const pos = +r.BYSETPOS; const d = pos > 0 ? cands[pos - 1] : cands[cands.length + pos]; cands = d ? [d] : []; }
        let stop = false;
        for (const d of cands) if (!push(isoOf(y, m, d))) { stop = true; break; }
        if (stop || isoOf(y, m, 1) > to) break;
      }
    } else return null;   // 分・時の単位の繰り返しは扱わない
    return out;
  }

  // 共通の形の予定一覧 → 予定帖の項目（重なり防止の印 icsUid 付き）
  // opt: { from: 'YYYY-MM-DD'（これより前の単発は取り込まない）, today, horizon: 繰り返しを開く先の日付, src }
  function toItems(events, opt) {
    const today = opt.today, from = opt.from || '0000-01-01', horizon = opt.horizon || addDaysISO(today, 366), toTZ = opt.toTZ || localTZ();
    const overrides = {};   // 繰り返しのうち、個別に直した回（uid → 日付の集合）
    events.forEach(e => { if (e.recurrenceId) (overrides[e.uid] = overrides[e.uid] || new Set()).add(e.recurrenceId); });
    const out = [], skipped = { cancelled: 0, old: 0, unsupported: 0 };
    const base = e => {
      const it = { title: e.title || '（無題）', place: e.place, memo: e.memo.slice(0, 1000), repeat: 'none', src: opt.src };
      if (opt.cal) it.cal = String(opt.cal).slice(0, 60);
      if (e.gid) it.gid = e.gid;
      if (!e.start.allDay) {
        it.time = e.start.time;
        if (e.end && !e.end.allDay && e.end.date === e.start.date && e.end.time > e.start.time) it.end = e.end.time;
      }
      // 何日にもまたがる予定は初日に置き、終わりの日をメモに添える
      const lastDate = e.end ? (e.end.allDay ? addDaysISO(e.end.date, -1) : e.end.date) : e.start.date;
      if (lastDate > e.start.date) { const [, mm, dd] = lastDate.split('-').map(Number); it.memo = `（${mm}月${dd}日まで）` + (it.memo ? '\n' + it.memo : ''); }
      return it;
    };
    events.forEach(e => {
      if (e.cancelled) { skipped.cancelled++; return; }
      if (e.rrule && !e.recurrenceId) {
        e.hasOverrides = !!overrides[e.uid];
        const rep = simpleRepeat(e);
        if (rep) {
          // 毎週・毎月はそのまま置き換え、取り込む範囲の最初の回を起点にする
          let first = e.start.date;
          if (first < from) { const ds = expandDates(e, from, addDaysISO(from, 40), 1, toTZ) || []; if (!ds.length) { skipped.old++; return; } first = ds[0]; }
          out.push({ ...base(e), date: first, repeat: rep, icsUid: e.uid });
          return;
        }
        const ds = expandDates(e, from, horizon, 800, toTZ);
        if (!ds) { skipped.unsupported++; return; }
        const ov = overrides[e.uid] || new Set();
        ds.filter(d => !ov.has(d)).forEach(d => out.push({ ...base(e), date: d, icsUid: e.uid + '#' + d, done: d < today }));
        return;
      }
      if (e.start.date < from) { skipped.old++; return; }
      out.push({ ...base(e), date: e.start.date, icsUid: e.recurrenceId ? e.uid + '#' + e.recurrenceId : e.uid, done: e.start.date < today });
    });
    return { items: out, skipped };
  }

  // ── .ics を書く ───────────────────────────────
  function escText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {   // 75バイトごとに折り返す（文字の途中では切らない）
    const enc = s => new TextEncoder().encode(s).length;
    if (enc(line) <= 75) return line;
    const out = []; let cur = '', lim = 75;
    for (const ch of line) { if (enc(cur + ch) > lim) { out.push(cur); cur = ch; lim = 74; } else cur += ch; }
    out.push(cur);
    return out.join('\r\n ');
  }
  const compact = iso => iso.replace(/-/g, '');
  // 予定帖の壁時計（端末の時間帯）→ UTC の日時文字列
  function utcStamp(date, time, tz) {
    const [y, m, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
    const t = new Date(instantOf(y, m, d, h, mi, 0, tz));
    return `${t.getUTCFullYear()}${p2(t.getUTCMonth() + 1)}${p2(t.getUTCDate())}T${p2(t.getUTCHours())}${p2(t.getUTCMinutes())}00Z`;
  }
  function endOf(item) {   // 終わりの時刻がなければ1時間
    if (item.end) return { date: item.date, time: item.end };
    const [h, mi] = item.time.split(':').map(Number);
    const t = h * 60 + mi + 60;
    return t >= 24 * 60 ? { date: addDaysISO(item.date, 1), time: `${p2(Math.floor((t - 1440) / 60))}:${p2(t % 60)}` } : { date: item.date, time: `${p2(Math.floor(t / 60))}:${p2(t % 60)}` };
  }
  function rruleOf(item) {
    if (item.repeat === 'weekly') return 'FREQ=WEEKLY';
    if (item.repeat === 'monthly') {
      const d = +item.date.slice(8);
      if (d <= 28) return 'FREQ=MONTHLY';
      // 予定帖は月末に寄せる（31日の毎月なら、30日までの月は30日に）。同じ動きになる書き方にする
      const days = []; for (let k = 28; k <= d; k++) days.push(k);
      return `FREQ=MONTHLY;BYMONTHDAY=${days.join(',')};BYSETPOS=-1`;
    }
    return '';
  }
  function uidOf(item) { return item.icsUid && !/#/.test(item.icsUid) && !/^g:/.test(item.icsUid) ? item.icsUid : (item.id + '@hoi-yotei'); }
  function vevent(item, opt) {
    const tz = opt.tz || localTZ(), L = [];
    L.push('BEGIN:VEVENT');
    L.push('UID:' + uidOf(item));
    L.push('DTSTAMP:' + (opt.stamp || utcStamp(opt.today, '00:00', tz)));
    if (item.time) {
      const e = endOf(item);
      L.push('DTSTART:' + utcStamp(item.date, item.time, tz));
      L.push('DTEND:' + utcStamp(e.date, e.time, tz));
    } else {
      L.push('DTSTART;VALUE=DATE:' + compact(item.date));
      L.push('DTEND;VALUE=DATE:' + compact(addDaysISO(item.date, 1)));
    }
    L.push('SUMMARY:' + escText(item.title));
    if (item.place) L.push('LOCATION:' + escText(item.place));
    const desc = [item.memo, opt.note].filter(Boolean).join('\n\n');
    if (desc) L.push('DESCRIPTION:' + escText(desc));
    const rr = rruleOf(item); if (rr) L.push('RRULE:' + rr);
    L.push('END:VEVENT');
    return L;
  }
  function buildICS(list, opt) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nissho Research//Hoi Yotei-cho//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + escText(opt.calName || '方位予定帖')];
    list.forEach(it => vevent(it, opt).forEach(l => L.push(l)));
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  // Google カレンダーの「予定を追加」画面を開くアドレス
  function googleAddURL(item, opt) {
    const tz = opt.tz || localTZ();
    const q = new URLSearchParams({ action: 'TEMPLATE', text: item.title || '' });
    if (item.time) { const e = endOf(item); q.set('dates', `${compact(item.date)}T${item.time.replace(':', '')}00/${compact(e.date)}T${e.time.replace(':', '')}00`); q.set('ctz', tz); }
    else q.set('dates', `${compact(item.date)}/${compact(addDaysISO(item.date, 1))}`);
    const desc = [item.memo, opt.note].filter(Boolean).join('\n\n');
    if (desc) q.set('details', desc);
    if (item.place) q.set('location', item.place);
    const rr = rruleOf(item); if (rr) q.set('recur', 'RRULE:' + rr);
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  // Google カレンダーへ直接書くときの引数（create_event）
  function googleCreateInput(item, opt) {
    const x = { summary: item.title || '（無題）', notificationLevel: 'NONE' };
    if (item.time) { const e = endOf(item); x.startTime = `${item.date}T${item.time}:00`; x.endTime = `${e.date}T${e.time}:00`; }
    else { x.allDay = true; x.startTime = `${item.date}T00:00:00`; x.endTime = `${addDaysISO(item.date, 1)}T00:00:00`; }
    if (item.place) x.location = item.place;
    const desc = [item.memo, opt && opt.note].filter(Boolean).join('\n\n');
    if (desc) x.description = desc;
    const rr = rruleOf(item); if (rr) x.recurrenceData = ['RRULE:' + rr];
    if (opt && opt.calendarId) x.calendarId = opt.calendarId;
    return x;
  }
  // 取り込む範囲 → 起点の日付
  function rangeFrom(key, today) {
    const [y, m, d] = today.split('-').map(Number);
    if (key === 'all') return '0000-01-01';
    if (key === 'future') return today;
    if (key === 'thisyear') return isoOf(y, 1, 1);
    if (key === '3m') { const mm = m - 3 <= 0 ? m + 9 : m - 3, yy = m - 3 <= 0 ? y - 1 : y; return isoOf(yy, mm, Math.min(d, lastDay(yy, mm))); }
    return isoOf(y - 1, m, Math.min(d, lastDay(y - 1, m)));   // 1年前から（既定）
  }

  const api = { calNameOf, readZip, parseICS, fromGoogle, toItems, buildICS, googleAddURL, googleCreateInput, rangeFrom, expandDates, simpleRepeat, rruleOf, localTZ, addDaysISO, uidOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HoiICS = api;
})(typeof window !== 'undefined' ? window : globalThis);
