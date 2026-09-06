# -*- coding: utf-8 -*-
"""
namemaster_v5.html の改修（2026-09-06）
============================================================
① 内蔵の波形データを 200枚 → 640枚 に差し替える
   このファイルは maki_wave_data.js を読み込んでおらず、
   自前でBase64を内蔵していた（MAKI_OFF=110・200枚）。
   wave-viewer.html 側とは別系統になっていたため、更新が届いていなかった。

② グラフの出自を表示する
   どの記号ペアから、どの画数値で、どの図が引かれたのかを凡例に出す。
      社交（内線）　P–W（37–36）→ 図231
   原本の該当ページを直接引けるようにするため。

③ 縦横比を調整できるようにする
   従来は横幅が常に一定だったため、表示期間を狭めると
   1年あたりの横幅だけが広がり、上下の動きが平べったく見えていた。
   1年あたりの横幅を保つ方式に変え、スライダーで加減できるようにした。
"""
import base64
import json
import re

src = open('namemaster_v5.html', encoding='utf-8').read()
orig_len = len(src)

# ────────────────────────────────────────────
# ① 波形データの差し替え
# ────────────────────────────────────────────
wave = json.load(open('wave640_v8.json'))
OFF = 115
buf = bytearray()
for g in range(1, 641):
    for r in wave[str(g)]:
        for v in (r['hi'], r['lo']):
            b = int(round(v)) + OFF
            assert 0 <= b <= 255, (g, r['age'], v)
            buf.append(b)
b64 = base64.b64encode(bytes(buf)).decode()

src, n = re.subn(r"const MAKI_OFF=\d+,", "const MAKI_OFF=115,", src, count=1)
assert n == 1, 'MAKI_OFF が見つからない'
src, n = re.subn(r"const MAKI_RUNS='[^']*';", "const MAKI_RUNS='1-640';", src, count=1)
assert n == 1, 'MAKI_RUNS が見つからない'
src, n = re.subn(r"const MAKI_WAVE_B64='[^']*';",
                 lambda m: "const MAKI_WAVE_B64='" + b64 + "';", src, count=1)
assert n == 1, 'MAKI_WAVE_B64 が見つからない'
print(f'① 波形データ差し替え　640枚 / Base64 {len(b64):,}文字')

# ────────────────────────────────────────────
# ② 出自の表示
# ────────────────────────────────────────────
# 凡例の枠を広げる
old = "mk('rect',{x:PL+iW-164,y:PT+2,width:164,height:drawable.length*15+6,"
new = "mk('rect',{x:PL+iW-236,y:PT+2,width:236,height:drawable.length*15+6,"
assert old in src
src = src.replace(old, new, 1)

old = """    const sw={x:PL+iW-158,y:lgY-8,width:9,height:9,rx:2,fill:d.color};
    if(d.dash){ sw['fill-opacity']=0.22; sw.stroke=d.color; sw['stroke-width']=1; }
    else      { sw['fill-opacity']=0.88; }
    mk('rect',sw);
    mk('text',{x:PL+iW-145,y:lgY,'font-size':10,fill:'rgba(26,18,8,.6)',
      'font-family':'serif'},
      d.n.replace(/　/g,'')+'　グラフ'+bands[di].graph);
    lgY+=15;"""
new = """    const sw={x:PL+iW-230,y:lgY-8,width:9,height:9,rx:2,fill:d.color};
    if(d.dash){ sw['fill-opacity']=0.22; sw.stroke=d.color; sw['stroke-width']=1; }
    else      { sw['fill-opacity']=0.88; }
    mk('rect',sw);
    // ── 出自を出す ──
    // どの記号ペアから、どの画数値で、どの図が引かれたのかを示す。
    // 原本の該当ページを直接引けるようにするため。
    mk('text',{x:PL+iW-217,y:lgY,'font-size':10,fill:'rgba(26,18,8,.6)',
      'font-family':'serif'},
      d.n.replace(/　/g,'')+'　'+originLabel(d,pts)+'→ 図'+bands[di].graph);
    lgY+=15;"""
assert old in src
src = src.replace(old, new, 1)

# 未収録・該当なしの注記にも出自を入れる
old = """    const msg=b.status==='未取得'
      ? d.n+'　組合せ'+b.key+'（グラフ'+b.graph+'）── グラフ未収録'
      : d.n+'　組合せ'+b.key+' ── 原典に該当なし';"""
new = """    const msg=b.status==='未取得'
      ? d.n+'　'+originLabel(d,pts)+'→ 図'+b.graph+'　── グラフ未収録'
      : d.n+'　'+originLabel(d,pts)+'── 原典に該当なし';"""
assert old in src
src = src.replace(old, new, 1)

# originLabel を drawWave の前に置く
old = "function drawWave(pts,graphOriginYear,graphBirthAge){"
new = """// ── グラフの出自を一行で表す ──
// 例：P–W（37–36）
// 記号は原典の計算シートの記号、括弧内はその人の画数値。
// この二つの数を索引で引いた結果が図番号になる。
function originLabel(d, pts){
  const sy = (d.sym||'').split('+');
  const a = pts[d.ka], b = pts[d.kb];
  const s = (sy.length===2 ? sy[0]+'–'+sy[1] : (d.ka+'–'+d.kb));
  return s + '（' + a + '–' + b + '）';
}

function drawWave(pts,graphOriginYear,graphBirthAge){"""
assert old in src
src = src.replace(old, new, 1)
print('② 出自の表示　凡例と注記に「記号（画数値）→ 図番号」を追加')

