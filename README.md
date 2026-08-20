# YMSH 周年紀念互動網站

噗浪企劃《永明高中》的周年互動紀念網站。玩家從校門口輸入名字與身分後進入校園地圖，依序閱讀地點對話、遊玩小遊戲、蒐集隱藏成就，最後可在校長室查看個人化的紀念卡。

本專案是純 HTML、CSS 與 JavaScript 的靜態網站，設計為部署至 GitHub Pages；不需要 PHP、資料庫、建置工具或自架伺服器。

## 內容

- `index.html`：校門口入口與名字輸入。
- `whoAreYou.html`：身分辨識與角色分流。
- `map.html`：地圖前導對話、校園地圖、地點進度與隱藏成就清單。
- `art.html`：藝術大樓前導對話與教室選擇。
- `games/music.html`：依 C 大調校歌旋律彈琴。
- `games/artroom.html`：繪圖板，可儲存作品至瀏覽器。
- `games/classroom.html`：從題庫隨機抽取 10 題的快問快答。
- `games/garden.html`：4 x 4 花圃急救站；在時限內以正確工具處理事件。
- `games/lab.html`：實驗紀錄的翻牌配對。
- `playground.html`：30 秒節奏遊戲，協助把小狗引到側門。
- `hall.html`：穿堂留言板，便條紙可開啟完整留言。
- `principal.html`：校長室對話、通關紀錄與紀念卡。

## 專案結構

```text
.
├── assets/
│   ├── audio/                 # BGM、環境音與效果音
│   ├── fonts/                 # 本機字型預留位置
│   └── images/                # 背景、角色、遊戲與 UI 圖片
├── css/
│   ├── main.css               # 全站共用變數、設定視窗、通用元件
│   ├── dialogue.css           # 共用對話框、角色與背景切換
│   └── [page].css             # 各頁或各遊戲樣式
├── data/
│   ├── intro_*.json           # 各地點前導對話
│   ├── map_intro.json         # 地圖前導對話
│   ├── playground*.json       # 操場規則與結局對話
│   ├── whoAreYou.json         # 身分選擇對話
│   └── member.js              # 企劃成員資料
├── games/                     # 教室、花圃、實驗室與藝術教室頁面
├── js/
│   ├── utils.js               # 儲存、BGM、音效、設定、成就與共用函式
│   ├── dialogue.js            # JSON 對話直譯器
│   ├── location-intro.js      # 地點前導對話流程
│   └── [page].js              # 各頁與各遊戲邏輯
└── *.html                     # 入口、地圖、地點與主題頁面
```

## 對話與資料

`js/dialogue.js` 負責顯示所有 JSON 對話，資料檔只處理文本、角色、背景與腳本指令。常用欄位如下：

```json
{
  "char": "student.png",
  "name": "學生",
  "text": "<char:jump><sound=bark>「汪！」",
  "bg": "../assets/images/lab.png",
  "effect": "flash"
}
```

文字可使用 `<wait>`、`<wait=500>`、`<sound=name>`、`<char:shake>`、`<char:jump>`、`<char:dashAcross>` 與 `<char:dropPause>`。背景圖片由 `bg` 指定，對話引擎會進行淡入淡出切換。

## 儲存與成就

遊戲進度、設定、玩家資料與美術教室作品會儲存於 `localStorage`。一般進度會在關閉瀏覽器超過 30 分鐘後清除；隱藏成就會保留。

目前的隱藏成就：

- 完整演奏校歌。
- 在操場成功抓到小狗。
- 花圃以五顆心完成。
- 教室快問快答全對。
- 實驗室以 A 等第完成。

## 第三方資源

- Bootstrap 5：版面與 Modal。
- Font Awesome 6：圖示。
- Google Fonts：LXGW WenKai Mono TC、Noto Sans TC。
- GSAP：首頁與室外地點的動畫效果。

上述資源以 CDN 載入；使用網站時需要可連線至對應 CDN。

## 部署

直接將儲存庫根目錄部署至 GitHub Pages 即可。JSON 對話與操場資料以 `fetch()` 載入，請用 HTTP(S) 靜態託管環境測試，不要直接以 `file://` 開啟頁面。

穿堂留言板是唯一的外部服務整合，端點設定在 `js/hall.js` 的 `SHEET_URL`，目前使用 Google Apps Script Web App 與 Google Sheets 儲存留言。

## 維護重點

- 新增地點時，同步更新 `map.js` 的 `locations`、目標頁面、對應 CSS/JS 與前導對話 JSON。
- 新增對話角色圖時，將圖片放在 `assets/images/`，JSON 使用檔名即可。
- 新增音效時放在 `assets/audio/`；`playSound()` 支援 `.mp3` 與 `.wav`，未寫副檔名時會依序嘗試兩種格式。
- 共用視覺與設定請優先調整 `css/main.css`、`css/dialogue.css`、`js/utils.js`，避免把同一規則散落在個別頁面。

## 授權

本專案僅供《永明高中》周年紀念活動使用。
