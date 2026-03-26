/**
 * keiri-storage.js
 * AI経理アシスタント — データ永続保存モジュール
 * GitHub Gist API を使ってブラウザをまたいでデータを保存する
 * file-vault.html と同じ仕組み（Personal Access Token方式）
 */

const KS = (() => {

  const GIST_FILENAME = 'keiri_data.json';
  const PROFILE_KEY   = 'keiri_profile';
  const TOKEN_KEY     = 'keiri_gist_token';
  const GIST_ID_KEY   = 'keiri_gist_id';

  /* ===== トークン管理 ===== */
  function getToken()  { return localStorage.getItem(TOKEN_KEY) || ''; }
  function getGistId() { return localStorage.getItem(GIST_ID_KEY) || ''; }

  function setToken(token)   { localStorage.setItem(TOKEN_KEY, token); }
  function setGistId(id)     { localStorage.setItem(GIST_ID_KEY, id); }

  function isConfigured() { return !!(getToken() && getGistId()); }

  /* ===== Gist API 共通ヘッダ ===== */
  function headers() {
    return {
      'Authorization': 'token ' + getToken(),
      'Content-Type':  'application/json',
      'Accept':        'application/vnd.github+json',
    };
  }

  /* ===== Gistからデータ全体を取得 ===== */
  async function fetchAll() {
    if (!isConfigured()) return null;
    const res = await fetch(`https://api.github.com/gists/${getGistId()}`, { headers: headers() });
    if (!res.ok) throw new Error('Gist取得失敗: ' + res.status);
    const gist = await res.json();
    const raw  = gist.files?.[GIST_FILENAME]?.content || '{}';
    return JSON.parse(raw);
  }

  /* ===== Gistにデータ全体を書き込み ===== */
  async function saveAll(data) {
    if (!isConfigured()) throw new Error('Gistが未設定です');
    const res = await fetch(`https://api.github.com/gists/${getGistId()}`, {
      method:  'PATCH',
      headers: headers(),
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } }
      })
    });
    if (!res.ok) throw new Error('Gist保存失敗: ' + res.status);
    return true;
  }

  /* ===== Gistを新規作成（初回） ===== */
  async function createGist(token) {
    const res = await fetch('https://api.github.com/gists', {
      method:  'POST',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: '日昇リサーチ AI経理アシスタント データ',
        public: false,
        files: { [GIST_FILENAME]: { content: JSON.stringify({ entries: [], created_at: new Date().toISOString() }) } }
      })
    });
    if (!res.ok) throw new Error('Gist作成失敗: ' + res.status);
    const gist = await res.json();
    return gist.id;
  }

  /* ===== 仕分けエントリを追加 ===== */
  async function addEntry(entry) {
    const data = await fetchAll() || { entries: [] };
    if (!data.entries) data.entries = [];
    entry.id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    entry.saved_at = new Date().toISOString();
    data.entries.push(entry);
    data.updated_at = new Date().toISOString();
    await saveAll(data);
    return entry;
  }

  /* ===== エントリ一覧を取得 ===== */
  async function getEntries(filter = {}) {
    const data = await fetchAll();
    let entries = data?.entries || [];
    if (filter.year)  entries = entries.filter(e => (e.date || '').startsWith(filter.year));
    if (filter.month) entries = entries.filter(e => (e.date || '').startsWith(filter.month));
    if (filter.entity) entries = entries.filter(e => e.entity === filter.entity);
    if (filter.type)   entries = entries.filter(e => e.type === filter.type);
    return entries;
  }

  /* ===== 月次サマリーを取得 ===== */
  async function getMonthlySummary(yearMonth) {
    const entries = await getEntries({ month: yearMonth });
    const income  = entries.filter(e => e.type === '収入').reduce((s, e) => s + (e.amount || 0), 0);
    const expense = entries.filter(e => e.type === '支出').reduce((s, e) => s + (e.amount || 0), 0);
    const byCategory = {};
    entries.forEach(e => {
      const cat = e.category || '未分類';
      byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
    });
    return { yearMonth, income, expense, balance: income - expense, count: entries.length, byCategory };
  }

  /* ===== 初回セットアップ（UIから呼ぶ） ===== */
  async function setup(token) {
    setToken(token);
    const id = await createGist(token);
    setGistId(id);
    return id;
  }

  /* ===== 設定をリセット ===== */
  function reset() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GIST_ID_KEY);
  }

  return { isConfigured, setup, reset, addEntry, getEntries, getMonthlySummary, fetchAll, getToken, getGistId };
})();
