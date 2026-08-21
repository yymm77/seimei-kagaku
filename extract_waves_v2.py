# ============================================================
# 牧正人史『姓名（なまえ）』巻末 人生グラフ 抽出プログラム
# ============================================================
# 2026-08-21 版。8枚組の紙面PDFから41年分の帯（hi/lo）を読み取る。
#
# 使い方：
#   pdftoppm -r 300 -gray -png Wave297-360.pdf w/x
#   PAGE_PATTERN を 'w/x-{page}.png' に書き換えて実行
#
# 出力は {図番: [{age, hi, lo} × 41]}。値はゼロ線からの相対値。
#   点数 = 50 + 値 / 2　（ゼロ線からプロット端まで＝50点分＝100単位）
#
# 【この処理で解決済みの障害】── 消さないこと
#   ① 図番号ラベル（「65」等）を棒と誤認 → 幅9px以上の成分を除外
#   ② 目盛の刻みを棒と誤認 → 刻みは幅3px・棒は5px。平均太さで切り分け
#   ③ 枠線の途切れで紙面幅を誤判定 → 9本の枠線から中央値をとる
#   ④ 背の高い棒を枠と誤認 → 枠は必ず紙面の端に接するという条件を追加
#   ⑤ 紙面の傾き → 濃淡のまま回してから二値化する
#      （二値化後に回すと線が痩せて値が変わる。0.55度で縦10pxのずれ）
#   ⑥ 棒が枠と重なり位置の基準が取れない → 目盛の刻みを基準にする
#   ⑦ 枠の上端の線が途切れている紙面で紙面幅を誤判定（297〜360の第4紙面。
#      幅1053pxの紙面を836pxと読み、8枚とも目盛が合わなかった）
#      → 上端1本ではなく、枠線・ゼロ線あわせて十数本の左右端の中央値をとる（frame_lr）
#   ⑧ 図番号ラベルに棒が接触すると一つの塊になり、ラベルごと棒も消える（図343の16歳）
#      → 自動では直せていない。値0が出たら拡大して実測し、手で補うこと。
#      （ラベル区画の横に太い成分だけを先に落とす方法を試したが、
#        字画の縦棒の残りが棒と誤認され、かえって悪化したため採用しない）
import cv2, numpy as np

def skew_angle(bw):
    """紙面の傾き角を求める。枠の横線が行方向にそろう角度を選ぶ。"""
    h,w=bw.shape
    def sc(ang):
        if abs(ang)<1e-9: r=bw
        else:
            M=cv2.getRotationMatrix2D((w/2,h/2),ang,1.0)
            r=cv2.warpAffine(bw,M,(w,h),flags=cv2.INTER_NEAREST,borderValue=0)
        rs=r.sum(axis=1).astype(float)
        return (rs**2).sum()          # 射影プロファイルの鋭さ
    best=(sc(0.0),0.0)
    for a in np.arange(-3.0,3.01,0.25):
        v=sc(float(a))
        if v>best[0]: best=(v,float(a))
    a0=best[1]
    for a in np.arange(a0-0.25,a0+0.251,0.05):
        v=sc(float(a))
        if v>best[0]: best=(v,float(a))
    return best[1]

PAGE_PATTERN='w/x-{page}.png'   # ← 紙面ごとに書き換える

def frame_lr(sub):
    """紙面の左右端を、9本の枠線＋ゼロ線の中央値から決める。
    上端の1本だけを見ると、その線が途切れている紙面（例：297〜360の第4紙面）で
    紙面幅を誤判定する。複数本の中央値をとれば1本の途切れに引きずられない。"""
    h,w=sub.shape
    rr=sub.sum(axis=1)
    cand=np.where(rr>w*0.55)[0]
    if len(cand)==0: return 0,w-1
    grp=[];s=p=cand[0]
    for y in cand[1:]:
        if y<=p+2: p=y
        else: grp.append((s,p)); s=p=y
    grp.append((s,p))
    ab=[]
    for g0,g1 in grp:
        band=sub[max(0,g0-1):g1+2,:].max(axis=0)
        on=np.where(band>0)[0]
        if len(on)==0: continue
        runs=[];a=b=on[0]
        for x in on[1:]:
            if x<=b+30: b=x
            else: runs.append((a,b)); a=b=x
        runs.append((a,b))
        a,b=max(runs,key=lambda r:r[1]-r[0])
        ab.append((a,b))
    if not ab: return 0,w-1
    return int(np.median([a for a,_ in ab])), int(np.median([b for _,b in ab]))

