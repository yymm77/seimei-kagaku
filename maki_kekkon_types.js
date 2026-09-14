/* maki_kekkon_types.js
 * 牧正人史『結婚姓名占術』 性格タイプ10種
 * 内面性格＝原典66頁、対人性格＝原典99頁より（2026年9月14日）
 *
 * S＝陽性の愛、K＝陰性の愛。番号1〜5は愛の型で、内面（心）と対人（行動）で
 * 共通の呼び名をもつ。原典99頁は「対人性格のタイプは、基本的には内面性格と
 * 共通の性格五つと陰性の性格五つ」と述べている。
 *
 * 一人がもつタイプは、内面で2〜4個、対人で2〜4個。原典66頁は、二つの人は
 * 性格がハッキリしており、四つの人は性格の幅が広いぶん矛盾したところがある、
 * としている。タイプ記号の末尾の1〜3は "強さ"（原典141頁）。
 *
 * 各タイプの詳しい説明は原典72〜80頁（内面）と106〜113頁（対人）にあり、
 * 一タイプにつき囲み一つ。未取得。
 *
 * なお『姓名（なまえ）』序章にも「開拓者性」「他人利用性」という語が出る。
 * 同じ体系の呼び名と考えられる。
 */

(function (global) {
  'use strict';

  var NAMES = {
    S1: '開拓者',   S2: '先手必勝', S3: '激情',   S4: '献身',     S5: '世話型',
    K1: '他人利用', K2: '頑固一徹', K3: '神経質', K4: '自分本位', K5: '孤独独断'
  };

  var SEISHITSU = { S: '陽性の愛', K: '陰性の愛' };

  /* 内面性格は「〜の心」、対人性格は「〜の行動」と呼ぶ（原典66・99頁） */
  function makiKekkonTypeName(code, men) {
    var key = String(code).toUpperCase().slice(0, 2);
    if (!NAMES[key]) return null;
    return NAMES[key] + (men === 'taijin' ? 'の行動' : 'の心');
  }

  /* "S2-1" を読み解く */
  function makiKekkonTypeInfo(code, men) {
    var m = String(code).toUpperCase().match(/^([SK])([1-5])-?([1-3])?$/);
    if (!m) return null;
    var key = m[1] + m[2];
    return {
      code: key,
      seishitsu: SEISHITSU[m[1]],       // 陽性の愛／陰性の愛
      na: NAMES[key],                   // 開拓者 など
      yobina: makiKekkonTypeName(key, men),
      tsuyosa: m[3] ? Number(m[3]) : null
    };
  }

  global.MAKI_KEKKON_TYPE_NAMES = NAMES;
  global.makiKekkonTypeName = makiKekkonTypeName;
  global.makiKekkonTypeInfo = makiKekkonTypeInfo;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      MAKI_KEKKON_TYPE_NAMES: NAMES,
      makiKekkonTypeName: makiKekkonTypeName,
      makiKekkonTypeInfo: makiKekkonTypeInfo
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
