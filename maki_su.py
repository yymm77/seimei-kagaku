# -*- coding: utf-8 -*-
"""『結婚姓名占術』巻末数表の抽出（第3版）
   ・マス単位で切り出し、tesseractを一括起動して読む
   ・表の約束事で誤りを自動検出し、設定を変えて読み直す
"""
import numpy as np, subprocess, os, re, shutil
from PIL import Image

BANDS5 = {'ab':(230,405), 1:(455,685), 2:(688,915), 3:(918,1145),
          4:(1148,1375), 5:(1378,1605), 'type':(1615,2360)}
WORK = '/tmp/su'

def load(png):
    a = np.array(Image.open(png).convert('L'))
    return a, (a < 128).astype(np.uint8)

def row_segments(bw, y0, y1, thr=20, minh=25):
    rows = bw.sum(axis=1); segs=[]; s=None
    for y in range(y0, y1):
        if rows[y] > thr and s is None: s=y
        elif rows[y] <= thr and s is not None:
            if y-s >= minh: segs.append((s,y)); 
            s=None
    return segs

def blobs_of(sub):
    cs = sub.sum(axis=0); out=[]; s=None
    for x in range(len(cs)):
        if cs[x] > 0 and s is None: s=x
        elif cs[x] == 0 and s is not None: out.append((s,x)); s=None
    if s is not None: out.append((s,len(cs)))
    return out

def split_asterisk(bw, y0, y1, x0, x1):
    sub = bw[y0:y1, x0:x1]
    if sub.sum() == 0: return False, x0
    bl = blobs_of(sub)
    if len(bl) < 2: return False, x0
    full = np.where(sub.sum(axis=1) > 0)[0]
    top, bot = full[0], full[-1]; H = bot-top+1
    bs, be = bl[0]
    rs = np.where(sub[:, bs:be].sum(axis=1) > 0)[0]
    h = rs[-1]-rs[0]+1
    ast = (h < H*0.90) and (rs[0] > top + H*0.06)
    return ast, (x0 + be if ast else x0)

def batch_ocr(paths, whitelist, psm=7):
    """tesseractを1回だけ起動して複数画像を読む"""
    if not paths: return []
    lst = os.path.join(WORK, 'list.txt')
    with open(lst,'w') as f: f.write('\n'.join(paths)+'\n')
    r = subprocess.run(['tesseract', lst, 'stdout', '-l','eng','--psm',str(psm),
                        '-c','tessedit_char_whitelist='+whitelist],
                       capture_output=True, text=True)
    parts = r.stdout.split('\f')
    out = [p.strip().replace('\n',' ') for p in parts]
    return (out + ['']*len(paths))[:len(paths)]

AGE_RE = re.compile(r'^(\d{2})(?:-(\d{2}))?$')
def age_ok(s):
    t = s.lstrip('*')
    m = AGE_RE.match(t)
    if not m: return False
    a = int(m.group(1))
    if not (17 <= a <= 41): return False
    if m.group(2) and int(m.group(2)) != a+1: return False
    return True

def age_start(s):
    t = s.lstrip('*'); m = AGE_RE.match(t)
    return int(m.group(1)) + (0.5 if m.group(2) else 0)

TYPE_RE = re.compile(r'^[SK][1-5]-[1-3]$')
def fix_types(raw):
    """OCRの崩れを表の約束事で直す。直せないものはNoneを返す"""
    toks = raw.replace('—','-').replace('|','').split()
    out=[]
    for t in toks:
        t = t.strip('.,:;')
        if TYPE_RE.match(t): out.append(t); continue
        m = re.match(r'^([SK59$]?)(\d)-?(\d)$', t)   # S5→55, S→9/$ などの崩れ
        if m:
            head = {'9':'S','5':'S','$':'S','':None}.get(m.group(1), m.group(1))
            if head in ('S','K') and m.group(2) in '12345' and m.group(3) in '123':
                out.append(f'{head}{m.group(2)}-{m.group(3)}'); continue
        out.append(None)
    return out


ORDER = [f'{L}{n}' for L in 'SK' for n in range(1,6)]   # S1..S5,K1..K5 の昇順
def _partial(tok):
    """崩れた字面から (記号候補の集合, 強さ) を作る"""
    if tok is None: return None
    m = re.match(r'^([SK])([1-5])-([1-3])$', tok)
    if m: return ({m.group(1)+m.group(2)}, int(m.group(3)))
    return None

