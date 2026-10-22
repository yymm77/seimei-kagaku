# 易経門の英語版 iching-en.html を、日本語版 iching.html から作る
# 卦と爻のデータは /home/claude/iching_en/en_1..4.json（英訳）から差し込む。
# 書籍に由来する長い解説（h[7]）と「Murphy博士の指針」（book）は英語版には載せない。
import json, re, sys

src = open('iching.html', encoding='utf-8').read()
data = []
for i in range(1, 5):
    data += json.load(open(f'/home/claude/iching_en/en_{i}.json', encoding='utf-8'))
assert len(data) == 64 and [d['num'] for d in data] == list(range(1, 65)), 'データの数か順が違う'
assert all(len(d['lines']) == 6 for d in data)

# もとの爻の並び（陰陽）を日本語版からそのまま使う
def grab(name):
    i = src.index('const ' + name + ' = [')
    j = src.index('[', i); depth = 0
    for k in range(j, len(src)):
        if src[k] == '[': depth += 1
        elif src[k] == ']':
            depth -= 1
            if depth == 0: return i, k + 1
    raise SystemExit(name)

hs, he = grab('HEXAGRAMS')
lines_src = re.findall(r"\[(\d+),'[^']*','[^']*',\[[^\]]*\],(\[[01,]+\])", src[hs:he])
assert len(lines_src) == 64
LN = {int(n): l for n, l in lines_src}

J = lambda s: json.dumps(s, ensure_ascii=False)
hexa = 'const HEXAGRAMS = [\n' + ',\n'.join(
    f"  [{d['num']},{J(d['name'])},{J(d['sub'])},{J(d['keywords'])},{LN[d['num']]},{J(d['judgment'])},{J(d['summary'])},'']"
    for d in data) + '\n]'
ys, ye = grab('YAOCI')
yao = 'const YAOCI = [\n' + ',\n'.join(
    '  [' + ','.join(J({'name': l['name'], 'text': l['text'], 'murphy': l['interp']}) for l in d['lines']) + ']'
    for d in data) + '\n]'
out = src[:hs] + hexa + src[he:ys] + yao + src[ye:]

TRI = {'乾': 'Heaven', '兌': 'Lake', '離': 'Fire', '震': 'Thunder', '巽': 'Wind', '坎': 'Water', '艮': 'Mountain', '坤': 'Earth'}

