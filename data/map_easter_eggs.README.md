# 地圖彩蛋對話

彩蛋的位置與觸發規則寫在 `js/map-config.js` 的 `easterEggs`，對話文字寫在 `data/map_easter_eggs.json`。

## 新增彩蛋

在 `easterEggs` 複製一筆設定：

```js
{
  id: "unique-id",
  name: "維護時辨識用名稱",
  enabled: true,
  area: { x: 900, y: 700, width: 60, height: 60 },
  dialoguePath: "data/map_easter_eggs.json",
  dialogueKey: "unique-id",
  once: false,
}
```

- `id`：不可重複。
- `enabled`：設為 `false` 時不會觸發，也不會顯示除錯框。
- `area`：使用原始地圖 `1867 x 1280` 的座標。
- `dialoguePath`：對話 JSON 路徑，通常不必修改。
- `dialogueKey`：對應 JSON 裡的欄位名稱。
- `once`：`true` 代表玩家只會遇到一次；清除網站資料後可再次觸發。

接著在 `map_easter_eggs.json` 加入同名欄位：

```json
{
  "unique-id": {
    "guest": [
      { "name": "？？？", "text": "遊客看到的對話。" }
    ],
    "student": [
      { "name": "？？？", "text": "學生看到的對話。" }
    ],
    "teacher": [
      { "name": "？？？", "text": "老師看到的對話。" }
    ],
    "default": [
      { "name": "？？？", "text": "未知身分使用的備援對話。" }
    ]
  }
}
```

同一個彩蛋會依 `playerRole` 自動選擇 `guest`、`student` 或 `teacher`；找不到對應身分時使用 `default`。

彩蛋只能由角色走入範圍觸發，不會產生滑鼠點擊區，也不會跳轉頁面。除錯圖層會以紫色虛線顯示已啟用的彩蛋範圍。
