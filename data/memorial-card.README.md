# 紀念卡文章設定

校長室會讀取 `memorial-card.json`，依玩家目前的 `completedGames`、隱藏成就與美術教室作品，將符合條件的 `sections` 依序組成紀念文章。

每個段落格式如下：

```json
{
  "id": "自訂識別名稱",
  "when": { "games": ["classroom"] },
  "text": "顯示在文章中的段落。"
}
```

`when` 可使用：

- `always: true`：永遠顯示。
- `noProgress: true`：尚未完成遊戲、也沒有成就時顯示。
- `games: ["classroom"]`：完成其中任一遊戲時顯示。
- `allGames: ["classroom", "lab"]`：完成全部列出的遊戲時顯示。
- `achievements: ["school-song"]`：取得其中任一隱藏成就時顯示。
- `allAchievements: ["school-song", "playground-dog"]`：取得全部列出的隱藏成就時顯示。
- `minimumGames: 4`、`minimumAchievements: 3`：達到最低數量時顯示。
- `artwork: true` 或 `artwork: false`：依美術教室是否留下作品顯示。

可在文字中使用 `{name}`、`{date}`、`{gameCount}`、`{achievementCount}`。下載紀念卡與頁面文章會共用同一份資料。
