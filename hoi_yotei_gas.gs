/**
 * 方位予定帖 — 解錠の仕組み（Google Apps Script）
 *
 * 置き場所：新しい Google スプレッドシート →「拡張機能」→「Apps Script」に貼り付ける。
 * スクリプト プロパティ（「プロジェクトの設定」→「スクリプト プロパティ」）に次を登録：
 *   STRIPE_SECRET_KEY … Stripe の制限付きキー（Checkout Sessions の「読み取り」だけを許可したもの。rk_live_… で始まる）
 *   PRICE_JPY         … 1000（金額の確認に使う。省略時は 1000）
 *   SHOP_MAIL_NAME    … 送信者名（省略時は「方位予定帖」）
 *   SHOP_MAIL_NAME_EN … 英語のメールの送信者名（省略時は「Hōi Yotei-chō」）
 *   OWNER_EMAIL       … 売れたときのお知らせ先（省略時は yymm77@gmail.com）
 *
 * ページからの呼び出し（GET）
 *   ?action=claim&session_id=cs_…   支払いを確かめ、解錠番号を発行（同じ支払いには同じ番号を返す）
 *   ?action=check&key=HY-…          解錠番号の有効期限を返す
 *   ?action=resend&email=…          そのアドレスの解錠番号をメールで送る（画面には出さない）
 *   どの呼び出しにも &lang=en を付けると、返事の文とメールが英語になる（英語版のページが付ける）。
 *   英語版のページから買った方は、支払いリンクに client_reference_id=en が付き、claim でそれを見て英語のメールを送る。
 */

const SHEET_NAME = '購入記録';
const HEAD = ['解錠番号', 'Stripeセッション', 'メール', '金額', '購入日', '有効期限', '状態', 'メモ'];
const VALID_DAYS = 365;
const PAGE_URL = 'https://yymm77.github.io/seimei-kagaku/hoi-yotei.html';
const PAGE_URL_EN = 'https://yymm77.github.io/seimei-kagaku/hoi-yotei-en.html';

// 画面に返す文（日本語・英語）
const MSG = {
  unknown:   ['不明な呼び出しです。', 'Unknown request.'],
  error:     ['処理中に問題が起きました。時間をおいてもう一度お試しください。', 'Something went wrong. Please try again later.'],
  badSid:    ['お支払いの番号が正しくありません。', 'The payment reference is not valid.'],
  revokedP:  ['この購入は無効になっています。お問い合わせください。', 'This purchase has been cancelled. Please contact us.'],
  unpaid:    ['お支払いがまだ完了していません。', 'The payment has not been completed yet.'],
  wrongItem: ['この品物のお支払いではありません。', 'This payment is not for this product.'],
  badKey:    ['解錠番号の形が正しくありません。', 'The unlock code is not in the right format.'],
  revokedK:  ['この解錠番号は無効になっています。お問い合わせください。', 'This unlock code has been cancelled. Please contact us.'],
  expired:   ['この解錠番号は {d} で期限が切れています。', 'This unlock code expired on {d}.'],
  notFound:  ['この解錠番号は見つかりませんでした。', 'This unlock code was not found.']
};
function msg_(k, en, d) { return MSG[k][en ? 1 : 0].replace('{d}', d || ''); }

