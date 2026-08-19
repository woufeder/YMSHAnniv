# YMSH 周年紀念互動遊戲

此為噗浪企劃《永明高中》周年互動紀念遊戲網站。

## 專案概述

這個專案包含了多個互動小遊戲和功能，讓玩家能藉由互動性回憶企劃，並生成個人化的紀念卡片。

<!-- ### 主要功能

1. **校門口入口** - 使用者輸入姓名開始遊戲
2. **校園地圖** - 互動式地圖顯示各個遊戲區域和進度
3. **教室翻牌遊戲** - 記憶力挑戰遊戲
4. **花園種樹** - 互動式植物養成遊戲
5. **實驗室電路解謎** - 邏輯思維挑戰遊戲
6. **校長室紀念卡** - 個人化紀念卡片生成
7. **穿堂留言板** - 社群留言功能（可串接 Google Sheets）

<!-- ## 專案結構

```
/project-root
│
├── index.html                # 校門口／輸入名字
├── map.html                  # 校園地圖主頁
├── principal.html            # 校長室（紀念卡）
├── hall.html                 # 穿堂留言板
│
├── /games                    # 各關卡頁面
│   ├── classroom.html        # 教室：翻牌遊戲
│   ├── garden.html           # 花園：種樹
│   ├── lab.html              # 實驗室：電路解謎
│
├── /js                       # JavaScript 控制
│   ├── main.js               # 校門口流程
│   ├── map.js                # 地圖互動＋進度管理
│   ├── classroom.js          # 翻牌遊戲邏輯
│   ├── garden.js             # 種樹互動
│   ├── lab.js                # 電路解謎
│   ├── principal.js          # 紀念卡生成（canvas）
│   ├── hall.js               # Google Sheet 留言串接
│   ├── utils.js              # 通用函式
│
├── /css                      # 樣式檔案
│   ├── main.css              # 共用基礎樣式
│   ├── map.css               # 地圖頁樣式
│   ├── classroom.css         # 翻牌遊戲樣式
│   ├── garden.css            # 種樹動畫樣式
│   ├── lab.css               # 電路關卡樣式
│   ├── principal.css         # 校長室卡片樣式
│   ├── hall.css              # 留言板樣式
│
├── /data                     # 資料設定檔
│
├── /assets                   # 靜態資源
│   ├── /images               # 圖片素材
│   ├── /audio                # 音效檔案
│   └── /fonts                # 字型檔案
│
<!-- └── README.md                 # 本說明檔案
``` -->

<!-- ## 安裝與部署

### 本地開發

1. 將專案檔案下載到本地目錄
2. 使用任何 HTTP 伺服器來運行專案（不能直接以 file:// 協議開啟）
3. 推薦使用：
   - **Live Server** (VS Code 擴展)
   - **Python HTTP 伺服器**：`python -m http.server 8000`
   - **Node.js HTTP 伺服器**：`npx http-server`

### 生產部署

1. **GitHub Pages**
   - 將檔案上傳到 GitHub 儲存庫
   - 在設定中啟用 GitHub Pages
   - 選擇主分支作為來源

2. **Netlify**
   - 將檔案拖拉到 Netlify 部署頁面
   - 或連接 GitHub 儲存庫自動部署

3. **其他靜態網站託管服務**
   - Vercel
   - Firebase Hosting
   - AWS S3 + CloudFront

## 設定說明

### Google Sheets 留言板整合

1. 建立一個新的 Google Sheets 試算表
2. 設定以下欄位：`姓名`, `訊息`, `時間戳記`
3. 建立 Google Apps Script 來處理 API 請求
4. 將 Web App URL 更新到 `js/hall.js` 中的 `SHEET_URL` 變數

## 功能特色

### 響應式設計
- 支援桌面、平板、手機各種螢幕尺寸
- 針對觸控裝置優化的互動體驗

### 無障礙設計
- 鍵盤導航支援
- 高對比模式支援
- 螢幕閱讀器相容性

### 進度儲存
- 使用 localStorage 儲存遊戲進度
- 支援跨頁面的狀態保持

## 瀏覽器支援

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 80+

## 技術棧

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **圖形**：Canvas API (用於紀念卡生成)
- **儲存**：localStorage
- **樣式**：CSS Grid, Flexbox, CSS 變數
- **動畫**：CSS Animations, Transitions

<!-- ## 檔案說明

### HTML 檔案
- 使用語意化標籤
- 包含 meta 標籤用於 SEO 和社群分享
- 響應式 viewport 設定

### JavaScript 檔案
- 模組化設計，各頁面功能分離
- 使用現代 JavaScript 語法
- 錯誤處理和用戶體驗優化

### CSS 檔案
- 使用 CSS 變數管理主題色彩
- Flexbox 和 Grid 佈局
- 動畫和過渡效果

## 自訂指南

### 更換圖片素材
1. 將圖片放置到對應的 `assets/images/` 子資料夾
2. 更新 CSS 或 JavaScript 中的檔案路徑引用

### 新增遊戲區域
1. 在 `games/` 資料夾中建立新的 HTML 檔案
2. 建立對應的 CSS 和 JavaScript 檔案
3. 更新 `js/map.js` 中的地點列表

## 效能優化建議

1. **圖片優化**
   - 使用 WebP 格式（提供 fallback）
   - 適當的圖片尺寸和壓縮
   - 使用 lazy loading

2. **程式碼優化**
   - 縮小 CSS 和 JavaScript 檔案
   - 使用 Gzip 壓縮
   - 啟用瀏覽器快取

3. **載入優化**
   - 預載入關鍵資源
   - 使用 Service Worker (可選) -->

## 授權

此專案僅供 YMSH 周年紀念活動使用。

## 聯絡資訊

如有任何問題或建議，請聯絡開發團隊。

---

**製作日期**：2025年10月  
**版本**：1.0.0  
**製作團隊**：YMSH Project