R = [
    ('<html lang="ja">', '<html lang="en">'),
    ('<title>易経門 — 周易占術ポータル</title>',
     '<title>I Ching Gate — Yarrow-Stalk Divination</title>\n<meta name="description" content="Cast an I Ching hexagram with the traditional yarrow-stalk method and read the classical text with plain English renderings. From Nissho Research, Tokyo.">\n<link rel="alternate" hreflang="ja" href="https://yymm77.github.io/seimei-kagaku/iching.html">'),
    ('const CNT_PAGE = "iching";', 'const CNT_PAGE = "iching_en";'),
    ('👁 本日の訪問 ', '👁 Visits today '), ('名 ／\n  累計 <span id="cnt-visit-total"', ' / total <span id="cnt-visit-total"'),
    ('</span>名&nbsp;&nbsp;｜&nbsp;&nbsp;\n  🔮 本日の判定 ', '</span>&nbsp;&nbsp;|&nbsp;&nbsp;\n  🔮 Readings today '),
    ('</span>件 ／\n  累計 <span id="cnt-judge-total"', '</span> / total <span id="cnt-judge-total"'),
    ('<span id="cnt-judge-total" style="font-weight:700;color:#e0c870;">-</span>件', '<span id="cnt-judge-total" style="font-weight:700;color:#e0c870;">-</span>'),
    ('<div class="site-title">易<span>経</span>門</div>', '<div class="site-title">易<span>経</span>門</div>\n  <div class="site-subtitle" style="letter-spacing:.3em;margin-bottom:4px">I CHING GATE</div>'),
    ('<div class="site-subtitle">周易占術ポータル — 第一分卧法（大衍の数）　<a href="iching-en.html" lang="en" style="color:inherit;letter-spacing:.05em">English</a></div>', '<div class="site-subtitle" style="letter-spacing:.08em">Yarrow-stalk divination (the Great Expansion method) · <a href="iching.html" lang="ja" style="color:inherit">日本語</a></div>'),
    ("onclick=\"showSection('oracle')\">占 卜</button>", "onclick=\"showSection('oracle')\">Cast</button>"),
    ("onclick=\"showSection('matrix')\">六十四卦</button>", "onclick=\"showSection('matrix')\">64 Hexagrams</button>"),
    ("onclick=\"showSection('records')\">記 録</button>", "onclick=\"showSection('records')\">Records</button>"),
    ('<div class="panel-title">問 卜</div>', '<div class="panel-title">Your question</div>'),
    ('placeholder="今日の問いを記してください。\n悩み・状況・問いかけ…\n心の中にある言葉をそのままに。"', 'placeholder="Write today\'s question.\nA worry, a situation, a choice…\nin your own words, just as it is."'),
    ('>　筮　竹　を　立　て　る　</button>', '>Cast the yarrow stalks</button>'),
    ('<div class="panel-title">大衍の数・第一分卧法</div>', '<div class="panel-title">The Great Expansion · yarrow stalks</div>'),
    ('<div class="divination-progress" id="div-progress">第一爻を求めています…</div>', '<div class="divination-progress" id="div-progress">Finding the first line…</div>'),
    ('<div class="panel-title">卦 象</div>', '<div class="panel-title">Hexagram</div>'),
    ('問いを入力して<br>筮竹を立ててください', 'Write your question,<br>then cast the stalks'),
    ('<h4>◈ AI解釈（周易・Dr. Murphy）</h4>', '<h4>◈ Reading</h4>'),
    ('<h2>六十四卦一覧</h2>', '<h2>The 64 Hexagrams</h2>'),
    ('<p>卦をクリックすると詳細を表示します　／　縦：下卦　横：上卦</p>', '<p>Click a hexagram for details · rows: lower trigram · columns: upper trigram</p>'),
    ('<div class="panel-title">占卜の記録</div>', '<div class="panel-title">Your readings</div>'),
    ("alert('問いを入力してください。');", "alert('Please write your question first.');"),
    ("`第${['一','二','三','四','五','六'][i]}爻を求めています…`", "`Finding the ${['first','second','third','fourth','fifth','sixth'][i]} line…`"),
    ("'卦象が定まりました'", "'The hexagram is set'"),
    ("◈ Murphy博士の指針", "◈ Guidance"),
    ("◇ AI解釈：${murphy}", "◇ Meaning: ${murphy}"),
    ("'動爻1つ：この爻辞で判断'", "'One moving line: read this line'"),
    ("'動爻2つ：上位の爻辞を重視'", "'Two moving lines: the upper line leads'"),
    ("'動爻3つ：本卦と之卦の卦辞で判断'", "'Three moving lines: read both judgments'"),
    ("'動爻4つ：之卦の不変爻辞（下位）で判断'", "'Four moving lines: read the lower unchanged line of the resulting hexagram'"),
    ("'動爻5つ：之卦の不変爻辞で判断'", "'Five moving lines: read the unchanged line of the resulting hexagram'"),
    ("'動爻6つ：之卦の卦辞で判断'", "'Six moving lines: read the judgment of the resulting hexagram'"),
    ("【判断方式】${modeLabels[mode]||''}", "How to read: ${modeLabels[mode]||''}"),
    ("第 ${honKua[0]} 卦　${honKua[1]}（${honKua[2]}）", "Hexagram ${honKua[0]} · ${honKua[1]} (${honKua[2]})"),
    ("alt=\"${honKua[1]}卦象図\"", "alt=\"${honKua[1]}\""),
    ("yaoBlock('之卦の卦辞で判断', ", "yaoBlock('Judgment of the resulting hexagram', "),
    ("yaoBlock('本卦の卦辞', ", "yaoBlock('Judgment of the present hexagram', "),
    ("yaoBlock('之卦の卦辞', ", "yaoBlock('Judgment of the resulting hexagram', "),
    ("(isPrimary ? '【主爻】' : '')", "(isPrimary ? ' — main line' : '')"),
    ("yaoBlock('之卦 ' + yao.name, ", "yaoBlock('Resulting hexagram · ' + yao.name, "),
    ('title="クリックで詳細を表示"', 'title="Click for details"'),
    ('<div class="label">本 卦</div>', '<div class="label">Present</div>'),
    ('<div class="label">之 卦</div>', '<div class="label">Resulting</div>'),
    ('<div class="hex-number">第${honKua[0]}卦</div>', '<div class="hex-number">No. ${honKua[0]}</div>'),
    ('<div class="hex-number">第${zhiKua[0]}卦</div>', '<div class="hex-number">No. ${zhiKua[0]}</div>'),
    ("変爻：第${changingLines.join('・')}爻", "Moving lines: ${changingLines.join(', ')}"),
    ('◈ 卦辞（変爻なし・本卦で判断）', '◈ Judgment (no moving lines: read the present hexagram)'),
    ("corner.innerHTML = '上卦→<br>下卦↓';", "corner.innerHTML = 'Upper →<br>Lower ↓';"),
    ('<div style="font-size:0.72rem;letter-spacing:0.35em;color:var(--gold);opacity:0.75;margin-bottom:4px;">第 ${num} 卦</div>',
     '<div style="font-size:0.72rem;letter-spacing:0.35em;color:var(--gold);opacity:0.75;margin-bottom:4px;">Hexagram ${num}</div>'),
    ('alt="${h[1]}卦象図"', 'alt="${h[1]}"'),
    ('<h3>◈ 周易・卦辞（原典）</h3>', '<h3>◈ Judgment (classical text)</h3>'),
    ('<h3>◈ Dr. Murphy 大意</h3>', '<h3>◈ In brief</h3>'),
    ('<h3>◈ 六爻・爻辞一覧</h3>', '<h3>◈ The six lines</h3>'),
    ('◇ AI解釈：${yao.murphy}', '◇ Meaning: ${yao.murphy}'),
    ('<div class="empty-state">まだ記録がありません</div>', '<div class="empty-state">No readings yet</div>'),
    ("const ds = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;", "const ds = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });"),
    ("const zhiStr = r.zhiNum ? ` → 第${r.zhiNum}卦「${HEXAGRAMS[r.zhiNum-1][1]}」` : '';", "const zhiStr = r.zhiNum ? ` → No. ${r.zhiNum} ${HEXAGRAMS[r.zhiNum-1][1]}` : '';"),
    ('<div class="hex-name-row">第${r.hexNum}卦「${r.hexName}」${zhiStr}</div>', '<div class="hex-name-row">No. ${r.hexNum} ${r.hexName}${zhiStr}</div>'),
    ('問：${r.question}<br>', 'Q: ${r.question}<br>'),
    ("JSON.parse(localStorage.getItem('iching_records') || '[]')", "JSON.parse(localStorage.getItem('iching_records_en') || '[]')"),
    ("localStorage.setItem('iching_records', ", "localStorage.setItem('iching_records_en', "),
    ("note.textContent = '方位予定帖から問いを移しました。言葉は自由に直してください。';", "note.textContent = 'Your question was brought over from Hōi Yotei-chō. Feel free to reword it.';"),
]
for a, b in R:
    n = out.count(a)
    if n == 0: raise SystemExit('見つからない: ' + a[:70])
    out = out.replace(a, b)