function doGet(e) {
  const p = (e && e.parameter) || {};
  const en = p.lang === 'en';
  let out;
  try {
    if (p.action === 'claim') out = claim_(String(p.session_id || ''), en);
    else if (p.action === 'check') out = check_(String(p.key || ''), en);
    else if (p.action === 'resend') out = resend_(String(p.email || ''), en);
    else out = { ok: false, message: msg_('unknown', en) };
  } catch (err) {
    console.error(err);
    out = { ok: false, message: msg_('error', en) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// ── 支払いの確認と発行 ───────────────────────────
function claim_(sid, en) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { ok: false, message: msg_('badSid', en) };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === sid) return { ok: rows[i][6] === '有効', key: rows[i][0], expires: ymd_(rows[i][5]),
        message: rows[i][6] === '有効' ? '' : msg_('revokedP', en) };
    }
    const s = stripeSession_(sid);
    const price = Number(prop_('PRICE_JPY') || 1000);
    if (s.payment_status !== 'paid') return { ok: false, message: msg_('unpaid', en) };
    // 円での支払い、または Adaptive Pricing で現地通貨に換えた支払い（元の通貨が円）のどちらも受け付ける
    const cc = s.currency_conversion || null;
    const jpyOk = String(s.currency).toLowerCase() === 'jpy' && Number(s.amount_total) === price;
    const convOk = cc && String(cc.source_currency).toLowerCase() === 'jpy' && Number(cc.amount_total) === price;
    if (!jpyOk && !convOk) return { ok: false, message: msg_('wrongItem', en) };
    // 英語版から買った方（支払いリンクの client_reference_id=en）には英語のメール
    const mailEn = en || String(s.client_reference_id || '') === 'en';

    const email = (s.customer_details && s.customer_details.email) || s.customer_email || '';
    const key = newKey_(rows);
    const now = new Date();
    const exp = new Date(now.getTime()); exp.setDate(exp.getDate() + VALID_DAYS);
    const memo = [convOk && !jpyOk ? '外貨払い ' + String(s.currency).toUpperCase() + ' ' + s.amount_total : '', mailEn ? '英語版' : ''].filter(String).join(' ');
    sh.appendRow([key, sid, email, price, now, exp, '有効', memo]);
    if (email) sendKeyMail_(email, [{ key: key, expires: ymd_(exp) }], mailEn);
    notifyOwner_(email, price, key, exp, convOk && !jpyOk ? String(s.currency).toUpperCase() + ' ' + s.amount_total : '', mailEn);
    return { ok: true, key: key, expires: ymd_(exp) };
  } finally {
    lock.releaseLock();
  }
}

// ── 番号の確認 ─────────────────────────────────
function check_(key, en) {
  key = key.trim().toUpperCase();
  if (!/^HY-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(key)) return { ok: false, message: msg_('badKey', en) };
  const rows = sheet_().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      if (rows[i][6] !== '有効') return { ok: false, revoked: true, message: msg_('revokedK', en) };
      const exp = ymd_(rows[i][5]);
      if (exp < ymd_(new Date())) return { ok: false, expired: true, expires: exp, message: msg_('expired', en, exp.replace(/-/g, '/')) };
      return { ok: true, expires: exp };
    }
  }
  return { ok: false, message: msg_('notFound', en) };
}

// ── 番号の再送 ─────────────────────────────────
function resend_(email, en) {
  email = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: true };
  const cache = CacheService.getScriptCache(), ck = 'resend_' + email;
  if (cache.get(ck)) return { ok: true };            // 同じアドレスへの連続送信を防ぐ（10分）
  cache.put(ck, '1', 600);
  const rows = sheet_().getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email && rows[i][6] === '有効') list.push({ key: rows[i][0], expires: ymd_(rows[i][5]) });
  }
  if (list.length) sendKeyMail_(email, list, en);
  return { ok: true };                                // 登録の有無は画面に出さない
}

// ── 下回り ────────────────────────────────────
function stripeSession_(sid) {
  const sk = prop_('STRIPE_SECRET_KEY');
  if (!sk) throw new Error('STRIPE_SECRET_KEY が未設定です');
  const res = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sid), {
    method: 'get', headers: { Authorization: 'Bearer ' + sk }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Stripe 応答 ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText());
}