def load(page):
    im=cv2.imread(PAGE_PATTERN.format(page=page),0)
    bw=(im<128).astype(np.uint8)
    ang=skew_angle(bw)
    # 傾きが目立つときだけ補正する。濃淡のまま回して二値化するので線が痩せない。
    if abs(ang)>=0.25:
        h0,w0=im.shape
        M=cv2.getRotationMatrix2D((w0/2,h0/2),ang,1.0)
        im=cv2.warpAffine(im,M,(w0,h0),flags=cv2.INTER_LINEAR,borderValue=255)
        bw=(im<128).astype(np.uint8)
    cs=bw.sum(axis=0); rs=bw.sum(axis=1)
    xs=np.where(cs>50)[0]; ys=np.where(rs>50)[0]
    sub=bw[ys.min():ys.max()+1, xs.min():xs.max()+1]
    # 紙面の外に写り込みがある場合があるので、枠の実寸で切り直す
    a,b=frame_lr(sub)
    return sub[:, a:b+1]

def hruns(rs, w, th):
    cand=np.where(rs>w*th)[0]
    if len(cand)==0: return []
    out=[];s=p=cand[0]
    for y in cand[1:]:
        if y<=p+2: p=y
        else: out.append((s,p)); s=p=y
    out.append((s,p)); return out

def panels(sub):
    """8枚ぶんの (plot上端, plot下端, ゼロ線y) を返す。
    枠線・ゼロ線・目盛線の並びが極めて規則的なので、モデルを当てて局所補正する。"""
    h,w=sub.shape
    rs=sub.sum(axis=1)
    allr=hruns(rs,w,0.55)
    cent=[(a+b)/2.0 for a,b in allr]
    top0=cent[0]
    # 枠以外の線が写り込むことがあるため、8等分に最もよく合う周期を探す
    best=None
    for st in np.arange(190.0, 250.0, 0.05):
        hit=sum(1 for k in range(9) if any(abs(c-(top0+st*k))<5 for c in cent))
        if best is None or hit>best[0]: best=(hit,st)
    step=best[1]
    # 見つかった枠の位置で微調整
    ks=[(k,c) for k in range(9) for c in cent if abs(c-(top0+step*k))<5]
    if len(ks)>=3:
        A=np.array([[k,1.0] for k,_ in ks]); y=np.array([c for _,c in ks])
        step,top0=np.linalg.lstsq(A,y,rcond=None)[0]
    def peak(center, rad):
        a=max(0,int(center-rad)); b=min(h,int(center+rad)+1)
        return a+int(np.argmax(rs[a:b]))
    out=[]
    for k in range(8):
        border=top0+step*k
        zero=peak(border+step*0.447, 12)
        axis=peak(border+step*0.896, 12)
        out.append((int(border)+7, int(axis)-1, int(zero)))
    return out

def clean(sub, pan):
    y0,y1,zy=pan
    plot=sub[y0:y1-1,:].copy()
    ph,w=plot.shape; zrel=zy-y0
    occ=plot.sum(axis=0)
    fr=np.where(occ>ph*0.60)[0]          # 枠が薄い紙面があるので閾値を下げる
    # 枠は必ず紙面の端に接している。背の高い棒を枠と取り違えないための条件。
    left, right = 0, w
    if len(fr):
        runs=[];a=b=fr[0]
        for x in fr[1:]:
            if x<=b+2: b=x
            else: runs.append((a,b)); a=b=x
        runs.append((a,b))
        for a,b in runs:
            if a<12: left=max(left,b+1)
            if b>w-13: right=min(right,a)
    ker=cv2.getStructuringElement(cv2.MORPH_RECT,(41,1))
    plot=cv2.subtract(plot, cv2.morphologyEx(plot,cv2.MORPH_OPEN,ker))
    span=max(1,right-left)
    plot[np.where(plot[:,left:right].sum(axis=1)>span*0.40)[0],:]=0
    # ゼロ線の残り画素を確実に落とす（棒はゼロ線をまたいでも列単位で拾うので問題ない）
    plot[max(0,zrel-1):zrel+2,:]=0
    n,lab,st,_=cv2.connectedComponentsWithStats(plot,8)
    keep=np.zeros_like(plot)
    for i in range(1,n):
        x,y,ww,hh,area=st[i]
        if area<6: continue
        if hh<=2: continue                                     # 線の残り
        if ww>=9 and x<left+95 and y+hh<zrel-4: continue        # 図番号ラベル
        if hh<=30 and y+hh>=ph-8 and area/max(hh,1)<=3.8: continue  # 目盛の刻み（平均太さ3px）
        if hh<=17 and y<=2: continue                            # 枠の残り
        keep[lab==i]=1
    # 枠の列だけを消す（外側を一律に落とすと端の棒まで削れる）
    for a,b in ((0,left),(right,w)):
        for x in range(max(0,a),min(w,b)):
            if occ[x]>ph*0.55: keep[:,x]=0
    return keep, zrel, left, right