def _partial_raw(tok):
    """fix_typesで直しきれなかった生の字面から候補を作る"""
    t = tok.strip('.,:;|')
    m = re.match(r'^([SK])-([1-3])$', t)          # K-1 … 番号が落ちた
    if m: return ({m.group(1)+str(n) for n in range(1,6)}, int(m.group(2)))
    m = re.match(r'^([1-5])-([1-3])$', t)         # 2-1 … SかKが落ちた
    if m: return ({L+m.group(1) for L in 'SK'}, int(m.group(2)))
    m = re.match(r'^[SK9$]?([1-5])[1-5]?-([1-3])$', t)
    if m: return ({L+m.group(1) for L in 'SK'}, int(m.group(2)))
    return None

def repair_types(cands):
    """二通りの読みを突き合わせ、昇順の約束事で一意に定まるなら復元する"""
    for c in cands:
        if c and None not in c and _ascending(c): return c
    # 生の字面から候補集合を作って、昇順に並ぶ組合せが一つだけなら採る
    for raw in cands:
        if not raw: continue
        parts=[]
        ok=True
        for t in raw:
            p = _partial(t) if t else None
            if p is None: ok=False; break
            parts.append(p)
        if ok and _ascending([list(p[0])[0]+'-'+str(p[1]) for p in parts]):
            return [list(p[0])[0]+'-'+str(p[1]) for p in parts]
    return cands[0] if cands else []

def _ascending(ts):
    try: idx=[ORDER.index(t[:2]) for t in ts]
    except (ValueError, TypeError): return False
    return all(idx[k] < idx[k+1] for k in range(len(idx)-1))


ORDER = [f'{L}{n}' for L in 'SK' for n in range(1,6)]   # S1..S5,K1..K5 の昇順
ALL = set(ORDER)

def cands_of(tok):
    """崩れた字面から (記号の候補集合, 強さ) を作る。読めなければ None"""
    t = tok.strip('.,:;|_').replace('—','-')
    m = re.fullmatch(r'([SK])([1-5])-?([1-3])', t)          # 正しい形
    if m: return ({m.group(1)+m.group(2)}, int(m.group(3)))
    m = re.fullmatch(r'([SK])-([1-3])', t)                  # 番号が落ちた K-1
    if m: return ({m.group(1)+str(n) for n in '12345'}, int(m.group(2)))
    m = re.fullmatch(r'([1-5])-([1-3])', t)                 # S/Kが落ちた 2-1
    if m: return ({L+m.group(1) for L in 'SK'}, int(m.group(2)))
    m = re.fullmatch(r'[SK0-9$]?([1-5])[1-5]?-?([1-3])', t) # 55-1 / 92-2 など
    if m: return ({L+m.group(1) for L in 'SK'}, int(m.group(2)))
    return None

def merge_types(*raws):
    """複数の読みを位置ごとに突き合わせ、昇順の約束事で一意に決まるなら確定する。
       戻り値 (確定した並び or None, 事由)"""
    toks = [r.split() for r in raws if r and r.split()]
    if not toks: return None, '読めず'
    n = max(len(t) for t in toks)
    toks = [t for t in toks if len(t)==n]          # 個数の合う読みだけ使う
    if not toks: return None, '個数不一致'
    slots=[]
    for i in range(n):
        s = None
        for t in toks:
            c = cands_of(t[i])
            if c is None: continue
            s = (c[0], c[1]) if s is None else (s[0] & c[0], s[1] if s[1]==c[1] else None)
        if s is None or not s[0] or s[1] is None: return None, f'{i+1}番目が読めず'
        slots.append(s)
    # 昇順に並ぶ組合せを総当たりで探す
    sols=[]
    def rec(i, prev, acc):
        if len(sols) > 1: return
        if i == n: sols.append(list(acc)); return
        for k in sorted(slots[i][0], key=ORDER.index):
            if ORDER.index(k) > prev:
                acc.append(f'{k}-{slots[i][1]}'); rec(i+1, ORDER.index(k), acc); acc.pop()
    rec(0, -1, [])
    if len(sols) == 1: return sols[0], ''
    return None, ('候補なし' if not sols else '一意に決まらず')

class Cell:
    __slots__=('row','col','y0','y1','x0','x1','ast','val','tries')
    def __init__(self,row,col,y0,y1,x0,x1,ast):
        self.row,self.col=row,col; self.y0,self.y1=y0,y1
        self.x0,self.x1=x0,x1; self.ast=ast; self.val=''; self.tries=0