function sendKeyMail_(to, list, en) {
  if (en) return sendKeyMailEn_(to, list);
  const name = prop_('SHOP_MAIL_NAME') || '方位予定帖';
  const lines = list.map(x => '  解錠番号：' + x.key + '\n  有効期限：' + x.expires.replace(/-/g, '/') + ' まで').join('\n\n');
  const body =
    '方位予定帖をお求めいただき、ありがとうございます。\n\n' + lines + '\n\n' +
    '別の端末で使うときは、方位予定帖の「購入・解錠」から上の番号を入れてください。\n' +
    PAGE_URL + '\n\n' +
    '有効期限が過ぎても、書き込んだ予定はそのままお使いいただけます。自動更新はありません。\n\n' +
    'このメールに心当たりのない場合は、お手数ですが破棄してください。\n' +
    '日昇リサーチ株式会社\n';
  MailApp.sendEmail({ to: to, subject: '【方位予定帖】解錠番号のお知らせ', body: body, name: name });
}

// 英語版から買った方へのメール
function sendKeyMailEn_(to, list) {
  const name = prop_('SHOP_MAIL_NAME_EN') || 'Hōi Yotei-chō';
  const lines = list.map(x => '  Unlock code: ' + x.key + '\n  Valid until: ' + x.expires.replace(/-/g, '/') + ' (Japan time)').join('\n\n');
  const body =
    'Thank you for purchasing Hōi Yotei-chō (方位予定帖), the Nine Star Ki planner.\n\n' + lines + '\n\n' +
    'To use it on another device, open Hōi Yotei-chō, choose "Purchase / unlock", and enter the code above.\n' +
    PAGE_URL_EN + '\n\n' +
    'After the code expires, the plans you have written stay where they are and remain usable. There is no automatic renewal.\n\n' +
    'If you did not expect this email, please simply delete it.\n\n' +
    'Nissho Research Co., Ltd. (日昇リサーチ株式会社)\n';
  MailApp.sendEmail({ to: to, subject: '[Hōi Yotei-chō] Your unlock code', body: body, name: name });
}

// 売れたことを三原様にお知らせする（失敗しても購入の処理は止めない）
function notifyOwner_(buyer, price, key, exp, foreign, en) {
  try {
    const to = prop_('OWNER_EMAIL') || 'yymm77@gmail.com';
    const body =
      '方位予定帖が売れました。\n\n' +
      '  日時：' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n' +
      '  金額：' + price + ' 円' + (foreign ? '（外貨払い ' + foreign + '）' : '') + '\n' +
      '  お客様：' + (buyer || '（メールなし）') + '\n' +
      '  解錠番号：' + key + '\n' +
      '  有効期限：' + ymd_(exp).replace(/-/g, '/') + '\n' +
      (en ? '  ページ：英語版（メールも英語で送りました）\n' : '') + '\n' +
      '購入記録：' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '\n';
    MailApp.sendEmail({ to: to, subject: '【方位予定帖】売れました（' + price + '円）', body: body, name: '方位予定帖' });
  } catch (e) { console.error('お知らせメールの送信に失敗', e); }
}

function newKey_(rows) {
  const used = {};
  for (let i = 1; i < rows.length; i++) used[rows[i][0]] = true;
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 見間違えやすい 0/O・1/I を除く
  for (;;) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
    let s = '';
    for (let i = 0; i < 12; i++) s += A[(bytes[i] + 256) % A.length];
    const key = 'HY-' + s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
    if (!used[key]) return key;
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(HEAD); sh.setFrozenRows(1); }
  return sh;
}
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function ymd_(d) { return Utilities.formatDate(new Date(d), 'Asia/Tokyo', 'yyyy-MM-dd'); }

/** 設定の確認用：エディタでこの関数を選んで実行すると、表の作成とキーの有無を確かめます */
function setupCheck() {
  sheet_();
  Logger.log('表：' + SHEET_NAME + ' を用意しました');
  Logger.log('STRIPE_SECRET_KEY：' + (prop_('STRIPE_SECRET_KEY') ? '登録済み' : '未登録'));
  Logger.log('金額：' + (prop_('PRICE_JPY') || '1000（既定）') + ' 円');
}