def lattice(keep,left,right):
    occ=(keep.sum(axis=0)>0).astype(float)
    best=None
    span0=(right-left)/40.0                # 紙面ごとに縮尺が違うため範囲を可変にする
    for s in np.arange(span0*0.80, span0*1.005, 0.01):
        span=s*40
        hi_o=min(left+span0*1.6, right-span)
        for o in np.arange(max(left,right-span-span0*1.6), hi_o+.01, 0.25):
            xs=(o+s*np.arange(41)).round().astype(int)
            if xs[0]<left or xs[-1]>=right: continue
            hit=sum(1 for x in xs if occ[x-3:x+4].any())
            m=np.zeros(len(occ),bool)
            for x in xs: m[max(0,x-5):x+6]=True
            stray=occ[left:right][~m[left:right]].sum()
            sc=hit-stray*0.3
            if best is None or sc>best[0]: best=(sc,s,o,hit)
    return best



def ticks_of(sub, pan):
    """目盛の刻み（15,20,…,55才の9本）のx中心を拾う"""
    y0,y1,zy=pan
    plot=sub[y0:y1-1,:].copy(); ph,w=plot.shape
    ker=cv2.getStructuringElement(cv2.MORPH_RECT,(41,1))
    plot=cv2.subtract(plot, cv2.morphologyEx(plot,cv2.MORPH_OPEN,ker))
    n,lab,st,cen=cv2.connectedComponentsWithStats(plot,8)
    out=[]
    for i in range(1,n):
        x,y,ww,hh,area=st[i]
        if ww<=5 and 8<=hh<=30 and y+hh>=ph-8 and area/max(hh,1)<=4.2:
            out.append(x+ww/2.0)
    return sorted(out)

def lattice2(keep,left,right,tk):
    """刻みから間隔と起点を決める。足りなければ棒から当てはめる。"""
    occ=(keep.sum(axis=0)>0).astype(float)
    if len(tk)>=5:
        gaps=np.diff(tk)
        g=float(np.median([q for q in gaps if q>0]))
        s=g/5.0
        best=None
        for j in (0,1,2):
            o=tk[0]-5*s*j
            if o<-4: continue
            xs=(o+s*np.arange(41)).round().astype(int)
            if xs[0]<-2 or xs[-1]>=len(occ)+2: continue
            hit=sum(1 for x in xs if occ[max(0,x-3):x+4].any())
            if best is None or hit>best[0]: best=(hit,s,o)
        if best and best[0]>=38: return (best[0],best[1],best[2],best[0])
    return lattice(keep,left,right)

def read(sub,pan,lat=None):
    keep,zrel,l,r=clean(sub,pan)
    if lat is None: sc,s,o,hit=lattice2(keep,l,r,ticks_of(sub,pan))
    else: s,o=lat; hit=None
    rows=[]
    for i in range(41):
        x=o+s*i
        a=int(round(x-s*0.40)); b=int(round(x+s*0.40))+1
        col=keep[:, max(0,a):min(keep.shape[1],b)]
        prof=col.sum(axis=1)
        # 棒は幅5px以上、目盛の刻みは幅3px。行ごとの太さで切り分ける
        ys=np.where(prof>=3)[0]
        if len(ys)==0: ys=np.where(prof>0)[0]
        rows.append((0.0,0.0) if len(ys)==0 else (float(zrel-ys.min()), float(zrel-ys.max())))
    return rows,(s,o),hit,keep,zrel


# ============================================================
# 使用例
# ============================================================
def extract(first_graph, n_pages=8):
    """紙面を順に読み、{図番: 41行} を返す"""
    out={}; issues=[]
    for page in range(1, n_pages+1):
        sub=load(page); pans=panels(sub)
        for k in range(8):
            g=first_graph+(page-1)*8+k
            zr=pans[k][2]-pans[k][0]          # ゼロ線からプロット端までの画素数
            rows,lat,hit,keep,zrel=read(sub,pans[k])
            recs=[{'age':15+i,
                   'hi':round(rows[i][0]*100.0/zr,1),
                   'lo':round(rows[i][1]*100.0/zr,1)} for i in range(41)]
            out[str(g)]=recs
            z=[r['age'] for r in recs if r['hi']==0 and r['lo']==0]
            bad=sum(1 for r in recs if r['hi']<r['lo'])
            if z or bad or hit<40: issues.append((g,page,hit,z,bad))
    return out, issues

# 棒が線に埋もれて読めなかった年に与える最小値
# 232枚・54,323列の実測で、印刷された線の太さは 2px（59.4%が2px）
LINE_PX = 2.0
def fill_missing(recs, zr):
    half = round(LINE_PX*100.0/zr/2, 1)
    for r in recs:
        if r['hi']==0 and r['lo']==0:
            r['hi']=half; r['lo']=-half
    return recs
