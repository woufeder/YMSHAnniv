# 圖片資源

圖片目前直接放在 `assets/images/`，只有共用對話徽章放在 `assets/images/ui/`；不存在舊文件所列的 `classroom/`、`garden/`、`lab/` 或 `principal/` 子資料夾。

## 主要素材

| 類別 | 檔案 |
| --- | --- |
| 校園與入口背景 | `gate.png`、`map.png`、`BannerBG.png`、`title.png` |
| 地點背景 | `art-building.jpg`、`classroom.jpg`、`classroom-open.jpg`、`classroom-art.jpg`、`classroom-music.jpg`、`garden.jpg`、`hall-brick.jpg`、`hall.jpg`、`lab.png`、`playground.jpg`、`principal.jpg` |
| 對話角色 | `student.png`、`guard.png`、`gardener.png` |
| 操場素材 | `dog.png`、`dog2.png`、`playground-dog.png` |
| 對話 UI | `ui/dialogLogo.png` |

## 使用方式

- CSS 背景圖使用相對於 CSS 檔案的位置，例如 `url('../assets/images/lab.png')`。
- JSON 對話的 `char` 欄位使用角色檔名，例如 `"char": "student.png"`。
- JSON 對話的 `bg` 欄位請填寫相對於該 HTML 頁面的路徑，例如遊戲頁使用 `"../assets/images/lab.png"`。
- JavaScript 若需要跨頁安全的絕對資源路徑，使用 `resolveAppAsset('assets/images/檔名')`。

新增或更名圖片後，請同步檢查 CSS、JavaScript 與 JSON 中的引用路徑。
