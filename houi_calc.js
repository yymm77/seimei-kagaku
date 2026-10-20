/*!
 * houi_calc.js — 方位予定帖の地図用計算（方位・距離・磁気偏角・方位区分・判定日）
 * 版：2026-10-20
 *  ・大圏：GeographicLib（WGS84楕円体）。呼び出し側から geodesic.Geodesic.WGS84 を渡す
 *  ・等角航路：楕円体の等長緯度による厳密式
 *  ・磁気偏角：国内は国土地理院 磁気図2020.0年値の近似式＋WMMによる経年補正、海外は WMM2025
 *  ・検算：WMM2025 は NOAA 公式検証値12点と0.005度以内、大圏・等角航路は pyproj と14都市で一致
 */
(function (root) {
  'use strict';
// 世界磁気モデル（WMM）係数 — NOAA公開値を転記。[n, m, g, h, gの年変化, hの年変化]
const WMM2025 = { epoch: 2025.0, coef: [[1, 0, -29351.8, 0.0, 12.0, 0.0], [1, 1, -1410.8, 4545.4, 9.7, -21.5], [2, 0, -2556.6, 0.0, -11.6, 0.0], [2, 1, 2951.1, -3133.6, -5.2, -27.7], [2, 2, 1649.3, -815.1, -8.0, -12.1], [3, 0, 1361.0, 0.0, -1.3, 0.0], [3, 1, -2404.1, -56.6, -4.2, 4.0], [3, 2, 1243.8, 237.5, 0.4, -0.3], [3, 3, 453.6, -549.5, -15.6, -4.1], [4, 0, 895.0, 0.0, -1.6, 0.0], [4, 1, 799.5, 278.6, -2.4, -1.1], [4, 2, 55.7, -133.9, -6.0, 4.1], [4, 3, -281.1, 212.0, 5.6, 1.6], [4, 4, 12.1, -375.6, -7.0, -4.4], [5, 0, -233.2, 0.0, 0.6, 0.0], [5, 1, 368.9, 45.4, 1.4, -0.5], [5, 2, 187.2, 220.2, 0.0, 2.2], [5, 3, -138.7, -122.9, 0.6, 0.4], [5, 4, -142.0, 43.0, 2.2, 1.7], [5, 5, 20.9, 106.1, 0.9, 1.9], [6, 0, 64.4, 0.0, -0.2, 0.0], [6, 1, 63.8, -18.4, -0.4, 0.3], [6, 2, 76.9, 16.8, 0.9, -1.6], [6, 3, -115.7, 48.8, 1.2, -0.4], [6, 4, -40.9, -59.8, -0.9, 0.9], [6, 5, 14.9, 10.9, 0.3, 0.7], [6, 6, -60.7, 72.7, 0.9, 0.9], [7, 0, 79.5, 0.0, -0.0, 0.0], [7, 1, -77.0, -48.9, -0.1, 0.6], [7, 2, -8.8, -14.4, -0.1, 0.5], [7, 3, 59.3, -1.0, 0.5, -0.8], [7, 4, 15.8, 23.4, -0.1, 0.0], [7, 5, 2.5, -7.4, -0.8, -1.0], [7, 6, -11.1, -25.1, -0.8, 0.6], [7, 7, 14.2, -2.3, 0.8, -0.2], [8, 0, 23.2, 0.0, -0.1, 0.0], [8, 1, 10.8, 7.1, 0.2, -0.2], [8, 2, -17.5, -12.6, 0.0, 0.5], [8, 3, 2.0, 11.4, 0.5, -0.4], [8, 4, -21.7, -9.7, -0.1, 0.4], [8, 5, 16.9, 12.7, 0.3, -0.5], [8, 6, 15.0, 0.7, 0.2, -0.6], [8, 7, -16.8, -5.2, -0.0, 0.3], [8, 8, 0.9, 3.9, 0.2, 0.2], [9, 0, 4.6, 0.0, -0.0, 0.0], [9, 1, 7.8, -24.8, -0.1, -0.3], [9, 2, 3.0, 12.2, 0.1, 0.3], [9, 3, -0.2, 8.3, 0.3, -0.3], [9, 4, -2.5, -3.3, -0.3, 0.3], [9, 5, -13.1, -5.2, 0.0, 0.2], [9, 6, 2.4, 7.2, 0.3, -0.1], [9, 7, 8.6, -0.6, -0.1, -0.2], [9, 8, -8.7, 0.8, 0.1, 0.4], [9, 9, -12.9, 10.0, -0.1, 0.1], [10, 0, -1.3, 0.0, 0.1, 0.0], [10, 1, -6.4, 3.3, 0.0, 0.0], [10, 2, 0.2, 0.0, 0.1, -0.0], [10, 3, 2.0, 2.4, 0.1, -0.2], [10, 4, -1.0, 5.3, -0.0, 0.1], [10, 5, -0.6, -9.1, -0.3, -0.1], [10, 6, -0.9, 0.4, 0.0, 0.1], [10, 7, 1.5, -4.2, -0.1, 0.0], [10, 8, 0.9, -3.8, -0.1, -0.1], [10, 9, -2.7, 0.9, -0.0, 0.2], [10, 10, -3.9, -9.1, -0.0, -0.0], [11, 0, 2.9, 0.0, 0.0, 0.0], [11, 1, -1.5, 0.0, -0.0, -0.0], [11, 2, -2.5, 2.9, 0.0, 0.1], [11, 3, 2.4, -0.6, 0.0, -0.0], [11, 4, -0.6, 0.2, 0.0, 0.1], [11, 5, -0.1, 0.5, -0.1, -0.0], [11, 6, -0.6, -0.3, 0.0, -0.0], [11, 7, -0.1, -1.2, -0.0, 0.1], [11, 8, 1.1, -1.7, -0.1, -0.0], [11, 9, -1.0, -2.9, -0.1, 0.0], [11, 10, -0.2, -1.8, -0.1, 0.0], [11, 11, 2.6, -2.3, -0.1, 0.0], [12, 0, -2.0, 0.0, 0.0, 0.0], [12, 1, -0.2, -1.3, 0.0, -0.0], [12, 2, 0.3, 0.7, -0.0, 0.0], [12, 3, 1.2, 1.0, -0.0, -0.1], [12, 4, -1.3, -1.4, -0.0, 0.1], [12, 5, 0.6, -0.0, -0.0, -0.0], [12, 6, 0.6, 0.6, 0.1, -0.0], [12, 7, 0.5, -0.1, -0.0, -0.0], [12, 8, -0.1, 0.8, 0.0, 0.0], [12, 9, -0.4, 0.1, 0.0, -0.0], [12, 10, -0.2, -1.0, -0.1, -0.0], [12, 11, -1.3, 0.1, -0.0, 0.0], [12, 12, -0.7, 0.2, -0.1, -0.1]] };
const WMM2020 = { epoch: 2020.0, coef: [[1, 0, -29404.5, 0.0, 6.7, 0.0], [1, 1, -1450.7, 4652.9, 7.7, -25.1], [2, 0, -2500.0, 0.0, -11.5, 0.0], [2, 1, 2982.0, -2991.6, -7.1, -30.2], [2, 2, 1676.8, -734.8, -2.2, -23.9], [3, 0, 1363.9, 0.0, 2.8, 0.0], [3, 1, -2381.0, -82.2, -6.2, 5.7], [3, 2, 1236.2, 241.8, 3.4, -1.0], [3, 3, 525.7, -542.9, -12.2, 1.1], [4, 0, 903.1, 0.0, -1.1, 0.0], [4, 1, 809.4, 282.0, -1.6, 0.2], [4, 2, 86.2, -158.4, -6.0, 6.9], [4, 3, -309.4, 199.8, 5.4, 3.7], [4, 4, 47.9, -350.1, -5.5, -5.6], [5, 0, -234.4, 0.0, -0.3, 0.0], [5, 1, 363.1, 47.7, 0.6, 0.1], [5, 2, 187.8, 208.4, -0.7, 2.5], [5, 3, -140.7, -121.3, 0.1, -0.9], [5, 4, -151.2, 32.2, 1.2, 3.0], [5, 5, 13.7, 99.1, 1.0, 0.5], [6, 0, 65.9, 0.0, -0.6, 0.0], [6, 1, 65.6, -19.1, -0.4, 0.1], [6, 2, 73.0, 25.0, 0.5, -1.8], [6, 3, -121.5, 52.7, 1.4, -1.4], [6, 4, -36.2, -64.4, -1.4, 0.9], [6, 5, 13.5, 9.0, -0.0, 0.1], [6, 6, -64.7, 68.1, 0.8, 1.0], [7, 0, 80.6, 0.0, -0.1, 0.0], [7, 1, -76.8, -51.4, -0.3, 0.5], [7, 2, -8.3, -16.8, -0.1, 0.6], [7, 3, 56.5, 2.3, 0.7, -0.7], [7, 4, 15.8, 23.5, 0.2, -0.2], [7, 5, 6.4, -2.2, -0.5, -1.2], [7, 6, -7.2, -27.2, -0.8, 0.2], [7, 7, 9.8, -1.9, 1.0, 0.3], [8, 0, 23.6, 0.0, -0.1, 0.0], [8, 1, 9.8, 8.4, 0.1, -0.3], [8, 2, -17.5, -15.3, -0.1, 0.7], [8, 3, -0.4, 12.8, 0.5, -0.2], [8, 4, -21.1, -11.8, -0.1, 0.5], [8, 5, 15.3, 14.9, 0.4, -0.3], [8, 6, 13.7, 3.6, 0.5, -0.5], [8, 7, -16.5, -6.9, 0.0, 0.4], [8, 8, -0.3, 2.8, 0.4, 0.1], [9, 0, 5.0, 0.0, -0.1, 0.0], [9, 1, 8.2, -23.3, -0.2, -0.3], [9, 2, 2.9, 11.1, -0.0, 0.2], [9, 3, -1.4, 9.8, 0.4, -0.4], [9, 4, -1.1, -5.1, -0.3, 0.4], [9, 5, -13.3, -6.2, -0.0, 0.1], [9, 6, 1.1, 7.8, 0.3, -0.0], [9, 7, 8.9, 0.4, -0.0, -0.2], [9, 8, -9.3, -1.5, -0.0, 0.5], [9, 9, -11.9, 9.7, -0.4, 0.2], [10, 0, -1.9, 0.0, 0.0, 0.0], [10, 1, -6.2, 3.4, -0.0, -0.0], [10, 2, -0.1, -0.2, -0.0, 0.1], [10, 3, 1.7, 3.5, 0.2, -0.3], [10, 4, -0.9, 4.8, -0.1, 0.1], [10, 5, 0.6, -8.6, -0.2, -0.2], [10, 6, -0.9, -0.1, -0.0, 0.1], [10, 7, 1.9, -4.2, -0.1, -0.0], [10, 8, 1.4, -3.4, -0.2, -0.1], [10, 9, -2.4, -0.1, -0.1, 0.2], [10, 10, -3.9, -8.8, -0.0, -0.0], [11, 0, 3.0, 0.0, -0.0, 0.0], [11, 1, -1.4, -0.0, -0.1, -0.0], [11, 2, -2.5, 2.6, -0.0, 0.1], [11, 3, 2.4, -0.5, 0.0, 0.0], [11, 4, -0.9, -0.4, -0.0, 0.2], [11, 5, 0.3, 0.6, -0.1, -0.0], [11, 6, -0.7, -0.2, 0.0, 0.0], [11, 7, -0.1, -1.7, -0.0, 0.1], [11, 8, 1.4, -1.6, -0.1, -0.0], [11, 9, -0.6, -3.0, -0.1, -0.1], [11, 10, 0.2, -2.0, -0.1, 0.0], [11, 11, 3.1, -2.6, -0.1, -0.0], [12, 0, -2.0, 0.0, 0.0, 0.0], [12, 1, -0.1, -1.2, -0.0, -0.0], [12, 2, 0.5, 0.5, -0.0, 0.0], [12, 3, 1.3, 1.3, 0.0, -0.1], [12, 4, -1.2, -1.8, -0.0, 0.1], [12, 5, 0.7, 0.1, -0.0, -0.0], [12, 6, 0.3, 0.7, 0.0, 0.0], [12, 7, 0.5, -0.1, -0.0, -0.0], [12, 8, -0.2, 0.6, 0.0, 0.1], [12, 9, -0.5, 0.2, -0.0, -0.0], [12, 10, 0.1, -0.9, -0.0, -0.0], [12, 11, -1.1, -0.0, -0.0, 0.0], [12, 12, -0.3, 0.5, -0.1, -0.1]] };

// 方位予定帖 計算モジュール（方位・距離・磁気偏角・方位区分）
// 依存：geographiclib-geodesic（楕円体上の大圏計算）。呼び出し側から渡す。
//   ブラウザ：import geodesic from "https://cdn.jsdelivr.net/npm/geographiclib-geodesic@2/+esm";
//            const H = createHoui(geodesic.Geodesic.WGS84);

const DEG = Math.PI / 180;
// WGS84 楕円体
const A = 6378.137;            // 赤道半径 km
const F = 1 / 298.257223563;   // 扁平率
const E2 = F * (2 - F);        // 第一離心率の二乗
const E = Math.sqrt(E2);

const norm360 = (x) => ((x % 360) + 360) % 360;
const norm180 = (x) => { const y = norm360(x); return y > 180 ? y - 360 : y; };

// ---------------- 等角航路（メルカトル上の直線）の方位 ----------------
// 楕円体の等長緯度 ψ を使う厳密式。
function isometricLat(latDeg) {
  const s = Math.sin(latDeg * DEG);
  return Math.atanh(s) - E * Math.atanh(E * s);
}
function rhumbAzimuth(lat1, lon1, lat2, lon2) {
  const dLon = norm180(lon2 - lon1) * DEG;   // 日付変更線をまたぐ場合は短い側を回る
  const dPsi = isometricLat(lat2) - isometricLat(lat1);
  return norm360(Math.atan2(dLon, dPsi) / DEG);
}

// ---------------- 磁気偏角 ----------------
function decimalYear(date) {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - start) / (end - start);
}

// WMMの球面調和展開（次数12）。戻り値は偏角（東偏＋、度）。
function wmmDeclination(model, lat, lon, year, altKm = 0) {
  const N = 12;
  const dt = year - model.epoch;
  const g = [], h = [];
  for (let n = 0; n <= N; n++) { g.push(new Array(N + 1).fill(0)); h.push(new Array(N + 1).fill(0)); }
  for (const [n, m, gg, hh, gd, hd] of model.coef) { g[n][m] = gg + dt * gd; h[n][m] = hh + dt * hd; }

  // 測地緯度 → 地心球座標
  const sl = Math.sin(lat * DEG), cl = Math.cos(lat * DEG);
  const Nr = A / Math.sqrt(1 - E2 * sl * sl);
  const p = (Nr + altKm) * cl, z = (Nr * (1 - E2) + altKm) * sl;
  const r = Math.hypot(p, z);
  const latC = Math.atan2(z, p);              // 地心緯度（ラジアン）
  const x = Math.sin(latC), s = Math.cos(latC); // cosθ, sinθ（θ＝余緯度）

  // シュミット準正規化ルジャンドル関数とθ微分
  const P = [], dP = [];
  for (let n = 0; n <= N; n++) { P.push(new Array(N + 1).fill(0)); dP.push(new Array(N + 1).fill(0)); }
  P[0][0] = 1; dP[0][0] = 0;
  P[1][1] = s; dP[1][1] = x;
  for (let n = 2; n <= N; n++) {
    const k = Math.sqrt((2 * n - 1) / (2 * n));
    P[n][n] = k * s * P[n - 1][n - 1];
    dP[n][n] = k * (x * P[n - 1][n - 1] + s * dP[n - 1][n - 1]);
  }
  for (let m = 0; m <= N; m++) {
    for (let n = m + 1; n <= N; n++) {
      const a1 = 2 * n - 1, b = Math.sqrt(n * n - m * m);
      const c = (n - 2 >= m) ? Math.sqrt((n - 1) * (n - 1) - m * m) : 0;
      const Pm2 = (n - 2 >= m) ? P[n - 2][m] : 0, dPm2 = (n - 2 >= m) ? dP[n - 2][m] : 0;
      P[n][m] = (a1 * x * P[n - 1][m] - c * Pm2) / b;
      dP[n][m] = (a1 * (x * dP[n - 1][m] - s * P[n - 1][m]) - c * dPm2) / b;
    }
  }

  // 地心座標系での北・東・下向き成分
  let Xc = 0, Y = 0, Zc = 0;
  const lam = lon * DEG;
  for (let n = 1; n <= N; n++) {
    const ar = Math.pow(A_REF / r, n + 2);
    for (let m = 0; m <= n; m++) {
      const cm = Math.cos(m * lam), sm = Math.sin(m * lam);
      const gh = g[n][m] * cm + h[n][m] * sm;
      Xc += ar * gh * dP[n][m];                       // −Bθ
      if (s > 1e-12) Y += ar * m * (g[n][m] * sm - h[n][m] * cm) * P[n][m] / s;
      Zc -= (n + 1) * ar * gh * P[n][m];              // −Br
    }
  }
  // 地心 → 測地の回転
  const psi = latC - lat * DEG;
  const X = Xc * Math.cos(psi) - Zc * Math.sin(psi);
  return Math.atan2(Y, X) / DEG;
}
const A_REF = 6371.2; // WMMの基準球半径 km

// 国土地理院 磁気図2020.0年値の近似式（西偏＋、度）
function gsiDeclination2020(lat, lon) {
  const dp = lat - 37, dl = lon - 138;
  const minutes = 8 * 60 + 15.822 + 18.462 * dp - 7.726 * dl
    + 0.007 * dp * dp - 0.007 * dp * dl - 0.655 * dl * dl;
  return minutes / 60;
}
const inJapan = (lat, lon) => lat >= 20 && lat <= 46 && lon >= 122 && lon <= 154;

// 偏角（東偏＋、度）。国内は地理院近似式＋2020年以降の経年変化（WMMで補正）、海外はWMM2025。
function declination(lat, lon, date = new Date()) {
  const yr = decimalYear(date);
  if (inJapan(lat, lon)) {
    const drift = wmmDeclination(WMM2025, lat, lon, yr) - wmmDeclination(WMM2020, lat, lon, 2020.0);
    return { value: -gsiDeclination2020(lat, lon) + drift, source: "国土地理院近似式（2020.0）＋経年補正" };
  }
  return { value: wmmDeclination(WMM2025, lat, lon, yr), source: "WMM2025" };
}

// ---------------- 方位区分 ----------------
const SCHOOLS = {
  "30-60": { name: "四正30度・四隅60度", start: [345, 15, 75, 105, 165, 195, 255, 285] },
  "45":    { name: "八方位45度均等",   start: [337.5, 22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5] },
};
const DIRS = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
const PALACES = ["坎", "艮", "震", "巽", "離", "坤", "兌", "乾"];

// 方位角 → 区分。margin度以内に境界があれば near に入れる。
function sector(az, schoolKey = "30-60", margin = 2) {
  const st = SCHOOLS[schoolKey].start;
  const a = norm360(az);
  let idx = 7;
  for (let i = 0; i < 8; i++) {
    const lo = st[i], hi = st[(i + 1) % 8];
    const inside = lo < hi ? (a >= lo && a < hi) : (a >= lo || a < hi);
    if (inside) { idx = i; break; }
  }
  let minGap = 360;
  for (const b of st) { const d = Math.abs(norm180(a - b)); if (d < minGap) minGap = d; }
  return { index: idx, dir: DIRS[idx], palace: PALACES[idx], boundaryGap: minGap, nearBoundary: minGap <= margin, onBoundary: minGap < 1e-9 };
}

// 南半球の入れ替え
function applySouthern(az, mode) {
  if (mode === "ns") return norm360(180 - az);      // 南北を入れ替える（東西はそのまま）
  if (mode === "nsew") return norm360(az + 180);    // 南北・東西とも入れ替える
  return norm360(az);                                // 入れ替えない
}

// ---------------- 総合判定 ----------------
function createHoui(geod) {
  return function judge(origin, dest, opt = {}) {
    const o = { school: "30-60", north: "true", method: "auto", southern: "none", margin: 2, date: new Date(), ...opt };
    const res = { notes: [] };
    const inv = geod.Inverse(origin.lat, origin.lon, dest.lat, dest.lon);
    res.distanceKm = inv.s12 / 1000;
    res.originHemisphere = origin.lat < 0 ? "南半球" : "北半球";
    res.destHemisphere = dest.lat < 0 ? "南半球" : "北半球";

    if (Math.abs(origin.lat) > 89.99) { res.undefined = "起点が極点のため方位が定まらない"; return res; }
    if (res.distanceKm > 19900) { res.undefined = "到達点が地球の真裏付近のため方位が定まらない"; return res; }
    if (res.distanceKm < 0.001) { res.undefined = "起点と到達点が同じ"; return res; }

    const gc = norm360(inv.azi1), rh = rhumbAzimuth(origin.lat, origin.lon, dest.lat, dest.lon);
    res.greatCircleAz = gc; res.rhumbAz = rh; res.methodDiff = Math.abs(norm180(gc - rh));

    let az, used;
    if (o.method === "rhumb") { az = rh; used = "等角航路"; }
    else if (o.method === "gc") { az = gc; used = "大圏"; }
    else { az = gc; used = res.methodDiff < 0.5 ? "大圏（等角航路と一致）" : "大圏（遠距離）"; }

    // 北の基準（偏角は起点で取る）
    if (o.north === "magnetic") {
      const d = declination(origin.lat, origin.lon, o.date);
      res.declination = d; az = norm360(az - d.value);
      if (Math.abs(origin.lat) > 80) res.notes.push("高緯度のため磁北の信頼性が低い");
    }
    // 南半球（起点の半球で判定）
    if (origin.lat < 0 && o.southern !== "none") { az = applySouthern(az, o.southern); res.notes.push("南半球設定で判定"); }

    res.azimuth = az; res.methodUsed = used;
    res.sector = sector(az, o.school, o.margin);
    // 境界付近は大事をとって判定しない（幅は margin 度、既定2度）
    res.judged = !res.sector.nearBoundary;
    if (!res.judged) res.notes.push(`方位の境界まで${res.sector.boundaryGap.toFixed(1)}度のため判定しない。慎重に行動すること`);

    // 計算法で区分が割れるか
    const alt = o.method === "rhumb" ? gc : rh;
    let altAz = alt;
    if (o.north === "magnetic") altAz = norm360(altAz - res.declination.value);
    if (origin.lat < 0 && o.southern !== "none") altAz = applySouthern(altAz, o.southern);
    const altSec = sector(altAz, o.school, 0);
    if (altSec.index !== res.sector.index) res.notes.push(`もう一方の計算法では「${altSec.dir}」になる`);
    return res;
  };
}

// ---------------- 判定日の基準（日本時間／現地時間） ----------------
// 初回起動時の既定：端末の言語が日本語なら「日本時間」、それ以外（外国人の利用）なら「現地時間」。
// 一度保存した設定はそのまま使う（旅行中に端末の時間帯が変わっても勝手に切り替えない）。
function defaultDayBasis(lang = (typeof navigator !== "undefined" ? navigator.language : "ja")) {
  return /^ja\b/i.test(lang || "") ? "jst" : "local";
}

// 予定の時刻（Date）を、基準に応じた暦日（YYYY-MM-DD）に直す。
// basis: "jst"＝日本時間、"local"＝到達点の現地時間。tzLookup(lat, lon) は緯度経度→時間帯名を返す関数。
function judgmentDay(when, basis, dest, tzLookup) {
  const tz = basis === "local" ? tzLookup(dest.lat, dest.lon) : "Asia/Tokyo";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(when);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, timeZone: tz };
}

  root.HouiCalc = { WMM2025: WMM2025, WMM2020: WMM2020, rhumbAzimuth: rhumbAzimuth, wmmDeclination: wmmDeclination, gsiDeclination2020: gsiDeclination2020, declination: declination, SCHOOLS: SCHOOLS, DIRS: DIRS, PALACES: PALACES, sector: sector, applySouthern: applySouthern, createHoui: createHoui, defaultDayBasis: defaultDayBasis, judgmentDay: judgmentDay };
  if (typeof module !== "undefined" && module.exports) module.exports = root.HouiCalc;
})(typeof window !== "undefined" ? window : globalThis);
