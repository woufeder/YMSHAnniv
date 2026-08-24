// principal.js - 以資料檔組合玩家的紀念文章與下載卡
function initPrincipal() {
  const ARTWORK_STORAGE_KEY = "ymsh:artwork";
  const CONFIG_PATH = "data/memorial-card.json";
  const canvas = document.getElementById("memoryCard");
  const context = canvas.getContext("2d");
  const generateButton = document.getElementById("generateCard");
  const downloadButton = document.getElementById("downloadCard");
  const backButton = document.getElementById("backToMap");
  const kicker = document.getElementById("memorialKicker");
  const title = document.getElementById("memorialTitle");
  const meta = document.getElementById("memorialMeta");
  const paragraphs = document.getElementById("memorialParagraphs");
  const artworkSection = document.getElementById("artworkSection");
  const artworkImage = document.getElementById("artworkImage");
  const artworkCaption = document.getElementById("artworkCaption");

  let config;
  let state;
  let selectedSections = [];

  function readCompletedGames() {
    try {
      const games = JSON.parse(localStorage.getItem("completedGames")) || [];
      return new Set(Array.isArray(games) ? games : []);
    } catch (error) {
      console.warn("Completed games could not be read:", error);
      return new Set();
    }
  }

  function getState() {
    const completedGames = readCompletedGames();
    const earnedAchievements = new Set(
      (window.YMSHAchievements?.all || [])
        .filter((achievement) => window.YMSHAchievements.has(achievement.id))
        .map((achievement) => achievement.id),
    );

    return {
      name:
        localStorage.getItem("userName") ||
        localStorage.getItem("playerName") ||
        "訪客",
      completedGames,
      earnedAchievements,
      artwork: localStorage.getItem(ARTWORK_STORAGE_KEY),
    };
  }

  function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function replaceVariables(text) {
    return String(text || "")
      .replaceAll("{name}", state.name)
      .replaceAll("{date}", formatDate())
      .replaceAll("{gameCount}", state.completedGames.size)
      .replaceAll("{achievementCount}", state.earnedAchievements.size);
  }

  function matchesCondition(condition = {}) {
    if (condition.always) return true;

    const hasEvery = (values, available) =>
      !values || values.every((value) => available.has(value));
    const hasSome = (values, available) =>
      !values || values.length === 0 || values.some((value) => available.has(value));

    if (!hasSome(condition.games, state.completedGames)) return false;
    if (!hasEvery(condition.allGames, state.completedGames)) return false;
    if (!hasSome(condition.achievements, state.earnedAchievements)) return false;
    if (!hasEvery(condition.allAchievements, state.earnedAchievements)) return false;
    if (
      Number.isFinite(condition.minimumGames) &&
      state.completedGames.size < condition.minimumGames
    ) {
      return false;
    }
    if (
      Number.isFinite(condition.minimumAchievements) &&
      state.earnedAchievements.size < condition.minimumAchievements
    ) {
      return false;
    }
    if (typeof condition.artwork === "boolean" && condition.artwork !== Boolean(state.artwork)) {
      return false;
    }
    if (condition.noProgress && (state.completedGames.size > 0 || state.earnedAchievements.size > 0)) {
      return false;
    }

    return Object.keys(condition).length > 0;
  }

  function renderArticle() {
    kicker.textContent = replaceVariables(config.kicker);
    title.textContent = replaceVariables(config.title);
    meta.textContent = replaceVariables(config.meta);

    selectedSections = (config.sections || []).filter((section) =>
      matchesCondition(section.when),
    );

    paragraphs.replaceChildren(
      ...selectedSections.map((section) => {
        const paragraph = document.createElement("p");
        paragraph.dataset.section = section.id || "";
        paragraph.textContent = replaceVariables(section.text);
        return paragraph;
      }),
    );

    artworkImage.removeAttribute("src");
    if (state.artwork) {
      artworkSection.classList.remove("is-empty");
      artworkImage.src = state.artwork;
      artworkCaption.textContent = replaceVariables(config.artwork?.caption);
    } else {
      artworkSection.classList.add("is-empty");
      artworkCaption.textContent = replaceVariables(config.artwork?.emptyCaption);
    }
  }

  function getWrappedLines(text, maxWidth) {
    let line = "";
    const lines = [];

    for (const character of text) {
      if (character === "\n") {
        if (line) lines.push(line);
        line = "";
        continue;
      }

      const candidate = line + character;
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }

    if (line) lines.push(line);
    return lines;
  }

  function drawTextLines(lines, x, y, lineHeight) {
    lines.forEach((line) => {
      context.fillText(line, x, y);
      y += lineHeight;
    });
    return y;
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function drawContainImage(image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    const drawnX = x + (width - drawnWidth) / 2;
    const drawnY = y + (height - drawnHeight) / 2;

    context.fillStyle = "#ffffff";
    context.fillRect(x, y, width, height);
    context.drawImage(image, drawnX, drawnY, drawnWidth, drawnHeight);
  }

  async function drawDownloadCard() {
    const width = 1080;
    const textX = 76;
    const textWidth = width - textX * 2;
    const lineHeight = 52;
    const paragraphGap = 22;

    canvas.width = width;
    context.font = "31px 'LXGW WenKai Mono TC', serif";
    const paragraphLines = selectedSections.map((section) =>
      getWrappedLines(replaceVariables(section.text), textWidth),
    );
    const textHeight = paragraphLines.reduce(
      (total, lines) => total + lines.length * lineHeight + paragraphGap,
      0,
    );
    const artworkHeight = state.artwork ? 370 : 0;
    canvas.height = Math.max(1350, Math.ceil(300 + textHeight + artworkHeight + 110));

    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f7f8f3";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#474d64";
    context.fillRect(54, 54, width - 108, 8);

    context.fillStyle = "#6c7390";
    context.font = "700 28px 'LXGW WenKai Mono TC', serif";
    context.textAlign = "left";
    context.fillText(replaceVariables(config.kicker), textX, 118);
    context.fillStyle = "#252834";
    context.font = "700 54px 'LXGW WenKai Mono TC', serif";
    context.fillText(replaceVariables(config.title), textX, 185);
    context.fillStyle = "#6b7080";
    context.font = "28px 'LXGW WenKai Mono TC', serif";
    context.fillText(replaceVariables(config.meta), textX, 230);

    let y = 300;
    context.fillStyle = "#303442";
    context.font = "31px 'LXGW WenKai Mono TC', serif";
    paragraphLines.forEach((lines) => {
      y = drawTextLines(lines, textX, y, lineHeight) + paragraphGap;
    });

    if (state.artwork) {
      try {
        const image = await loadImage(state.artwork);
        const imageHeight = 280;
        context.fillStyle = "#6c7390";
        context.font = "700 25px 'LXGW WenKai Mono TC', serif";
        context.fillText(replaceVariables(config.artwork?.caption), textX, y + 4);
        drawContainImage(image, textX, y + 30, textWidth, imageHeight);
        context.strokeStyle = "#9ba6c0";
        context.lineWidth = 3;
        context.strokeRect(textX, y + 30, textWidth, imageHeight);
        y += imageHeight + 70;
      } catch (error) {
        console.warn("Artwork could not be added to memorial card:", error);
      }
    }

    context.fillStyle = "#74798a";
    context.font = "25px 'LXGW WenKai Mono TC', serif";
    context.fillText(formatDate(), textX, height - 62);
  }

  async function refreshCard() {
    if (!config) return;

    state = getState();
    renderArticle();
    await drawDownloadCard();
  }

  async function loadCardConfig() {
    try {
      const response = await fetch(CONFIG_PATH);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      config = await response.json();
      await refreshCard();
    } catch (error) {
      console.error("Memorial card configuration could not be loaded:", error);
      title.textContent = "紀念卡暫時無法整理";
      meta.textContent = "請重新整理頁面後再試一次。";
    }
  }

  generateButton.addEventListener("click", refreshCard);
  downloadButton.addEventListener("click", async () => {
    await refreshCard();
    const link = document.createElement("a");
    link.download = `YMSH_紀念卡_${state.name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
  backButton.addEventListener("click", () => {
    window.location.href = "map.html";
  });

  loadCardConfig();
}

window.initPrincipal = initPrincipal;