# 八卦の名に英語を添える
for k, v in TRI.items():
    out = out.replace(f"{{ name:'{k}', symbol:", f"{{ name:'{k} {v}', symbol:")

# 解釈：AIには送らず、組み込みの英語の解釈を出す（外へは何も送らない）
a = out.index('async function callClaudeAPI(')
b = out.index('// ============================\n// 筮竹ビジュアライズ')
out = out[:a] + '''async function callClaudeAPI(question, honKua, zhiKua, changingLines) {
  // 英語版は、問いをどこへも送らず、組み込みの解釈を出す
  const aiText = document.getElementById('ai-text');
  const mode = getJudgmentMode(changingLines);
  let main = honKua[6];
  if (mode === 'one_yao' || mode === 'two_yao') {
    const sorted = mode === 'two_yao' ? [...changingLines].sort((a,b)=>b-a) : [...changingLines];
    const yao = YAOCI[honKua[0]-1][sorted[0]-1];
    if (yao) main = `${yao.name}: ${yao.murphy}`;
  } else if (zhiKua && (mode === 'zhikua_only' || mode === 'zhikua_honkua')) {
    main = `${honKua[6]} Moving toward ${zhiKua[1]}: ${zhiKua[6]}`;
  }
  aiText.classList.remove('typing-cursor');
  aiText.textContent = '';
  const kw = honKua[3].filter(k => k.toLowerCase() !== honKua[1].toLowerCase());
  const text = `${honKua[1]}${kw.length ? ' (' + kw.join(', ') + ')' : ''}. ${main}`;
  for (let i = 0; i < text.length; i++) { aiText.textContent += text[i]; if (i % 3 === 0) await sleep(12); }
}

''' + out[b:]