def crop_save(a, c, pad_y, pad_x, scale, path):
    im = Image.fromarray(a[max(0,c.y0-pad_y):c.y1+pad_y, max(0,c.x0-pad_x):c.x1])
    if scale != 1: im = im.resize((im.width*scale, im.height*scale), Image.LANCZOS)
    im.save(path)

def parse_page(png, bands=BANDS5, nages=5):
    os.makedirs(WORK, exist_ok=True)
    a, bw = load(png); H = a.shape[0]
    segs = row_segments(bw, int(H*0.11), int(H*0.955))
    # 〔A：B〕列
    abp=[]
    for i,(y0,y1) in enumerate(segs):
        p=f'{WORK}/ab{i}.png'; x0,x1=bands['ab']
        Image.fromarray(a[y0-10:y1+10, x0-10:x1]).save(p); abp.append(p)
    abs_ = [t.replace(' ','') for t in batch_ocr(abp, '0123456789:')]
    # 年齢のマス
    cells=[]
    for i,(y0,y1) in enumerate(segs):
        for col in range(1, nages+1):
            x0,x1 = bands[col]
            ast, nx = split_asterisk(bw,y0,y1,x0,x1)
            cells.append(Cell(i,col,y0,y1,nx,x1,ast))
    # 設定を変えながら、約束事に合うまで読み直す
    plans = [(10,10,1),(6,4,2),(14,14,1),(4,2,3),(10,2,2),('full',10,2),('full',6,3)]
    todo = cells
    for (py,px,sc) in plans:
        if not todo: break
        paths=[]; full = (py=='full')
        for k,c in enumerate(todo):
            p=f'{WORK}/c{k}.png'
            if full:
                x0 = bands[c.col][0]
                im = Image.fromarray(a[max(0,c.y0-px):c.y1+px, x0:c.x1])
                im = im.resize((im.width*sc, im.height*sc), Image.LANCZOS); im.save(p)
            else:
                crop_save(a,c,py,px,sc,p)
            paths.append(p)
        res = batch_ocr(paths, '0123456789-*' if full else '0123456789-')
        nxt=[]
        for c,t in zip(todo,res):
            t = t.replace(' ','').lstrip('*').strip('-')
            v = ('*' if c.ast else '')+t
            if age_ok(v): c.val=v
            else:
                c.val = c.val or v; nxt.append(c)
        todo = nxt
    # 性格タイプ列
    tp=[]
    for i,(y0,y1) in enumerate(segs):
        p=f'{WORK}/t{i}.png'; x0,x1=bands['type']
        Image.fromarray(a[y0-10:y1+10, x0-10:x1]).save(p); tp.append(p)
    types = batch_ocr(tp, 'SK0123456789- ')
    tp2=[]
    for i,(y0,y1) in enumerate(segs):
        p=f'{WORK}/u{i}.png'; x0,x1=bands['type']
        im = Image.fromarray(a[y0-8:y1+8, x0-8:x1])
        im = im.resize((im.width*2, im.height*2), Image.LANCZOS); im.save(p); tp2.append(p)
    types2 = batch_ocr(tp2, 'SK0123456789- ')
    rows=[]
    for i,(y0,y1) in enumerate(segs):
        ages=[c.val for c in cells if c.row==i]
        tt, why = merge_types(types[i], types2[i])
        rows.append({'ab':abs_[i], 'ages':ages, 'types':tt, 'type_why':why,
                     'types_raw':types[i]+' || '+types2[i]})
    return rows

def check(rows):
    """約束事に照らして、怪しい行を洗い出す"""
    bad=[]
    for i,r in enumerate(rows):
        why=[]
        if not re.fullmatch(r'\d+:\d+', r['ab']): why.append('A:B')
        for j,v in enumerate(r['ages']):
            if not age_ok(v): why.append(f'年齢({j+1})')
        if all(age_ok(v) for v in r['ages']):
            st=[age_start(v) for v in r['ages']]
            if any(st[k] > st[k+1] for k in range(len(st)-1)): why.append('昇順')
        if not r['types']: why.append('タイプ:'+r.get('type_why',''))
        elif len(r['types'])>4: why.append('タイプ数')
        if why: bad.append((i,r,why))
    return bad
