# 音效資源

此資料夾存放全站 BGM、環境音與效果音。音效由 `js/utils.js` 的 `playSound()` 載入；可傳入完整檔名，也可省略副檔名，程式會依序嘗試 MP3 與 WAV。

## 目前用途

| 檔案 | 用途 |
| --- | --- |
| `hihamatanoboru.mp3` | 全站 BGM。 |
| `playground.wav` | 操場與花圃頁面的循環環境音。 |
| `achievement.wav` | 隱藏成就解鎖提示。 |
| `corerect.wav` | 教室與實驗室答對。檔名依現有程式保留。 |
| `wrong.wav` | 教室與實驗室答錯。 |
| `waterdrop.wav` | 花圃澆水。 |
| `sunshine.wav` | 花圃給予陽光。 |
| `put.wav` | 花圃施肥。 |
| `grab.wav` | 花圃整理。 |
| `akanaidoor.mp3` | 教室對話中的鎖門聲。 |
| `paper.mp3` | 教室對話中的紙張聲。 |
| `step.wav` | 教室對話中的腳步聲。 |
| `swoosh.wav` | 實驗室角色衝刺。 |
| `bark.wav` | 操場相關對話的小狗叫聲。 |

`footstep-gravel.wav` 目前保留在資源庫，尚未由程式或對話腳本引用。

## 新增音效

1. 將 MP3 或 WAV 檔案放入此資料夾。
2. 直接使用 `playSound('檔名.wav')`，或在對話文字中使用 `<sound=檔名>`。
3. 若使用未寫副檔名的名稱，請避免同時放入不同內容的同名 MP3 與 WAV，避免瀏覽器選到非預期版本。

## BGM 來源

真島こころ - 陽はまた昇る
<https://flower-prayer.com/bg%EF%BD%8D-vol-16-2/>
