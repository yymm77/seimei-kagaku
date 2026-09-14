/* maki_kekkon_aisho.js
 * 牧正人史『結婚姓名占術』 3章4〜6（140〜173頁）の相性判定
 * 原典より書き起こし（2026年9月14日）
 *
 * 『姓名（なまえ）』2章の採点法（完全相性3点・準相性2点・補佐相性1点・
 * 反相性6点）とは別系統。こちらは性格タイプ記号の突き合わせで判定する。
 *
 * ■ 性格タイプ
 *   内面性格（愛の心）・対人性格（愛の行動）とも S1〜S5・K1〜K5 の10種。
 *   末尾に 1〜3 の "強さ" が付く（例 S2—1）。
 *   一人あたり、内面で2〜4個、対人で2〜4個をもつ。
 *   これらは数表①②③（内面）・数表③（対人）から引く。
 *
 * ■ よい相性の組みあわせ（原典136頁）＝ 同じ記号どうし
 *   S1—S1 S2—S2 S3—S3 S4—S4 S5—S5 / K1—K1 K2—K2 K3—K3 K4—K4 K5—K5
 *
 * ■ 反発しあう相性の組みあわせ（原典137頁）＝ SとKの同番号
 *   S1×K1 S2×K2 S3×K3 S4×K4 S5×K5 / K1×S1 K2×S2 K3×S3 K4×S4 K5×S5
 *
 * ■ 二つの表（原典142頁）
 *   表① ヨコ＝女性の内面性格〔A：B〕 × タテ＝男性の対人性格〔A：C〕
 *   表② ヨコ＝女性の対人性格〔A：C〕 × タテ＝男性の内面性格〔A：B〕
 *   交差するマスのうち、よい相性・反発の組みあわせだけに、両者の
 *   "強さ" の合計を書く（例 S2—1 と S2—2 なら 1＋2＝3）。
 *   よい相性なら ＋、反発なら −。
 *
 * ■ 記号化（原典147頁）
 *   ＋3以上→＝ ／ ＋1〜＋2→一 ／ 0→▨ ／ −1〜−2→✕ ／ −3以下→※
 *   ＝ きわめてよい相性／一 よい相性／※ 強く反発する相性／
 *   ✕ 反発する相性／▨ ひきあうことも反発もない相性（原典150頁）
 *
 * ■ ▨ の二義（原典162・164頁）
 *   (+0)+(-0)=0 の「まったくの無相性」と、(+4)+(-4)=0 のように
 *   同数の＋と−が同居して0になったものがある。後者は波が激しい。
 *   plusRaw・minusRaw を残してあるので、区別して表示できる。
 */

