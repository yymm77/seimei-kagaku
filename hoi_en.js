// 方位予定帖 英語版（Hōi Yotei-chō — Nine Star Ki Planner）
// 画面の日本語を、表示の直前に英語へ置き換える。使う人が書いた文字（translate="no" の中）には触れない。
// 訳せなかった文字は window.__hoiUntranslated に集め、検算で一つも残らないことを確かめる。
(function () {
  'use strict';
  window.HOI_LANG = 'en';
  const JP = /[぀-ヿ㐀-鿿！-｠、-〿]/;

  // ── 語彙 ─────────────────────────────────────
  const STAR_FULL = { '一白水星': '1 White Water Star', '二黒土星': '2 Black Earth Star', '三碧木星': '3 Jade Wood Star', '四緑木星': '4 Green Wood Star', '五黄土星': '5 Yellow Earth Star', '六白金星': '6 White Metal Star', '七赤金星': '7 Red Metal Star', '八白土星': '8 White Earth Star', '九紫火星': '9 Purple Fire Star' };
  const STAR = { '一白': '1 White', '二黒': '2 Black', '三碧': '3 Jade', '四緑': '4 Green', '五黄': '5 Yellow', '六白': '6 White', '七赤': '7 Red', '八白': '8 White', '九紫': '9 Purple' };
  const DIR = { '北西': 'Northwest', '北東': 'Northeast', '南西': 'Southwest', '南東': 'Southeast', '北': 'North', '南': 'South', '東': 'East', '西': 'West' };
  const LABEL = { '吉': 'Good', '普通': 'Neutral', '吉凶': 'Mixed', '小凶': 'Slightly bad', '凶': 'Bad', '大凶': 'Very bad', '最大凶': 'Severe', '超最大凶': 'Extreme', '普': 'Fair' };
  const HA = { '歳破': 'Year Breaker', '月破': 'Month Breaker', '日破': 'Day Breaker' };
  const BAN = { '年盤': 'Year chart', '月盤': 'Month chart', '日盤': 'Day chart' };
  const ELEM = { '水': 'Water', '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal' };
  const BRANCH = { '子': 'Rat', '丑': 'Ox', '寅': 'Tiger', '卯': 'Rabbit', '辰': 'Dragon', '巳': 'Snake', '午': 'Horse', '未': 'Goat', '申': 'Monkey', '酉': 'Rooster', '戌': 'Dog', '亥': 'Boar' };
  const STEM = { '甲': 'Yang Wood', '乙': 'Yin Wood', '丙': 'Yang Fire', '丁': 'Yin Fire', '戊': 'Yang Earth', '己': 'Yin Earth', '庚': 'Yang Metal', '辛': 'Yin Metal', '壬': 'Yang Water', '癸': 'Yin Water' };
  const TERM = { '小寒': 'Minor Cold', '立春': 'Start of Spring', '啓蟄': 'Awakening of Insects', '清明': 'Clear and Bright', '立夏': 'Start of Summer', '芒種': 'Grain in Ear', '小暑': 'Minor Heat', '立秋': 'Start of Autumn', '白露': 'White Dew', '寒露': 'Cold Dew', '立冬': 'Start of Winter', '大雪': 'Major Snow', '夏至': 'Summer Solstice', '冬至': 'Winter Solstice' };
  const HOL = { '元日': "New Year's Day", '成人の日': 'Coming of Age Day', '建国記念の日': 'National Foundation Day', '天皇誕生日': "Emperor's Birthday", '春分の日': 'Vernal Equinox Day', '昭和の日': 'Showa Day', '憲法記念日': 'Constitution Day', 'みどりの日': 'Greenery Day', 'こどもの日': "Children's Day", '海の日': 'Marine Day', '山の日': 'Mountain Day', '敬老の日': 'Respect for the Aged Day', '秋分の日': 'Autumnal Equinox Day', 'スポーツの日': 'Sports Day', '文化の日': 'Culture Day', '勤労感謝の日': 'Labor Thanksgiving Day', '振替休日': 'Substitute holiday', '国民の休日': 'Citizens’ holiday' };
  const WD = { '日': 'Sun', '月': 'Mon', '火': 'Tue', '水': 'Wed', '木': 'Thu', '金': 'Fri', '土': 'Sat' };
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const LV = { '良': 'good', '並': 'average', 'やや注意': 'caution', '注意': 'high caution' };
  const HOUR = { '子': 'Rat hour', '丑': 'Ox hour', '寅': 'Tiger hour', '卯': 'Rabbit hour', '辰': 'Dragon hour', '巳': 'Snake hour', '午': 'Horse hour', '未': 'Goat hour', '申': 'Monkey hour', '酉': 'Rooster hour', '戌': 'Dog hour', '亥': 'Boar hour' };
  const ORIGIN = { '自宅': 'Home', '勤務先': 'Work', 'その他': 'Other' };
  const md = (m, d) => `${MS[+m - 1]} ${+d}`;
  const star = s => STAR_FULL[s] || STAR[s] || s;
  const dirs = s => s.split('・').map(x => DIR[x] || x).join(' · ');
  const org = s => ORIGIN[s] || s;
  const hol = s => s.split('・').map(x => HOL[x] || (TERM[x] ? TERM[x] : x)).join(' · ');
  const lab = s => s.split('・').map(x => LABEL[x] || HA[x] || x).join(' · ');

  // ── そのまま置き換える文 ─────────────────────────
  const T = {
    '方位予定帖': 'Hōi Yotei-chō', '方位予定帖（自分用）': 'Hōi Yotei-chō (personal)',
    '方位の設定': 'Birth data', '地図・起点': 'Map & origins', '購入・解錠': 'Purchase / unlock', 'カレンダー連携': 'Calendar sync', 'データ': 'Data',
    'はじめに、生年月日を登録してください': 'First, register your date of birth', '生年月日を登録してください': 'Please register your date of birth',
    'ご購入ありがとうございます。最後に、生年月日を登録してください': 'Thank you for your purchase. Finally, register your date of birth',
    '生年月日を登録する': 'Register date of birth', '生まれ時刻：不明': 'Birth time: unknown', '閉じる': 'Close', '登録する': 'Register',
    '（税込）': '(tax included)', '購入する（カード払い）': 'Buy (card payment)', '特定商取引法に基づく表記': 'Legal notice (Japanese)',
    '解錠する': 'Unlock', '解錠番号を忘れたとき': 'Forgot your unlock code?', '番号をメールで受け取る': 'Email me my code',
    '地図と起点': 'Map & origins', '流派（方位の区切り）': 'School (how directions are divided)', '入れ替えない': 'Do not swap',
    '計算法': 'Calculation method', '自動（近くは一致、遠くは大圏）': 'Automatic (same nearby; great circle far away)', '大圏（正距方位）': 'Great circle (azimuthal equidistant)', '等角航路（メルカトル）': 'Rhumb line (Mercator)',
    '境界の近くで判定しない幅（度）': 'No-judgment margin near boundaries (degrees)', '判定日の基準': 'Which date to judge by', '日本時間': 'Japan time', '行き先の現地時間': 'Local time at destination',
    'データの書き出し・読み込み': 'Export / import data', '書き出す': 'Export', '読み込む': 'Import', '取り込む範囲': 'Import range',
    'すべて': 'All', 'これからの予定だけ': 'Upcoming only', 'Google カレンダーと直接やり取りする': 'Connect directly with Google Calendar', 'カレンダーの一覧を読む': 'Load my calendars',
    '選んだカレンダー → 予定帖に取り込む': 'Selected calendars → import', '上の「取り込む範囲」の分を取り込みます': 'Uses the import range above', '送り先': 'Send to', '（主なカレンダー）': '(primary calendar)',
    '予定帖 → Google に送る': 'Planner → send to Google', 'ファイルでやり取りする（Google・Apple）': 'Sync by file (Google · Apple)', '予定帖 → カレンダー用に書き出す': 'Planner → export for calendars',
    'カレンダーから取り込んだ予定は含めない': 'Leave out events imported from calendars', 'カレンダー → 予定帖に取り込む': 'Calendar → import into planner', 'カレンダー側の操作': 'How to do it in your calendar app',
    'Google カレンダーへ入れる': 'Into Google Calendar', 'Google カレンダーから出す': 'Out of Google Calendar', 'アカウントがいくつもある場合': 'If you have several accounts', 'iPhone・Mac のカレンダーへ入れる': 'Into iPhone / Mac Calendar', 'Mac のカレンダーから出す': 'Out of Mac Calendar',
    '年表示': 'Year', '月表示': 'Month', '一覧': 'List', '＋ 新しい予定を追加': '+ Add a new plan', '時刻': 'Time', '繰り返しなし': 'Does not repeat', '毎週': 'Weekly', '毎月': 'Monthly',
    '行き先を選ぶ': 'Choose destination', '行き先：なし': 'Destination: none', '外す': 'Remove', '追加する': 'Add', '暦年を選ぶ': 'Choose a year', '今年': 'This year', '‹ 前年': '‹ Prev year', '翌年 ›': 'Next year ›',
    '‹ 前月': '‹ Prev', '翌月 ›': 'Next ›', '今月': 'Today', '＋': '+', '日盤': 'Day', '月盤': 'Month', '年盤': 'Year', '月盤（購入後）': 'Month (after purchase)', '年盤（購入後）': 'Year (after purchase)',
    '中宮': 'Center', 'この暦の確かさ': 'How accurate is this calendar', '何を加え、どう確かめたかは、': 'What we added and how we verified it is recorded, by date, in the ', '改良の記録': 'improvement log', 'に日付ごとに書き足しています。': ' (Japanese).',
    'ご要望をお聞かせください': 'Tell us what you need', 'ご要望を送る（Google フォーム）': 'Send a request (Google Form)', '方位学のページ': 'Direction-reading page',
    '予定を編集': 'Edit plan', '取消': 'Cancel', '更新する': 'Update', '地点を選ぶ': 'Choose a place', '探す': 'Search', '現在地': 'My location', '座標で決める': 'Use coordinates', 'この地点にする': 'Use this place',
    '生年月日': 'Date of birth', '生まれた時刻': 'Birth time', '例：HY-XXXX-XXXX-XXXX': 'e.g. HY-XXXX-XXXX-XXXX', '解錠番号': 'Unlock code', '購入時のメールアドレス': 'Email used at purchase',
    '表示の切り替え': 'Switch view', '日付': 'Date', '予定のタイトル（必須）': 'Title (required)', '予定のタイトル': 'Title', '開始時刻（任意）': 'Start time (optional)', '終了時刻（任意）': 'End time (optional)',
    '場所（任意）': 'Place (optional)', '場所': 'Place', '繰り返し': 'Repeat', '方位を測る起点': 'Origin for measuring direction', 'メモ（任意）': 'Notes (optional)', 'メモ': 'Notes',
    '前の年': 'Previous year', '次の年': 'Next year', '前の月': 'Previous month', '次の月': 'Next month', 'この日に予定を追加': 'Add a plan on this day', '盤の切り替え': 'Switch chart',
    'タイトル': 'Title', '住所・駅名・建物名・地名（海外も可）': 'Address, station, building or place name (worldwide)', '住所や地名で探す': 'Search by address or place', '地図。押した地点を選びます': 'Map. Tap to choose a place',
    '緯度と経度': 'Latitude and longitude', '自宅': 'Home', '未登録': 'Not set', '勤務先': 'Work', 'その他': 'Other', '三つ目の起点の名前': 'Name of the third origin',
    'ほかの日の方位盤': 'Charts for other days', '今日の盤を見る': "See today's chart", '日盤・陰遁': 'Day chart · yin cycle', '日盤・陽遁': 'Day chart · yang cycle',
    '購入すると吉凶の色と凶方位が出ます': 'Buy to see colours and bad directions', '月盤・年盤は購入後にご覧になれます': 'Month and year charts open after purchase', '生年月日を登録すると吉凶の色が付きます': 'Register your birth date to see colours',
    'Google カレンダーに追加': 'Add to Google Calendar', 'iPhone・Mac などに追加': 'Add to iPhone / Mac etc.', '完了': 'Done', '編集': 'Edit', '削除': 'Delete', '予定を追加': 'Add plan',
    '日付とタイトルを入れてください。': 'Please enter a date and a title.', '完了にする': 'Mark done', '削除する': 'Delete', '元に戻す': 'Undo', '国土地理院': 'GSI Japan', '座標で選んだ地点': 'Place chosen by coordinates', '地図で選んだ地点': 'Place chosen on map', '選んだ地点': 'Chosen place',
    '今後の予定': 'Upcoming', '完了した予定': 'Done', '過去の未完了': 'Past, not done', '今日': 'Today', '戻す': 'Undo', '生年月日を入れてください。': 'Please enter your date of birth.', 'メールアドレスを正しく入れてください。': 'Please enter a valid email address.',
    '背景色': 'Colour', 'なし': 'None', '文字表記': 'Labels', 'あり': 'On', '吉の重なる日': 'Aligned good days', '月・日': 'Month·Day', '年・月・日': 'Year·Month·Day', '吉の重なる日は購入後に使えます': 'Aligned good days open after purchase',
    '「吉」良': '"Good" good', '「普」並': '"Fair" average', '「凶」やや注意': '"Bad" caution', '「大凶」注意': '"Very bad" high caution', '良': 'good', '並': 'average', 'やや注意': 'caution', '注意': 'high caution',
    '本命星': 'Main star', '吉方位：': 'Good directions: ', '凶方位とその理由': 'Bad directions and reasons', '解錠済み': 'Unlocked', '期限切れ': 'Expired', '購入する': 'Buy', '変える': 'Change', '消す': 'Clear',
    '吉の重なる方位': 'Aligned good directions', '削除しますか？': 'Delete this?', 'やめる': 'Keep', '自宅から': 'from Home', '境界のため判定しない': 'Not judged (near a boundary)',
    'この年の吉方位：': ' · Good directions this year: ', '日の色': 'Day colour', '色：八方位の吉凶の平均': 'Colour: average of the eight directions', '凶方位なし': 'No bad directions',
    '時刻は任意です。入れなければ終日の予定になります。': 'Time is optional. Without it, the plan lasts all day.', '← 指で左右にすべらせると、ほかの年が見られます →': '← Swipe sideways to see other years →',
    'この日の予定はありません。上の欄から追加できます。': 'No plans on this day. Add one above.', '予定はまだありません。上の欄に日付とタイトルを入れて「追加する」を押してください。': 'No plans yet. Enter a date and title above and press "Add".',
    '生年月日を登録すると、各方位の吉凶と凶の理由が出ます。': 'Register your birth date to see each direction and the reasons for bad ones.', '生年月日を登録すると、年・月・日の吉凶が色で出ます。': 'Register your birth date to see good and bad years, months and days in colour.',
    '生年月日を登録すると、本命星と月命星を出し、日付ごとの吉方位を表示します。': 'Register your birth date to find your main and month stars and see good directions for every day.',
    '生年月日はこの端末の中にだけ保存し、どこにも送りません。時刻は立春・節入りの当日生まれのときだけ使います。': 'Your birth date stays on this device and is never sent anywhere. Birth time is used only if you were born on the day of Risshun or a solar-term entry.',
    'すべての日の方位盤（日盤・月盤・年盤）と吉凶の色分け、凶の理由': 'Charts for every day (day, month, year), colour-coding and reasons for bad directions',
    '月表示をなぞると付いてくる、星が回る方位盤': 'A chart that follows your pointer and turns the stars as you move across the month',
    '期限が過ぎても、書いた予定はそのまま使えます': 'Your plans stay usable after the term ends',
    'お支払いが済むとこのページに戻り、自動で解錠します。解錠番号はメールでもお送りします。': 'After payment you return to this page and it unlocks automatically. We also email you the unlock code.',
    'お持ちの解錠番号を入れる（別の端末で使うとき）': 'Enter your unlock code (to use on another device)',
    '方位を測る起点を三か所まで登録できます。予定に行き先を付けると、起点からの方位と距離を出し、その日の方位盤の吉凶と合わせて示します。起点と行き先はこの端末の中にだけ保存します。': 'Register up to three origins. When a plan has a destination, the planner shows the direction and distance from the origin together with that day’s chart. Origins and destinations stay on this device.',
    '予定はこの端末のブラウザの中に保存しています。機種変更や別の端末へ移すときは、書き出したファイルを新しい端末で読み込んでください。ブラウザの閲覧履歴を消すと予定も消えることがあるので、ときどき書き出しておくと安心です。': 'Your plans are stored in this browser. To move to another device, export a file and import it there. Clearing browser data can erase plans, so export now and then to be safe.',
    'Google カレンダーや iPhone・Mac のカレンダーの予定を取り込み、予定帖の予定をそちらへ送ります。過去の予定を取り込むと、病気・出会い・合格など、ご自分の歩みの出来事をその日の方位盤と照らし合わせて、確かめることができます。': 'Import events from Google Calendar or iPhone / Mac Calendar, and send your plans back. Import your past, and you can lay the events of your own life — an illness, a meeting, a passed exam — beside that day’s chart and check for yourself.',
    'claude.ai につないである Google カレンダーと、ファイルを使わずに直接やり取りします。': 'Exchange events directly with the Google Calendar connected to claude.ai, without files.',
    'ほかのアカウントのカレンダーも並べるには': 'To list calendars from other accounts',
    'ここで読めるのは、claude.ai につないだ Google アカウントから見えるカレンダーです。ほかのアカウントのカレンダーは、そのアカウントで Google カレンダーを開き、カレンダー名の「︙」→「設定と共有」→「特定のユーザーまたはグループと共有する」に、つないだアカウントのメールアドレスを加えてください。次に「一覧を読む」を押すと並びます。共有しづらいときは、下のファイルでの取り込み（zip をまとめて選ぶ）もお使いいただけます。': 'Only calendars visible to the connected Google account are listed. To add another account’s calendar, open Google Calendar in that account, choose "⋮" → "Settings and sharing" → "Share with specific people or groups", and add the connected account’s email. Then press "Load my calendars". You can also import by file below (select several zips at once).',
    'カレンダー用のファイル（.ics）で受け渡します。Google カレンダーにも、iPhone・Mac のカレンダーにも使えます。': 'Uses calendar files (.ics), which work with Google Calendar and iPhone / Mac Calendar.',
    '：パソコンで Google カレンダーを開き、右上の歯車 →「設定」→「インポート / エクスポート」→「インポート」で、書き出したファイルを選びます。': ': On a computer, open Google Calendar, click the gear → "Settings" → "Import & export" → "Import", and choose the exported file.',
    '：同じ画面の「エクスポート」で zip ファイルが届きます。そのアカウントのカレンダーが全部入っているので、zip のまま予定帖で取り込めます。': ': "Export" on the same screen gives you a zip with all of that account’s calendars. Import the zip as it is — no need to unzip.',
    '：アカウントごとに書き出した zip を、取り込むときにまとめて選んでください（Ctrl キーや ⌘ キーを押しながら選ぶと、いくつも選べます）。どのカレンダーから来た予定かは、予定の横に札で出ます。同じ予定が二つのアカウントに入っていても、一つにまとめます。': ': Export a zip from each account and select them all at once (hold Ctrl or ⌘ to select several). Each event shows a tag with its calendar name. The same event in two accounts is kept only once.',
    '：書き出したファイルを開くと、カレンダーに追加するか尋ねられます。': ': Open the exported file and you will be asked whether to add it to your calendar.',
    '：カレンダーの一覧で書き出したいカレンダーを選び、「ファイル」→「書き出す」→「書き出す」で .ics ができます。iPhone だけをお使いの場合は、iCloud のカレンダーを Mac か Google カレンダーに読み込んでから書き出してください。': ': Select a calendar, then "File" → "Export" → "Export" to make an .ics file. If you only use an iPhone, load your iCloud calendar into a Mac or Google Calendar first and export from there.',
    '日付を押すと、その日の方位盤と予定が下に出ます。日付の枠の右下の「＋」を押すと、その日の予定をその場で書き込めます。日付の横の星はその日の日盤（中宮の星）です。マウスで日付をなぞると、方位盤が付いてきて星が飛泊の順に回ります。': 'Click a date to see its chart and plans below. Press "+" in the corner of a date to add a plan there. The star beside each date is that day’s center star. Move your mouse across the dates and the chart follows, turning its stars along the flying path.',
    '節入り・夏至・冬至の時刻は天文計算で1900〜2100年分を求め、国立天文台『暦要項』と照らして差は1分以内です。': 'Solar-term, solstice times are computed astronomically for 1900–2100 and agree with the National Astronomical Observatory of Japan to within one minute.',
    '方位の吉凶は暮らしの目安としてお使いください。': 'Please use good and bad directions as a guide for daily life.', 'では、地図の上で実際の方位を測ることもできます。': ' lets you measure real directions on a map.',
    '使ってみて欲しくなった機能や、気づいた点をお寄せください。いただいた声をもとに手を入れていきます。': 'Tell us what features you would like or anything you noticed. We improve the planner based on your voice.',
    'そこに、一般の九星気学で誰にとっても凶とされる歳破・月破・日破を加えています（方位表には含まれないため、画面に但し書きを添えています）。': 'On top of that, we add the Year, Month and Day Breakers, which general Nine Star Ki treats as bad for everyone (they are not in that table, so the screen notes it).',
    'は、購入後にご覧になれます。今日の日盤は無料でご覧いただけます。': ' open after purchase. Today’s day chart is free.',
    'ドラッグで別の日へ移動・右クリックで完了／削除': 'Drag to another day · right-click to mark done / delete',
    '地図を押すか、住所・地名で探してください。印は動かせます。': 'Tap the map or search by address or place. You can drag the marker.',
    '今日の分だけ色が付きます。購入すると全部の日に付きます。': 'Only today is coloured. Buy to colour every day.',
    '方位盤の有効期限が過ぎました。予定はこれまでどおり使えます。': 'Your charts have expired. Plans still work as before.',
    '月の見出しの色は、その月に始まる月盤（節入りから）の吉凶です。': 'Month headings are coloured by the month chart that starts in that month (from its solar term).',
    '引っ越し・家の新築・就職など、一年以上続く動きは年盤の吉方位を重く見ます。': 'For moves lasting a year or more — moving house, building, a new job — the year chart matters most.',
    '年盤・月盤の吉凶の色分けは、購入後にご覧になれます。星の並びは見られます。': 'Colour-coding of year and month charts opens after purchase. You can still see the stars.',
    '色は、その年の年盤の八方位の吉凶の平均です（年盤は立春で切り替わります）。札の方位は、その年の吉方位です。押すと、その年の年盤と12か月の暦が下に出ます。': 'Colour = average of the eight directions in that year’s chart (the year chart changes at Risshun, the start of spring). The directions shown are good for that year. Click a year to see its chart and 12-month calendar below.',
    '平均なので、凶の方位がある日も「良」になり得ます。行き先の方位は方位盤で確かめてください。': 'This is an average, so a "good" day can still have bad directions. Check your destination on the chart.',
    '平均なので、凶の方位がある年・月・日も「良」になり得ます。行き先の方位は方位盤で確かめてください。': 'This is an average, so a "good" year, month or day can still have bad directions. Check your destination on the chart.',
    '日付の左の線は節入り（月盤の切替）、赤い線は立春（年盤も切替）。点は予定のある日。日付を押すと、その日の月表示へ移ります。': 'A line on the left of a date marks a solar-term entry (month chart changes); red marks Risshun (the year chart changes too). A dot means you have plans. Click a date to open that month.',
    '※歳破・月破・日破は、一般の九星気学で誰にとっても凶とされるため判定に加えています（高木彬光『方位学入門』の方位表には含まれません）。破に当たる方位は、ほかの判定が「凶」より軽くても「凶」とします。流派によって扱いが異なります。': '* The Year, Month and Day Breakers are treated as bad for everyone in general Nine Star Ki, so we include them (they are not in Akimitsu Takagi’s direction table). A direction hit by a Breaker is "Bad" even if other rules are milder. Schools differ on this.',
    'このファイルは読み込めませんでした。カレンダーから書き出した .ics か、Google の書き出しの zip を選んでください。': 'This file could not be read. Choose an .ics exported from a calendar, or a zip exported from Google.',
    'このファイルは読み込めませんでした。方位予定帖で書き出したファイルを選んでください。': 'This file could not be read. Choose a file exported from Hōi Yotei-chō.',
    '書き出す予定がありません。': 'Nothing to export.', '読んでいます…': 'Reading…', '書き出しました。': 'Exported.', '書き出しを取りやめたか、この画面では保存できませんでした。': 'Export was cancelled or cannot be saved here.',
    '終了時刻が開始時刻より前になっています。': 'The end time is before the start time.', '終了時刻だけでは登録できません。開始時刻も入れてください。': 'Please enter a start time as well as an end time.',
    'この端末に保存できませんでした。ブラウザの設定をご確認ください。': 'Could not save on this device. Please check your browser settings.', '0〜10度の範囲で入れてください。': 'Enter a value from 0 to 10 degrees.', '変えました。': 'Changed.',
    'Google カレンダーを読んでいます…': 'Reading Google Calendar…', '取り込むカレンダーに印を付けてください。': 'Tick the calendars to import.', '送る予定はありません。': 'Nothing to send.',
    '1900〜2100年の生年月日で入れてください。': 'Enter a birth date between 1900 and 2100.', '登録しました（どの端末でも使えます）。': 'Registered (works on all your devices).', '同期先に保存できませんでした。もう一度お試しください。': 'Could not save. Please try again.',
    '登録しました。': 'Registered.', 'この端末に保存できませんでした。': 'Could not save on this device.', 'お支払いを確かめています…': 'Checking your payment…',
    'ご購入の記録があれば、解錠番号をそのアドレスへお送りしました。届かないときは迷惑メールの欄もご確認ください。': 'If we have a purchase for that address, we have emailed your unlock code. Please also check your spam folder.',
    '確かめています…': 'Checking…', '解錠番号は「HY-」で始まる英数字です。メールの番号をそのまま入れてください。': 'Unlock codes start with "HY-". Enter the code exactly as in the email.',
    '通信できませんでした。届いたメールの解錠番号を入れてください。': 'Connection failed. Please enter the unlock code from your email.', '解錠の受付は準備中です。': 'Unlocking is not available yet.',
    '通信できませんでした。時間をおいてもう一度お試しください。': 'Connection failed. Please try again later.', 'お支払いを確かめられませんでした。お手数ですが、届いたメールの解錠番号を入れてください。': 'We could not confirm the payment. Please enter the unlock code from your email.',
    'この解錠番号は見つかりませんでした。': 'This unlock code was not found.', '「緯度, 経度」の形で入れてください（例：35.6812, 139.7671）。': 'Enter as "latitude, longitude" (e.g. 35.6812, 139.7671).',
    'この端末では現在地を使えません。': 'Location is not available on this device.', '候補から選んでください。': 'Choose from the results.', '探しています…': 'Searching…',
    '暦の計算ファイルを読み込めませんでした。ページを開き直してください。': 'The calendar engine did not load. Please reload the page.', '現在地に印を置きました。': 'Marked your current location.',
    '現在地を取れませんでした。ブラウザの位置情報の許可をご確認ください。': 'Could not get your location. Please check location permission in your browser.', '現在地を確かめています…': 'Finding your location…',
    '見つかりませんでした。言い方を変えるか、地図を押して選んでください。': 'Nothing found. Try other words, or tap the map.', '購入の受付準備中です': 'Purchasing is not available yet',
    'この画面（claude.ai の中）では、外の地図や住所検索を読み込めません。座標を貼って決めてください。Google マップなどで地点を右クリックすると、座標を写せます。': 'Maps and address search cannot load inside claude.ai. Paste coordinates instead — right-click a place in Google Maps to copy them.',
    '地図を読み込めませんでした。座標を貼って決めてください。': 'The map could not load. Please paste coordinates.', 'まだ送っていない予定はありません': 'Nothing left to send',
    '予定と生年月日は同期先に保存し、どの端末でも同じものが見られます。書き出しは控えとしてお使いください。': 'Plans and birth data are synced across your devices. Use export as a backup.',
    '同期の準備中…': 'Preparing sync…', '予定と生年月日を端末間で同期しています。': 'Plans and birth data are synced across devices.', '同期できませんでした。この端末の中だけで動いています。': 'Sync failed. Working on this device only.', '自分用': 'Personal',
    '過去の予定を取り込むと、病気・出会い・合格など、ご自分の歩みの出来事をその日の方位盤と照らし合わせて、確かめることができます。': 'Import your past, and you can check the events of your own life against that day’s chart.',
    '一度取り込んだ予定は、もう一度取り込んでも重ねません。過去の予定は「済」として入り、その日の方位盤と見比べられます。毎週・毎月の予定は予定帖の繰り返しに、それ以外の繰り返しは1年先までを一件ずつ入れます。': 'Importing again never duplicates events. Past events come in as "done" so you can compare them with that day’s chart. Weekly and monthly events become planner repeats; other repeats are added one by one up to a year ahead.',
    '吉凶は購入後にご覧になれます': 'Good/bad opens after purchase', '生年月日を登録すると吉凶が出ます': 'Register your birth date to see good/bad', '予定': 'Plan', 'カレンダー': 'Calendar',
    '年盤は立春、月盤は各月の節入りで切り替えます。日付だけで区切る簡易計算で起こる「1月と立春前後のずれ」はありません。': 'The year chart changes at Risshun (start of spring) and the month chart at each solar-term entry, so there is none of the January slip that date-only shortcuts cause.',
    '予定を書き込むと、その日の九星の方位盤が重なる予定帳。節入りは国立天文台の暦と1分以内で一致、閏まで正しい日盤。': 'A planner that lays each day’s Nine Star Ki chart over your plans. Solar terms within one minute of Japan’s national observatory; day charts correct even through leap periods.',
    '凶': 'Bad', '吉': 'Good', '普通': 'Neutral', '吉凶': 'Mixed', '小凶': 'Slightly bad', '大凶': 'Very bad', '最大凶': 'Severe', '超最大凶': 'Extreme', '普': 'Fair',
    '場所：': 'Place: ', '座標を貼る（例：35.6812, 139.7671）': 'Paste coordinates (e.g. 35.6812, 139.7671)',
    '〜': '\u2013', '凶：': 'Bad: ', '行き先': 'Destination', 'Google に登録済み': 'Already in Google', '吉方位なし': 'No good directions', '未完了に戻す': 'Mark not done',
    '月盤・日盤': 'month and day charts', '年盤・月盤・日盤': 'year, month and day charts',
    '繰り返しの予定は、一覧の「編集」から日付を変えてください': 'To move a repeating plan, change its date with "Edit" in the list',
    '生年月日を登録すると、年ごとの吉凶と凶の理由が出ます。': 'Register your birth date to see each year\u2019s good and bad directions and the reasons.',
    '歳破・月破・日破は、一般の九星気学で誰にとっても凶とされるため判定に加えています（高木彬光『方位学入門』の方位表には含まれません）。破に当たる方位は、ほかの判定が「凶」より軽くても「凶」とします。流派によって扱いが異なります。': 'The Year, Month and Day Breakers are treated as bad for everyone in general Nine Star Ki, so we include them (they are not in Akimitsu Takagi\u2019s direction table). A direction hit by a Breaker is "Bad" even if other rules are milder. Schools differ on this.',
    '続けて「方位の設定」で生年月日を登録すると、方位盤に吉凶の色が付きます。': 'Next, register your birth date under "Birth data" to colour the charts.',
    '「': '"', '」': '"', '、': ', ', '。': '.', '・': ' · ',
  };
  Object.assign(T, STAR_FULL, STAR, DIR, HOL, TERM, BAN);
  Object.keys(WD).forEach(k => { T[k] = WD[k]; });

  // ── 組み立てられた文の規則 ─────────────────────────
  const S = '(一白|二黒|三碧|四緑|五黄|六白|七赤|八白|九紫)', SF = '(一白水星|二黒土星|三碧木星|四緑木星|五黄土星|六白金星|七赤金星|八白土星|九紫火星)';
  const D = '(北西|北東|南西|南東|北|南|東|西)', TM = '(小寒|立春|啓蟄|清明|立夏|芒種|小暑|立秋|白露|寒露|立冬|大雪)';
  const L = '(超最大凶|最大凶|大凶|小凶|吉凶|普通|凶|吉|普)';
  // 凶の理由（「・」で並ぶ一つずつ）
  function reason(r) {
    let m;
    if ((m = r.match(/^(.+)殺（(.+)が回る方位）$/)) && STAR[m[1]]) return `Five Yellow Kill (Gooh-satsu: ${star(m[2])} is here)`;
    if ((m = r.match(/^暗剣殺（(.+)の反対側）$/))) return `Dark Sword Kill (Anken-satsu: opposite ${star(m[1])})`;
    if (r === '本命殺（本命星が回る方位）') return 'Main Star Kill (Honmei-satsu: your main star is here)';
    if (r === '本命的殺（本命星の反対側）') return 'Opposite Main Star Kill (Honmei-teki-satsu: opposite your main star)';
    if ((m = r.match(/^退気（本命の(.)が(.)を生む）$/))) return `Draining (your ${ELEM[m[1]]} feeds ${ELEM[m[2]]})`;
    if ((m = r.match(/^生気（(.)が本命の(.)を生む）$/))) return `Supporting (${ELEM[m[1]]} feeds your ${ELEM[m[2]]})`;
    if ((m = r.match(/^相剋（(.)が本命の(.)を剋す）$/))) return `Conflict (${ELEM[m[1]]} overcomes your ${ELEM[m[2]]})`;
    if ((m = r.match(/^相剋（本命の(.)が(.)を剋す）$/))) return `Conflict (your ${ELEM[m[1]]} overcomes ${ELEM[m[2]]})`;
    if ((m = r.match(/^比和（(.)と(.)で同じ五行）$/))) return `Harmony (${ELEM[m[1]]} and ${ELEM[m[2]]}, same element)`;
    if ((m = r.match(/^(歳破|月破|日破)（(年|月|日)の十二支「(.)」の反対側）$/))) return `${HA[m[1]]} (opposite the ${({ 年: 'year', 月: 'month', 日: 'day' })[m[2]]}'s branch, ${BRANCH[m[3]]})`;
    return null;
  }
  function splitTop(s, sep) {   // 括弧の外の区切りで分ける
    const out = []; let depth = 0, cur = '';
    for (const c of s) { if (c === '（' || c === '「') depth++; if (c === '）' || c === '」') depth--; if (c === sep && depth === 0) { out.push(cur); cur = ''; } else cur += c; }
    out.push(cur); return out;
  }
  const kanshi = k => `${STEM[k[0]]} ${BRANCH[k[1]]}`;
  const R = [
    [/^(\d+:\d+)〜(\d+:\d+)$/, (m, a, b) => `${a}\u2013${b}`],
    [new RegExp(`^${SF}が回る。(.+)$`), (m, s, rest) => { const rs = splitTop(rest, '・').map(reason); return rs.every(Boolean) ? `${star(s)} is here. ${rs.join('; ')}` : null; }],
    [/^(\d+)月(\d+)日の方位盤$/, (m, a, b) => `Charts for ${md(a, b)}`],
    [/^(\d+)月(\d+)日（(.)）(?:・(.+))?の予定$/, (m, a, b, w, h) => `Plans for ${WD[w]}, ${md(a, b)}${h ? ' · ' + hol(h) : ''}`],
    [/^(\d+)月(\d+)日（(.)）$/, (m, a, b, w) => `${WD[w]}, ${md(a, b)}`],
    [/^(\d+)年 (\d+)月$/, (m, y, mo) => `${MON[mo - 1]} ${y}`],
    [/^(\d+)年$/, (m, y) => y], [/^(\d+)月$/, (m, mo) => MS[mo - 1]],
    [/^\((.)\)$/, (m, w) => WD[w] ? `(${WD[w]})` : null],
    [new RegExp(`^${TM} 月盤切替$`), (m, t) => `${TERM[t]} · new month chart`],
    [/^立春 年盤・月盤切替$/, () => 'Start of Spring · new year & month charts'],
    [new RegExp(`^(..)の日\\s+年盤 ${S}・月盤 ${S}・日盤 ${S}$`), (m, k, a, b, c) => STEM[k[0]] ? `${kanshi(k)} day — Year ${star(a)} · Month ${star(b)} · Day ${star(c)}` : null],
    [/^日盤は(陰遁|陽遁)（(\d+)\/(\d+)の甲子から）(・閏の期間)?$/, (m, t, a, b, u) => `Day chart is in the ${t === '陽遁' ? 'yang' : 'yin'} cycle (since the Kinoe-Ne day, ${md(a, b)})${u ? ' · leap period' : ''}`],
    [new RegExp(`^この月の節入り：${TM} (\\d+)月(\\d+)日 (\\d+):(\\d+)$`), (m, t, a, b, h, mi) => `Solar term this month: ${TERM[t]}, ${md(a, b)} ${h}:${mi}`],
    [new RegExp(`^この日が${TM}（(\\d+)月(\\d+)日 (\\d+):(\\d+)）。この日から新しい月盤$`), (m, t, a, b, h, mi) => `Today is ${TERM[t]} (${md(a, b)} ${h}:${mi}). A new month chart starts today`],
    [/^この日は(夏至|冬至)（(\d+)月(\d+)日 (\d+):(\d+)）$/, (m, t, a, b, h, mi) => `Today is the ${TERM[t]} (${md(a, b)} ${h}:${mi})`],
    [/^この月の月盤は(\d+)日（(.+)）で切り替わります。$/, (m, d, t) => `This month’s month chart changes on the ${d}th (${TERM[t] || t}).`],
    [/^(\d+)月はまだ前年の年盤です。$/, (m, mo) => `${MON[mo - 1]} is still under last year’s year chart.`],
    [/^年盤は(\d+)月(\d+)日 (\d+):(\d+)の立春で切り替わります。$/, (m, a, b, h, mi) => `The year chart changes at Risshun (start of spring), ${md(a, b)} ${h}:${mi}.`],
    [/^(\d+)月(\d+)日 (\d+):(\d+)の立春で、年盤と月盤が切り替わります。$/, (m, a, b, h, mi) => `At Risshun, ${md(a, b)} ${h}:${mi}, both the year and month charts change.`],
    [/^九星の一年は元日ではなく立春から始まるため、(\d+)日までは前年の年盤で判定します。$/, (m, d) => `The Nine Star year starts at Risshun, not on January 1, so days up to the ${d}th use last year’s chart.`],
    [new RegExp(`^${D}$`), (m, d) => DIR[d]],
    [new RegExp(`^${D}(・${D})+$`), m => dirs(m)],
    [new RegExp(`^吉 (${D}(?:・${D})*)$`), (m, ds) => `Good: ${dirs(ds)}`],
    [new RegExp(`^${D}：${SF}(?:（(.+)）)?$`), (m, d, s, l) => `${DIR[d]}: ${star(s)}${l ? ` (${lab(l)})` : ''}`],
    [new RegExp(`^${L}(?:・(歳破|月破|日破))?$`), (m, l, h) => `${LABEL[l]}${h ? ' · ' + HA[h] : ''}`],
    [/^凶：(.+?)\s*［クリックで(.)盤へ］$/, (m, list, b) => { const items = splitTop(list, '・').map(x => { const mm = x.match(new RegExp(`^${D}${L}(?:（(歳破|月破|日破)）)?$`)); return mm ? `${DIR[mm[1]]} ${LABEL[mm[2]]}${mm[3] ? ' (' + HA[mm[3]] + ')' : ''}` : null; }); return items.every(Boolean) ? `Bad: ${items.join(' · ')} [click for ${({ 日: 'day', 月: 'month', 年: 'year' })[b]} chart]` : null; }],
    [/^凶方位なし\s*［クリックで(.)盤へ］$/, (m, b) => `No bad directions [click for ${({ 日: 'day', 月: 'month', 年: 'year' })[b]} chart]`],
    [/^(日盤|月盤|年盤)の(平均|八方位)$/, (m, b, k) => k === '平均' ? `${BAN[b]} average` : `Eight directions of the ${BAN[b].toLowerCase()}`],
    [/^背景色：(日盤|月盤|年盤)の八方位の吉凶の平均$/, (m, b) => `Colour: average of the eight directions in the ${BAN[b].toLowerCase()}`],
    [new RegExp(`^年盤 ${S}$`), (m, s) => `Year chart ${star(s)}`],
    [new RegExp(`^${TM} (\\d+)日〜 月盤 ${S}$`), (m, t, d, s) => `${TERM[t]} from ${d}th · month ${star(s)}`],
    [/^(\d+)月(\d+)日(?: (.+?))?(?:・(.+?)（(年盤・月盤|月盤)の切替）)?(?:・(日盤|月盤|年盤) (吉|普|凶|大凶))?$/, (m, a, b, h, t, k, bn, lv) => `${md(a, b)}${h ? ' ' + hol(h) : ''}${t ? ` · ${TERM[t] || hol(t)} (${k === '月盤' ? 'month chart changes' : 'year & month charts change'})` : ''}${bn ? ` · ${BAN[bn]} ${LABEL[lv]}` : ''}`],
    [/^(\d+)年の年盤$/, (m, y) => `Year chart for ${y}`],
    [new RegExp(`^(\\d+)年の年盤（(\\d+)月(\\d+)日の立春から、(\\d+)年(\\d+)月(\\d+)日まで）\\s*中宮 ${SF}$`), (m, y, a, b, y2, c, d, s) => `Year chart for ${y} (from Risshun, ${md(a, b)}, to ${md(c, d)}, ${y2}) · center ${star(s)}`],
    [/^‹ 前の(\d+)年$/, (m, n) => `‹ Previous ${n} years`], [/^次の(\d+)年 ›$/, (m, n) => `Next ${n} years ›`], [/^前の(\d+)年$/, (m, n) => `Previous ${n} years`], [/^次の(\d+)年$/, (m, n) => `Next ${n} years`],
    [/^(\d+)月(\d+)日に予定を追加$/, (m, a, b) => `Add a plan on ${md(a, b)}`],
    [/^(\d+)月(\d+)日（(.)）(?:\s(.+))? 予定(\d+)件$/, (m, a, b, w, h, n) => `${WD[w]}, ${md(a, b)}${h ? ' ' + hol(h) : ''}, ${n} plan(s)`],
    [/^(.)の刻（(\d+)〜(\d+)時）$/, (m, h, a, b) => `${HOUR[h]} (${a}:00–${b}:00)`],
    [/^([\d,]+)円$/, (m, n) => `¥${n}`],
    [/^購入日から(\d+)年間。自動更新はありません$/, (m, n) => `${n} year from the purchase date. No automatic renewal`],
    [/^四正(\d+)度・四隅(\d+)度$/, (m, a, b) => `Cardinal ${a}° · corners ${b}°`], [/^八方位(\d+)度均等$/, (m, a) => `All eight directions ${a}°`],
    [/^(北|南)の基準$/, () => 'North reference'], [/^真北$/, () => 'True north'], [/^磁北$/, () => 'Magnetic north'],
    [/^南半球の扱い（起点が南半球のとき）$/, () => 'Southern hemisphere (when the origin is south of the equator)'],
    [/^南北を入れ替える$/, () => 'Swap north and south'], [/^南北・東西とも入れ替える$/, () => 'Swap north–south and east–west'],
    [/^(\d+)年前から$/, (m, n) => `From ${n} year ago`], [/^(\d+)か月前から$/, (m, n) => `From ${n} months ago`], [/^今年の(\d+)月から$/, (m, n) => `From January this year`],
    [/^起点：(.+?)(（未登録）)?$/, (m, o, u) => `Origin: ${org(o)}${u ? ' (not set)' : ''}`],
    [/^（(.+)から）$/, (m, o) => `(from ${org(o)})`], [/^(.+)から$/, (m, o) => ORIGIN[o] ? `from ${org(o)}` : null],
    [/^行き先：$/, () => 'Destination: '], [/^行き先：(.+)（(-?[\d.]+), (-?[\d.]+)）$/, (m, n, a, b) => `Destination: ${T[n] || n} (${a}, ${b})`],
    [new RegExp(`^${D} ([\\d.]+)°・([\\d,.]+)km$`), (m, d, az, km) => `${DIR[d]} ${az}° · ${km} km`],
    [/^([\d.]+)°・([\d,.]+)km（境界の近くのため判定しない）$/, (m, az, km) => `${az}° · ${km} km (near a boundary: not judged)`],
    [new RegExp(`^(日盤|月盤|年盤) ${L}(?:（(歳破|月破|日破)）)?$`), (m, b, l, h) => `${BAN[b]} ${LABEL[l]}${h ? ' (' + HA[h] + ')' : ''}`],
    [/^登録済み：(\d+)年(\d+)月(\d+)日生まれ\s*本命星$/, (m, y, a, b) => `Registered: born ${md(a, b)}, ${y} · main star`],
    [new RegExp(`^・月命星\\s*${SF}?$`), (m, s) => ` · month star ${s ? star(s) : ''}`],
    [/^(\d+)年(\d+)月(\d+)日まで、すべての方位盤をご覧になれます。$/, (m, y, a, b) => `All charts are open until ${md(a, b)}, ${y}.`],
    [/^「(.+)」を削除しました$/, (m, t) => `Deleted "${t}"`], [/^（繰り返し全体）$/, () => ' (whole series)'], [/^(.+)（繰り返し全体）$/, (m, t) => `${t} (whole series)`],
    [/^「(.+)」を選ぶ$/, (m, o) => `Choose "${org(o)}"`], [/^起点「(.+)」を選ぶ$/, (m, o) => `Choose origin "${org(o)}"`],
    [/^起点「(.+)」が未登録です。先に「地図・起点」で登録すると、方位と距離が出ます。$/, (m, o) => `Origin "${org(o)}" is not set. Set it in "Map & origins" to see direction and distance.`],
    [/^起点「(.+)」が未登録です。「地図・起点」で登録してください。$/, (m, o) => `Origin "${org(o)}" is not set. Please set it in "Map & origins".`],
    [/^(.+)から (北西|北東|南西|南東|北|南|東|西) ([\d.]+)°・([\d,.]+)km$/, (m, o, d, az, km) => `From ${org(o)}: ${DIR[d]} ${az}° · ${km} km`],
    [/^(\d+)つのカレンダーから、合わせて(\d+)件を取り込みました。(.*)$/, (m, c, n, rest) => `Imported ${n} events from ${c} calendar(s). ${impList(rest)}`],
    [/^合わせて(\d+)件を取り込みました。(.*)$/, (m, n, rest) => `Imported ${n} events in total. ${impList(rest)}`],
    [/^(\d+)つのカレンダーが見えます。取り込むものに印を付けてください。$/, (m, n) => `${n} calendars found. Tick the ones to import.`],
    [/^(\d+)件を Google カレンダーへ送りました。$/, (m, n) => `Sent ${n} plan(s) to Google Calendar.`],
    [/^Google カレンダーへ送っています…（(\d+)\/(\d+)件）$/, (m, a, b) => `Sending to Google Calendar… (${a}/${b})`],
    [/^「(.+)」を読んでいます…（(\d+)件）$/, (m, c, n) => `Reading "${c}"… (${n})`],
    [/^まだ送っていない今日以降の予定：(\d+)件$/, (m, n) => `Not yet sent (today or later): ${n}`],
    [/^(\d+)件の予定を読み込みました（同じ予定は重ねません）。$/, (m, n) => `Imported ${n} plan(s) (no duplicates).`],
    [/^(\d+)件まで送ったところで止まりました。(.*)$/, (m, n, rest) => `Stopped after sending ${n}. ${translate(rest) || rest}`],
    [/^ご購入ありがとうございます。解錠しました（(.+)まで）。解錠番号 (\S+) は控えておいてください。メールでもお送りしました。(.*)$/, (m, d, k, rest) => `Thank you for your purchase. Unlocked until ${d}. Please keep your unlock code ${k}; we have also emailed it.${rest ? ' Next, register your birth date under "Birth data" to colour the charts.' : ''}`],
    [/^解錠しました。(.+)までご利用いただけます。$/, (m, d) => `Unlocked. You can use it until ${d}.`],
    [/^([\d,]+)円で購入日から(\d+)年間、すべての日の日盤・月盤・年盤と、吉凶の色分け・凶の理由が見られます。$/, (m, n, y) => `For ¥${n}, you get day, month and year charts for every day, with colours and reasons, for ${y} year from purchase.`],
    [/^予定を書き込むと、その日の方位盤が重なります。予定の記録と今日の日盤は無料です。ほかの日の方位盤・月盤・年盤・吉凶の色分けは、購入（([\d,]+)円・購入日から(\d+)年間）で開きます。$/, (m, n, y) => `Write your plans and each day’s Nine Star Ki chart appears with them. Plans and today’s day chart are free. Charts for other days, month and year charts and colour-coding open with a purchase (¥${n}, ${y} year).`],
    [/^方位の吉凶は、ご本人の本命星から見て決まります。登録すると、(今日の方位盤が|すべての日の方位盤が)吉凶で色分けされ、凶の方位にはその理由が出ます。生年月日はこの端末の中にだけ保存します。$/, (m, w) => `Good and bad directions depend on your main star. Once registered, ${w === '今日の方位盤が' ? 'today’s chart is' : 'every day’s chart is'} colour-coded and bad directions show their reasons. Your birth date stays on this device.`],
    [/^日盤は冬至・夏至に最も近い甲子の日で陽遁・陰遁を切り替え、閏の年（次は(\d+)年）も暦どおりに扱います。$/, (m, y) => `The day chart switches between the yang and yin cycles on the Kinoe-Ne day nearest each solstice, and handles leap periods (next in ${y}) exactly as the almanac does.`],
    [/^方位の吉凶は高木彬光『改訂版 方位学入門』の方位表と同じ規則で判定しています（(\d+)通りすべて一致）。$/, (m, n) => `Good and bad directions follow the same rules as the table in Akimitsu Takagi’s "Hōigaku Nyūmon" (all ${n} cases match).`],
    [/^磁北で判定（偏角 ([\d.]+)°(西|東)）$/, (m, a, w) => `Judged by magnetic north (declination ${a}° ${w === '西' ? 'W' : 'E'})`],
    [/^判定日は(現地時間|日本時間)の(\d+)月(\d+)日$/, (m, t, a, b) => `Judged on ${md(a, b)} (${t === '現地時間' ? 'local time' : 'Japan time'})`],
    [/^方位の境界まで([\d.]+)度のため判定しない。慎重に行動すること$/, (m, a) => `Only ${a}° from a boundary, so not judged. Act with care`],
    [/^もう一方の計算法では「(.+)」になる$/, (m, d) => `The other method gives "${DIR[d] || d}"`],
    [/^(.+)。(.+)$/, (m, a, b) => { const x = translate(a), y = translate(b); return x && y ? `${x}. ${y}` : null; }],
    [/^読めなかったもの：(.+)$/, (m, f) => `Could not read: ${f}`],
    [/^ほか(\d+)件$/, (m, n) => `+${n} more`],
    [/^「(.+)」を(\d+)月(\d+)日（(.)）へ移しました$/, (m, t, a, b, w) => `Moved "${t}" to ${WD[w]}, ${md(a, b)}`],
    [/^「(.+)」を未完了に戻しました$/, (m, t) => `"${t}" is marked not done`], [/^「(.+)」を完了にしました$/, (m, t) => `"${t}" is marked done`],
    [/^(\d+)件を書き出しました。$/, (m, n) => `Exported ${n} plan(s).`],
    [/^(\d+)件を取り込みました。$/, (m, n) => `Imported ${n} event(s).`],
    [/^すでにある(\d+)件は重ねていません。$/, (m, n) => `${n} already present, not duplicated.`],
    [/^範囲より前の(\d+)件は入れていません。$/, (m, n) => `${n} before the range were skipped.`],
    [/^中止になった(\d+)件は入れていません。$/, (m, n) => `${n} cancelled event(s) skipped.`],
    [/^時間単位の繰り返しなど、扱えない(\d+)件は入れていません。$/, (m, n) => `${n} unsupported repeat(s) (e.g. hourly) skipped.`],
    [/^枠で囲んだ日：(.+)のすべてで同じ方位が「吉」になる日。札の方位がその吉方位です。$/, (m, k) => `Framed days: the same direction is good in all ${T[k] || k}. The tag shows that direction.`],
    [/^Google カレンダーが受け付けませんでした：(.*)$/, (m, e) => `Google Calendar did not accept it: ${e}`],
    [/^(\d+)件を取り込みました。(.+)$/, (m, n, rest) => { const r = translate(rest); return r ? `Imported ${n} event(s). ${r}` : null; }],
    [/^(.+?。)(.+)$/, (m, a, b) => { const x = translate(a), y = translate(b); return x && y ? `${x} ${y}` : null; }],
  ];
  const NOTE = { '南半球設定で判定': 'Judged with the southern-hemisphere setting', '高緯度のため磁北の信頼性が低い': 'Magnetic north is unreliable at high latitude', '起点が極点のため方位が定まらない': 'Direction is undefined at the pole', '到達点が地球の真裏付近のため方位が定まらない': 'Direction is undefined near the antipode', '起点と到達点が同じ': 'Origin and destination are the same',
    '最後の1件は Google 側に入っているかもしれません。Google カレンダーで確かめてから、もう一度押してください。': 'The last one may already be in Google. Check Google Calendar, then press again.',
    'Google カレンダーとのつながりが切れています。claude.ai の「設定」→「コネクタ」で Google カレンダーをつなぎ直してください。': 'The Google Calendar connection has lapsed. Reconnect it in claude.ai Settings → Connectors.',
    'Google カレンダーが claude.ai につながっていません。claude.ai の「設定」→「コネクタ」で Google カレンダーを加えてください。': 'Google Calendar is not connected to claude.ai. Add it in claude.ai Settings → Connectors.',
    'この予定帖から Google カレンダーを使う許可が出ていません。もう一度ボタンを押し、出てくる確認で「許可」を選んでください。': 'This planner is not allowed to use Google Calendar yet. Press the button again and choose "Allow".',
    '組織の設定で、Google カレンダーの利用が止められています。': 'Google Calendar is blocked by your organization’s settings.',
    'この画面では Google カレンダーと直接やり取りできません。上のファイルでの受け渡しをお使いください。': 'Direct Google Calendar access is not available here. Please use files instead.',
    'Google カレンダーに届きませんでした。少し置いてから、もう一度お試しください。': 'Could not reach Google Calendar. Please try again shortly.' };
  Object.assign(T, NOTE);
  function impList(rest) {   // 「仕事」12件（重なり1件は除く）、…。
    const parts = rest.replace(/。$/, '').split('、').filter(Boolean).map(p => {
      const m = p.match(/^「(.+)」(\d+)件(?:（重なり(\d+)件は除く）)?$/);
      return m ? `"${m[1]}" ${m[2]}${m[3] ? ` (${m[3]} duplicate(s) skipped)` : ''}` : (translate(p) || p);
    });
    return parts.join(', ') + (parts.length ? '.' : '');
  }

  const missing = window.__hoiUntranslated = new Set();
  const cache = new Map();
  function translate(src) {
    if (!src || !JP.test(src)) return src;
    if (cache.has(src)) return cache.get(src);
    const lead = src.match(/^\s*/)[0].replace(/\u3000/g, ' '), trail = src.match(/\s*$/)[0].replace(/\u3000/g, ' '), s = src.trim().replace(/\s+/g, ' ');
    let out = T[s];
    if (out === undefined) {
      for (const [re, fn] of R) { const m = s.match(re); if (m) { const r = fn(...m); if (r) { out = r; break; } } }
    }
    if (out === undefined || out === null) { missing.add(s); cache.set(src, null); return null; }
    out = lead + out + trail;
    cache.set(src, out);
    return out;
  }
  window.hoiT = translate;

  // ── 画面へ当てる ─────────────────────────────────
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const skip = el => !el || el.closest && el.closest('[translate="no"],script,style');
  function doText(n) {
    if (n.data.includes('\u3000') && !skip(n.parentElement)) n.data = n.data.replace(/\u3000/g, ' ');
    if (!JP.test(n.data) || skip(n.parentElement)) return;
    let t = translate(n.data);
    // 年表示の小さな日付の枠では、短い書き方にする
    if (t && t.trim() === 'Very bad' && n.parentElement && n.parentElement.closest('.ym-d')) t = 'V.bad';
    if (t !== null && t !== n.data) n.data = t;
  }
  function doAttrs(el) {
    if (skip(el)) return;
    ATTRS.forEach(a => { const v = el.getAttribute && el.getAttribute(a); if (v && JP.test(v)) { const t = translate(v); if (t !== null && t !== v) el.setAttribute(a, t); } });
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (skip(root)) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  const mo = new MutationObserver(list => {
    for (const r of list) {
      if (r.type === 'childList') r.addedNodes.forEach(walk);
      else if (r.type === 'characterData') doText(r.target);
      else if (r.type === 'attributes') doAttrs(r.target);
    }
    if (JP.test(document.title)) { const t = translate(document.title); if (t) document.title = t; }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('DOMContentLoaded', () => walk(document.body));
})();