# ────────────────────────────────────────────
# ③ 縦横比の調整
# ────────────────────────────────────────────
old = """  const W=800,H=330,PL=52,PR=18,PT=30,PB=62;
  const iW=W-PL-PR,iH=H-PT-PB;

  const dispStart=Math.max(AGE_START,Math.min(viewAgeStart,AGE_OBSERVED-1));
  const dispEnd=Math.max(dispStart+1,Math.min(viewAgeEnd,AGE_OBSERVED));
  const span=dispEnd-dispStart;"""
new = """  const H=330,PL=52,PR=18,PT=30,PB=62;
  const iH=H-PT-PB;

  const dispStart=Math.max(AGE_START,Math.min(viewAgeStart,AGE_OBSERVED-1));
  const dispEnd=Math.max(dispStart+1,Math.min(viewAgeEnd,AGE_OBSERVED));
  const span=dispEnd-dispStart;

  // ── 1年あたりの横幅（縦横比を決める）──
  // 従来は横幅を800pxに固定していたため、表示期間を狭めると
  // 1年あたりの横幅だけが広がり、上下の動きが平べったく見えていた。
  // 原典は40年ぶんを一定の密度で刷っているので、その密度に合わせる。
  // 40年で730px＝1年あたり18.25px。これを基準とし、
  // 期間が短いときも1年あたりの横幅が広がりすぎないよう上限をかける。
  const ppyAuto=Math.max(16,Math.min(30,730/span));
  const ppy=(waveAspect==='auto')?ppyAuto
           :(waveAspect==='full')?(730/span)
           :Number(waveAspect);
  const iW=Math.round(span*ppy);
  const W=PL+iW+PR;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  svg.setAttribute('width',Math.round(W*waveZoom));
  svg.setAttribute('height',Math.round(H*waveZoom));"""
assert old in src
src = src.replace(old, new, 1)

# 状態変数
old = "let viewAgeStart=15,viewAgeEnd=55;"
new = """let viewAgeStart=15,viewAgeEnd=55;
// 縦横比：'auto'＝1年あたりの横幅を原典の密度に合わせる
//         'full'＝従来どおり幅いっぱいに広げる
//         数値   ＝1年あたりの横幅をpxで直に指定
let waveAspect='auto';
let waveZoom=1;"""
assert old in src
src = src.replace(old, new, 1)

# 操作UI（表示期間の行のすぐ下に置く）
old = """      <div class="graph-container">
        <svg id="wave-svg" width="100%" viewBox="0 0 800 330" preserveAspectRatio="xMidYMid meet"></svg>
      </div>"""
new = """      <!-- 縦横比 -->
      <div class="age-preset-row" id="aspect-row">
        <span class="ar-label">縦横比</span>
        <button class="ar-preset active" data-asp="auto" onclick="setAspect(this)">自動（原典の密度）</button>
        <button class="ar-preset" data-asp="full" onclick="setAspect(this)">幅いっぱい</button>
        <span class="ar-label" style="font-size:10px;margin-left:10px">拡大</span>
        <input type="range" id="ar-zoom" min="70" max="220" value="100" step="5" class="ar-slider" style="width:120px">
        <span class="ar-val" id="ar-zoom-val">1.00倍</span>
      </div>
      <div class="graph-container">
        <svg id="wave-svg" viewBox="0 0 800 330" preserveAspectRatio="xMidYMid meet"></svg>
      </div>"""
assert old in src
src = src.replace(old, new, 1)

# 操作の中身。既存のスライダー初期化のそばに置く
anchor = "function selectDomain(base){"
add = """// ── 縦横比の操作 ──
function setAspect(btn){
  document.querySelectorAll('#aspect-row .ar-preset').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  waveAspect=btn.dataset.asp;
  if(lastPts) drawWave(lastPts,lastOriginYear,lastBirthAge);
}
(function(){
  const z=document.getElementById('ar-zoom');
  if(!z) return;
  z.addEventListener('input',()=>{
    waveZoom=z.value/100;
    document.getElementById('ar-zoom-val').textContent=waveZoom.toFixed(2)+'倍';
    if(lastPts) drawWave(lastPts,lastOriginYear,lastBirthAge);
  });
})();

function selectDomain(base){"""
assert anchor in src
src = src.replace(anchor, add, 1)
print('③ 縦横比　1年あたりの横幅を保つ方式に変更。自動／幅いっぱい／拡大スライダー')

# 説明文も直す
old = "上のタブで分野を切り替えると、その分野の内線・外線の2枚を突き合わせて表示します"
new = "上のタブで分野を切り替えると、その分野の内線・外線の2枚を突き合わせて表示します。凡例には、その図がどの記号ペアから引かれたかを示しています"
assert old in src
src = src.replace(old, new, 1)

open('namemaster_v5.html', 'w', encoding='utf-8').write(src)
print(f'\n書き出し完了　{orig_len:,} → {len(src):,} バイト')