(function (global) {
  'use strict';

  // 25タイプ表（原典150・151頁）。鍵は 表①の記号＋表②の記号。
  var TYPES = {
    '＝＝': { dai: '相愛タイプ',           sai: '完全相愛タイプA', page: 180 },
    '一一': { dai: '相愛タイプ',           sai: '完全相愛タイプB', page: 180 },
    '一＝': { dai: '相愛タイプ',           sai: '理想愛タイプA',   page: 180 },
    '＝一': { dai: '相愛タイプ',           sai: '理想愛タイプB',   page: 180 },

    '▨＝': { dai: '片惚れタイプ',         sai: '強い片惚れタイプA', page: 181 },
    '＝▨': { dai: '片惚れタイプ',         sai: '強い片惚れタイプB', page: 181 },
    '▨一': { dai: '片惚れタイプ',         sai: '片惚れタイプA',     page: 181 },
    '一▨': { dai: '片惚れタイプ',         sai: '片惚れタイプB',     page: 181 },

    '＝✕': { dai: '愛憎アンバランスタイプ', sai: '強愛弱憎タイプA', page: 182 },
    '✕＝': { dai: '愛憎アンバランスタイプ', sai: '強愛弱憎タイプB', page: 182 },
    '一※': { dai: '愛憎アンバランスタイプ', sai: '弱愛強憎タイプA', page: 182 },
    '※一': { dai: '愛憎アンバランスタイプ', sai: '弱愛強憎タイプB', page: 182 },

    '＝※': { dai: '愛憎バランスタイプ',   sai: '強い愛憎タイプA', page: 183 },
    '※＝': { dai: '愛憎バランスタイプ',   sai: '強い愛憎タイプB', page: 183 },
    '一✕': { dai: '愛憎バランスタイプ',   sai: '弱い愛憎タイプA', page: 183 },
    '✕一': { dai: '愛憎バランスタイプ',   sai: '弱い愛憎タイプB', page: 183 },

    '※▨': { dai: '時折衝突タイプ',       sai: '時折強衝突タイプA', page: 184 },
    '▨※': { dai: '時折衝突タイプ',       sai: '時折強衝突タイプB', page: 184 },
    '✕▨': { dai: '時折衝突タイプ',       sai: '時折弱衝突タイプA', page: 184 },
    '▨✕': { dai: '時折衝突タイプ',       sai: '時折弱衝突タイプB', page: 184 },

    '※※': { dai: '常時衝突タイプ',       sai: '常時衝突タイプA',   page: 185 },
    '✕✕': { dai: '常時衝突タイプ',       sai: '常時衝突タイプB',   page: 185 },
    '✕※': { dai: '常時衝突タイプ',       sai: '準常時衝突タイプA', page: 185 },
    '※✕': { dai: '常時衝突タイプ',       sai: '準常時衝突タイプB', page: 185 },

    '▨▨': { dai: '無関心タイプ',         sai: '無関心タイプ',     page: 186 }
  };

  var KIGOU_IMI = {
    '＝': 'きわめてよい相性',
    '一': 'よい相性',
    '▨': 'ひきあうことも反発もない相性',
    '✕': '反発する相性',
    '※': '強く反発する相性'
  };

  /* "S2-1" / "S2—1" / {type:'S2', tsuyosa:1} のいずれでも受ける */
  function parseType(x) {
    if (x && typeof x === 'object') {
      return { type: String(x.type).toUpperCase(), tsuyosa: Number(x.tsuyosa) };
    }
    var m = String(x).toUpperCase().match(/^([SK])\s*([1-5])\s*[-—ー]?\s*([1-3])$/);
    if (!m) throw new Error('性格タイプの書き方が違います: ' + x);
    return { type: m[1] + m[2], tsuyosa: Number(m[3]) };
  }

  /* 二つの性格タイプの関係。'good'（同記号）／'bad'（SとKの同番号）／null */
  function kankei(a, b) {
    if (a.type === b.type) return 'good';
    if (a.type[0] !== b.type[0] && a.type[1] === b.type[1]) return 'bad';
    return null;
  }

  /* 合計点を記号に直す（原典147頁） */
  function kigouka(goukei) {
    if (goukei >= 3) return '＝';
    if (goukei >= 1) return '一';
    if (goukei === 0) return '▨';
    if (goukei >= -2) return '✕';
    return '※';
  }

  /* 一つの表を計算する。yoko・tate はいずれも性格タイプの配列 */
  function ichiHyou(yoko, tate) {
    var y = yoko.map(parseType), t = tate.map(parseType);
    var cells = [], plus = 0, minus = 0;
    t.forEach(function (tv) {
      y.forEach(function (yv) {
        var k = kankei(tv, yv);
        if (!k) return;
        var ten = tv.tsuyosa + yv.tsuyosa;
        if (k === 'good') { plus += ten; } else { minus += ten; }
        cells.push({
          tate: tv.type + '—' + tv.tsuyosa,
          yoko: yv.type + '—' + yv.tsuyosa,
          ten: (k === 'good' ? '+' : '−') + ten,
          kankei: (k === 'good' ? 'よい相性' : '反発')
        });
      });
    });
    var goukei = plus - minus;
    return {
      cells: cells,
      plusRaw: plus,      // ＋の合計
      minusRaw: minus,    // −の合計（絶対値）
      goukei: goukei,
      kigou: kigouka(goukei),
      imi: KIGOU_IMI[kigouka(goukei)]
    };
  }

  /* 相性タイプを判定する
   *   josei / dansei : { naimen: [性格タイプ…], taijin: [性格タイプ…] }
   *   naimen は〔A：B〕、taijin は〔A：C〕から引いたもの。
   * 戻り値 { hyou1, hyou2, kigou, dai, sai, page }
   */
  function makiKekkonAisho(josei, dansei) {
    var hyou1 = ichiHyou(josei.naimen, dansei.taijin); // 女性の内面 × 男性の対人
    var hyou2 = ichiHyou(josei.taijin, dansei.naimen); // 女性の対人 × 男性の内面
    var kigou = hyou1.kigou + hyou2.kigou;
    var t = TYPES[kigou];
    return {
      hyou1: hyou1,
      hyou2: hyou2,
      kigou: kigou,
      dai: t.dai,
      sai: t.sai,
      page: t.page
    };
  }

  global.MAKI_KEKKON_AISHO_TYPES = TYPES;
  global.makiKekkonAisho = makiKekkonAisho;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      MAKI_KEKKON_AISHO_TYPES: TYPES,
      makiKekkonAisho: makiKekkonAisho
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
