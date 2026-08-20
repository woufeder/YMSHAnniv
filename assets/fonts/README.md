# 字型資源

目前專案沒有本機字型檔。頁面主要透過 Google Fonts 載入 `LXGW WenKai Mono TC`，部分頁面也載入 `Noto Sans TC` 作為後備字型。

此資料夾保留給未來需要自架的字型檔。若加入本機字型，請同時：

1. 將字型檔與授權文件放在此資料夾。
2. 在共用 CSS 加入 `@font-face`。
3. 將字型加入需要頁面的 `font-family` 後備序列。

```css
@font-face {
  font-family: "YMSH Local Font";
  src: url("../assets/fonts/ymsh-local-font.woff2") format("woff2");
  font-display: swap;
}
```

請優先使用 WOFF2，並確認字型授權允許網站散布。
