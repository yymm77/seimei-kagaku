/* maki_kekkon_view.js
 * 『結婚姓名占術』の数表の出力を、人が読める形に直す。
 *
 * 数表が返す「＊19-20／＊20-21／29／30／＊32／＊33-34／34」は
 * 機械が読むための形で、そのままでは意味がつかめない。
 * 原典176〜177頁は、この7組を帯グラフに描き直している。
 * ここでは同じことをする。
 *
 *   1. 隣り合う山・重なる山をつないで一本の帯にする
 *   2. 帯を「19歳6か月から21歳6か月まで（2年間）」と言葉にする
 *   3. 原典と同じ横帯の図（SVG）を描く
 *   4. 二人の帯を重ね、両方によい年齢を出す
 *
 * 入力は maki_kekkon_data.js / naimen1 / naimen2 / taijin3 が返す
 * koteki / jonetsu / jiki の配列（{start, end, star} を含むもの）。
 */

(function (global) {
  'use strict';

  /* ── 1. 山をつないで帯にする ───────────────────────── */

  /* 重なるか隣り合う山をひとつにまとめる。
     ＊のある部分は strongFrom〜strongTo として帯の中に持たせる。 */
  function makiBands(yama) {
    if (!yama || !yama.length) return [];
    var s = yama.slice().sort(function (a, b) { return a.start - b.start; });
    var out = [];
    s.forEach(function (y) {
      var last = out[out.length - 1];
      if (last && y.start <= last.to + 0.001) {          // つながる
        last.to = Math.max(last.to, y.end);
        if (y.star) {
          last.strongFrom = (last.strongFrom === null) ? y.start : Math.min(last.strongFrom, y.start);
          last.strongTo   = (last.strongTo   === null) ? y.end   : Math.max(last.strongTo,   y.end);
        }
      } else {                                            // 新しい帯
        out.push({
          from: y.start, to: y.end,
          strongFrom: y.star ? y.start : null,
          strongTo:   y.star ? y.end   : null
        });
      }
    });
    out.forEach(function (b) {
      b.years = Math.round((b.to - b.from) * 2) / 2;
      b.hasStrong = b.strongFrom !== null;
    });
    return out;
  }

  /* ── 2. 言葉にする ─────────────────────────────── */

  /* 19.5 → "19歳6か月" ／ 19 → "19歳" */
  function toAge(v) {
    var y = Math.floor(v + 1e-9);
    var half = Math.abs(v - y - 0.5) < 1e-9;
    return y + '歳' + (half ? '6か月' : '');
  }

  function spanText(years) {
    if (years >= 1) {
      var y = Math.floor(years), m = Math.round((years - y) * 12);
      return y + '年' + (m ? m + 'か月' : '') + '間';
    }
    return Math.round(years * 12) + 'か月間';
  }

  function bandText(b) {
    var t = toAge(b.from) + 'から' + toAge(b.to) + 'まで（' + spanText(b.years) + '）';
    if (b.hasStrong && (b.strongTo - b.strongFrom) < (b.to - b.from) - 0.001) {
      t += '。とくに強いのは' + toAge(b.strongFrom) + 'から' + toAge(b.strongTo);
    } else if (b.hasStrong) {
      t += '。運の勢いが最も強い時期';
    }
    return t;
  }

  /* 帯の一覧から、読んで分かる文章をつくる */
  function makiKotekiText(bands, opts) {
    opts = opts || {};
    var na = opts.na || 'この姓名';
    if (!bands.length) return na + 'の' + (opts.mono || '好適期') + 'は、表の範囲に出ていません。';
    var lines = [];
    var strong = bands.filter(function (b) { return b.hasStrong; });
    var best = (strong.length ? strong : bands).reduce(function (a, b) {
      return (b.strongTo - b.strongFrom || b.to - b.from) > (a.strongTo - a.strongFrom || a.to - a.from) ? b : a;
    });
    lines.push('最も強いのは' + toAge(best.hasStrong ? best.strongFrom : best.from) +
               'から' + toAge(best.hasStrong ? best.strongTo : best.to) + 'にかけて。');
    // 帯と帯のあいだが3年以上あいていれば、その空白を告げる
    for (var i = 0; i < bands.length - 1; i++) {
      var gap = bands[i + 1].from - bands[i].to;
      if (gap >= 3) {
        lines.push(toAge(bands[i].to) + 'から' + toAge(bands[i + 1].from) +
                   'までの' + spanText(gap) + 'は、めぐってきません。');
      }
    }
    var last = bands[bands.length - 1];
    if (last.to < 36) lines.push(toAge(last.to) + 'を過ぎると、表にはもう出てきません。');
    return lines.join('');
  }

  /* ── 3. 二人の帯を重ねる ───────────────────────── */

  function makiKasanari(bandsA, bandsB) {
    var out = [];
    bandsA.forEach(function (a) {
      bandsB.forEach(function (b) {
        var from = Math.max(a.from, b.from), to = Math.min(a.to, b.to);
        if (to - from > 0.001) {
          out.push({
            from: from, to: to,
            years: Math.round((to - from) * 2) / 2,
            bothStrong: a.hasStrong && b.hasStrong &&
                        Math.min(a.strongTo, b.strongTo) - Math.max(a.strongFrom, b.strongFrom) > 0.001
          });
        }
      });
    });
    return out.sort(function (x, y) { return x.from - y.from; });
  }

  /* ── 4. 図を描く ─────────────────────────────── */

  var INK = '#2b2622', WEAK = '#b9b2a6', RULE = '#d8d2c6', SHU = '#9e3b2f';

  /* 一人ぶんの帯グラフ。原典176〜177頁と同じ横帯。 */
  function makiKotekiSVG(rows, opts) {
    opts = opts || {};
    var lo = opts.min || 18, hi = opts.max || 41;
    var W = opts.width || 720, padL = 96, padR = 16, padT = 18;
    var rowH = 46, axisH = 26;
    var H = padT + rows.length * rowH + axisH;
    var iw = W - padL - padR;
    var x = function (a) { return padL + (a - lo) / (hi - lo) * iw; };
    var p = [];

    p.push('<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" xmlns="http://www.w3.org/2000/svg" ' +
           'font-family="&quot;Yu Mincho&quot;,&quot;YuMincho&quot;,&quot;Hiragino Mincho ProN&quot;,serif" ' +
           'role="img" aria-label="' + (opts.aria || '年齢ごとの運の帯') + '">');
    // 斜線の模様（原典の網かけにならう）
    p.push('<defs><pattern id="mk-h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
           '<rect width="6" height="6" fill="none"/><line x1="0" y1="0" x2="0" y2="6" stroke="' + INK + '" stroke-width="2.4"/></pattern>' +
           '<pattern id="mk-l" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
           '<rect width="7" height="7" fill="none"/><line x1="0" y1="0" x2="0" y2="7" stroke="' + WEAK + '" stroke-width="1.6"/></pattern></defs>');

    rows.forEach(function (row, ri) {
      var y0 = padT + ri * rowH;
      p.push('<text x="' + (padL - 12) + '" y="' + (y0 + 26) + '" text-anchor="end" font-size="15" fill="' + INK + '">' +
             esc(row.label) + '</text>');
      p.push('<line x1="' + padL + '" y1="' + (y0 + 21) + '" x2="' + (padL + iw) + '" y2="' + (y0 + 21) +
             '" stroke="' + RULE + '" stroke-width="1"/>');
      (row.bands || []).forEach(function (b) {
        var bx = x(b.from), bw = Math.max(2, x(b.to) - bx);
        p.push('<rect x="' + f(bx) + '" y="' + (y0 + 6) + '" width="' + f(bw) + '" height="30" fill="url(#mk-l)"/>');
        p.push('<rect x="' + f(bx) + '" y="' + (y0 + 6) + '" width="' + f(bw) + '" height="30" fill="none" stroke="' + WEAK + '"/>');
        if (b.hasStrong) {
          var sx = x(b.strongFrom), sw = Math.max(2, x(b.strongTo) - sx);
          p.push('<rect x="' + f(sx) + '" y="' + (y0 + 6) + '" width="' + f(sw) + '" height="30" fill="url(#mk-h)"/>');
          p.push('<rect x="' + f(sx) + '" y="' + (y0 + 6) + '" width="' + f(sw) + '" height="30" fill="none" stroke="' + INK + '"/>');
        }
      });
      (row.marks || []).forEach(function (m) {
        var mx = x(m.from), mw = Math.max(2, x(m.to) - mx);
        p.push('<rect x="' + f(mx) + '" y="' + (y0 + 2) + '" width="' + f(mw) + '" height="38" fill="none" ' +
               'stroke="' + SHU + '" stroke-width="2"/>');
      });
    });

    // 年齢の目盛
    var ay = padT + rows.length * rowH + 2;
    p.push('<line x1="' + padL + '" y1="' + ay + '" x2="' + (padL + iw) + '" y2="' + ay + '" stroke="' + INK + '" stroke-width="1"/>');
    for (var a = lo; a <= hi; a++) {
      var big = (a % 5 === 0);
      p.push('<line x1="' + f(x(a)) + '" y1="' + ay + '" x2="' + f(x(a)) + '" y2="' + (ay + (big ? 6 : 3)) +
             '" stroke="' + INK + '" stroke-width="1"/>');
      if (big) p.push('<text x="' + f(x(a)) + '" y="' + (ay + 20) + '" text-anchor="middle" font-size="12" fill="' + INK + '">' + a + '</text>');
    }
    p.push('<text x="' + (padL + iw) + '" y="' + (ay + 20) + '" text-anchor="end" font-size="11" fill="' + WEAK + '">歳</text>');
    p.push('</svg>');
    return p.join('');
  }

  function f(v) { return Math.round(v * 10) / 10; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  global.makiBands = makiBands;
  global.makiKotekiText = makiKotekiText;
  global.makiKasanari = makiKasanari;
  global.makiKotekiSVG = makiKotekiSVG;
  global.makiToAge = toAge;
  global.makiBandText = bandText;
  global.makiSpanText = spanText;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { makiBands: makiBands, makiKotekiText: makiKotekiText, makiKasanari: makiKasanari,
                       makiKotekiSVG: makiKotekiSVG, makiToAge: toAge, makiBandText: bandText, makiSpanText: spanText };
  }
})(typeof window !== 'undefined' ? window : globalThis);