# 足もと（日本語の案内を英語に）
a = out.index('<footer>'); b = out.index('</footer>') + len('</footer>')
out = out[:a] + '''<footer>
  <div class="footer-inner">
    <div class="footer-links">
      <a href="hoi-yotei-en.html">Hōi Yotei-chō (Nine Star Ki planner)</a>
      <span class="footer-sep">|</span>
      <a href="almanac-batting-average.html">What is your almanac's batting average?</a>
      <span class="footer-sep">|</span>
      <a href="iching.html" lang="ja">日本語</a>
    </div>
    <div class="footer-copy">
      © 2026 Nissho Research Co., Ltd. · I Ching Gate
    </div>
    <div style="margin-top:18px;padding:14px 18px;background:rgba(138,105,20,0.07);border:1px solid rgba(138,105,20,0.2);border-radius:3px;font-size:0.8rem;line-height:1.9;color:var(--ink-light);text-align:left;">
      <div style="font-size:0.8rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:6px;">◈ About this page</div>
      The hexagram is cast with the traditional yarrow-stalk method. Each judgment and line shows the classical Chinese text with our own plain English rendering, and a short note on its meaning. The fuller commentary on the Japanese page draws on published books and is not translated here.<br>
      Your question stays in your browser; it is not sent anywhere.<br><br>
      <span style="opacity:0.7;" lang="ja">生かされて今を存在する</span>
    </div>
  </div>
  <div style="text-align:center;padding:10px 0 4px;font-size:12px;letter-spacing:.05em;">
    <a href="tokusho-en.html" style="color:#b8960c;text-decoration:underline;opacity:.85;">Legal notice</a>
  </div>
  <div class="sun-home" style="text-align:center;margin:18px auto 24px;font-size:14px;letter-spacing:.06em;"><a href="https://yymm77.github.io/" style="color:#b8960c;text-decoration:none;border-bottom:1px solid #b8960c;padding-bottom:2px;">おてんとうさまの下で ｜ Under and With the Sun</a></div>
</footer>''' + out[b:]

open('iching-en.html', 'w', encoding='utf-8').write(out)
print('iching-en.html', len(out))
