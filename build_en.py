# 英語版 hoi-yotei-en.html を、日本語版 hoi-yotei.html から作る（中身は一つ。訳は hoi_en.js が表示の直前に当てる）
import re, time
src = open('hoi-yotei.html', encoding='utf-8').read()
out = src.replace('<html lang="ja">', '<html lang="en">', 1)
assert '<html lang="en">' in out
out = re.sub(r'<title>[^<]*</title>', '<title>Hōi Yotei-chō — Nine Star Ki Planner</title>', out, count=1)
out = re.sub(r'<meta name="description" content="[^"]*">',
  '<meta name="description" content="A planner that lays each day\'s Nine Star Ki direction chart over your plans. Import your Google or iPhone calendar and check the charts against your own past. Solar terms within one minute of Japan\'s national observatory.">', out, count=1)
v = time.strftime('%Y%m%d%H%M')
# 訳の仕組みは、本文より先に読み込む
out = out.replace('<head>', f'<head>\n<script src="hoi_en.js?v={v}"></script>', 1)
out = out.replace('<a class="lang-link" href="hoi-yotei-en.html" hreflang="en" lang="en" translate="no">English</a>',
                  '<a class="lang-link" href="hoi-yotei.html" hreflang="ja" lang="ja" translate="no">日本語</a>', 1)
out = out.replace('content: "今年";', 'content: "this year";', 1)
# 日本語の解説ページへのリンクには（日本語）と分かるように
assert '<a class="small-link" href="tokusho.html">' in out
out = out.replace('<a class="small-link" href="tokusho.html">', '<a class="small-link" href="tokusho-en.html">', 1)
open('hoi-yotei-en.html', 'w', encoding='utf-8').write(out)
print('hoi-yotei-en.html', len(out))
