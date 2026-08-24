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
  const dateMark = document.getElementById("dateMark");

  const leftPage = document.querySelector(".memorial-page--left");
  const rightPage = document.querySelector(".memorial-page--right");
  const leftParagraphs = document.getElementById("memorialParagraphsLeft");
  const rightParagraphs = document.getElementById("memorialParagraphsRight");
  const artworkSection = document.getElementById("artworkSection");
  const artworkImage = document.getElementById("artworkImage");
  const artworkCaption = document.getElementById("artworkCaption");

  let config;
  let state;
  let selectedSections = [];
  let leftSections = [];
  let rightSections = [];
  let cardLeftSections = [];
  let cardRightSections = [];

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
      !values ||
      values.length === 0 ||
      values.some((value) => available.has(value));

    if (!hasSome(condition.games, state.completedGames)) return false;
    if (!hasEvery(condition.allGames, state.completedGames)) return false;
    if (!hasSome(condition.achievements, state.earnedAchievements))
      return false;
    if (!hasEvery(condition.allAchievements, state.earnedAchievements))
      return false;
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
    if (
      typeof condition.artwork === "boolean" &&
      condition.artwork !== Boolean(state.artwork)
    ) {
      return false;
    }
    if (
      condition.noProgress &&
      (state.completedGames.size > 0 || state.earnedAchievements.size > 0)
    ) {
      return false;
    }

    return Object.keys(condition).length > 0;
  }

  function splitSectionsForCard(sections) {
    if (sections.length < 2) {
      return { left: sections, right: [] };
    }

    const textWidth = 792;
    const lineHeight = 43;
    const paragraphGap = 20;
    const getTextHeight = (items) => {
      context.font = "27px 'LXGW WenKai Mono TC', serif";
      return items.reduce((height, section) => {
        const lines = getWrappedLines(replaceVariables(section.text), textWidth);
        return height + lines.length * lineHeight + paragraphGap;
      }, 0);
    };

    context.font = "700 48px 'LXGW WenKai Mono TC', serif";
    const titleHeight = getWrappedLines(replaceVariables(config.title), textWidth).length * 60;
    context.font = "700 23px 'LXGW WenKai Mono TC', serif";
    const artworkCaptionHeight = state.artwork
      ? getWrappedLines(replaceVariables(config.artwork?.caption), textWidth).length * 34 + 24
      : 0;
    const leftFixedHeight = 104 + titleHeight + 98;
    const rightFixedHeight = state.artwork ? 94 + artworkCaptionHeight + 308 : 94;
    let bestSplit = 1;
    let smallestDifference = Number.POSITIVE_INFINITY;

    for (let splitIndex = 1; splitIndex < sections.length; splitIndex += 1) {
      const leftHeight = leftFixedHeight + getTextHeight(sections.slice(0, splitIndex));
      const rightHeight = rightFixedHeight + getTextHeight(sections.slice(splitIndex));
      const difference = Math.abs(leftHeight - rightHeight);

      if (difference < smallestDifference) {
        bestSplit = splitIndex;
        smallestDifference = difference;
      }
    }

    return {
      left: sections.slice(0, bestSplit),
      right: sections.slice(bestSplit),
    };
  }

  function renderParagraphs(container, sections) {
    container.replaceChildren(
      ...sections.map((section) => {
        const paragraph = document.createElement("p");
        paragraph.dataset.section = section.id || "";
        paragraph.textContent = replaceVariables(section.text);
        return paragraph;
      }),
    );
  }

  function getOuterHeight(element) {
    const styles = window.getComputedStyle(element);
    return (
      element.offsetHeight +
      (Number.parseFloat(styles.marginTop) || 0) +
      (Number.parseFloat(styles.marginBottom) || 0)
    );
  }

  function getFixedContentHeight(page, paragraphContainer) {
    return [...page.children]
      .filter((element) => element !== paragraphContainer)
      .reduce((height, element) => height + getOuterHeight(element), 0);
  }

  function splitSectionsAcrossPages(sections) {
    if (sections.length < 2) {
      return { left: sections, right: [] };
    }

    let bestSplit = 1;
    let smallestDifference = Number.POSITIVE_INFINITY;

    for (let splitIndex = 1; splitIndex < sections.length; splitIndex += 1) {
      const left = sections.slice(0, splitIndex);
      const right = sections.slice(splitIndex);
      renderParagraphs(leftParagraphs, left);
      renderParagraphs(rightParagraphs, right);

      const leftHeight =
        leftParagraphs.offsetHeight +
        getFixedContentHeight(leftPage, leftParagraphs);
      const rightHeight =
        rightParagraphs.offsetHeight +
        getFixedContentHeight(rightPage, rightParagraphs);
        // 有改要記得這裡得高度要記得加
        getOuterHeight(dateMark);
      const difference = Math.abs(leftHeight - rightHeight);

      if (difference < smallestDifference) {
        bestSplit = splitIndex;
        smallestDifference = difference;
      }
    }

    return {
      left: sections.slice(0, bestSplit),
      right: sections.slice(bestSplit),
    };
  }

  function renderArticle() {
    kicker.textContent = replaceVariables(config.kicker);
    title.textContent = replaceVariables(config.title);
    meta.textContent = replaceVariables(config.meta);
    dateMark.textContent = replaceVariables(config["time-mark"]);

    selectedSections = (config.sections || []).filter((section) =>
      matchesCondition(section.when),
    );

    artworkImage.removeAttribute("src");
    if (state.artwork) {
      artworkSection.classList.remove("is-empty");
      artworkImage.src = state.artwork;
      artworkCaption.textContent = replaceVariables(config.artwork?.caption);
    } else {
      artworkSection.classList.add("is-empty");
      artworkCaption.textContent = replaceVariables(
        config.artwork?.emptyCaption,
      );
    }

    ({ left: cardLeftSections, right: cardRightSections } =
      splitSectionsForCard(selectedSections));
    ({ left: leftSections, right: rightSections } =
      splitSectionsAcrossPages(selectedSections));
    renderParagraphs(leftParagraphs, leftSections);
    renderParagraphs(rightParagraphs, rightSections);
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

  function drawRightAlignedTextLines(lines, x, y, lineHeight) {
    context.textAlign = "right";
    lines.forEach((line) => {
      context.fillText(line, x, y);
      y += lineHeight;
    });
    context.textAlign = "left";
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
    const outerMargin = 64;
    const pageWidth = 900;
    const pageGap = 24;
    const pagePadding = 54;
    const width = outerMargin * 2 + pageWidth * 2 + pageGap;
    const textWidth = pageWidth - pagePadding * 2;
    const lineHeight = 43;
    const paragraphGap = 20;

    canvas.width = width;
    context.font = "27px 'LXGW WenKai Mono TC', serif";
    const makeLines = (sections) =>
      sections.map((section) =>
        getWrappedLines(replaceVariables(section.text), textWidth),
      );
    const leftLines = makeLines(cardLeftSections);
    const rightLines = makeLines(cardRightSections);
    const getTextHeight = (groups) =>
      groups.reduce(
        (total, lines) => total + lines.length * lineHeight + paragraphGap,
        0,
      );
    context.font = "700 48px 'LXGW WenKai Mono TC', serif";
    const titleLines = getWrappedLines(
      replaceVariables(config.title),
      textWidth,
    );
    context.font = "25px 'LXGW WenKai Mono TC', serif";
    const metaLines = getWrappedLines(replaceVariables(config.meta), textWidth);
    const headerHeight = 104 + titleLines.length * 60 + 98;
    const artworkHeight = state.artwork ? 300 : 0;
    context.font = "700 23px 'LXGW WenKai Mono TC', serif";
    const artworkLabelHeight = state.artwork
      ? getWrappedLines(replaceVariables(config.artwork?.caption), textWidth).length * 34 + 24
      : 0;
    const pageHeight = Math.max(
      1040,
      headerHeight + getTextHeight(leftLines) + 80,
      100 +
        getTextHeight(rightLines) +
        artworkLabelHeight +
        artworkHeight +
        100,
    );
    const height = outerMargin * 2 + pageHeight;
    const leftX = outerMargin;
    const rightX = leftX + pageWidth + pageGap;
    const contentLeftX = leftX + pagePadding;
    const contentRightX = rightX + pagePadding;

    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#e7ebf2";
    context.fillRect(0, 0, width, height);

    [leftX, rightX].forEach((pageX) => {
      context.fillStyle = "#f9faf6";
      context.fillRect(pageX, outerMargin, pageWidth, pageHeight);
      context.strokeStyle = "#a7b0c1";
      context.lineWidth = 2;
      context.strokeRect(pageX, outerMargin, pageWidth, pageHeight);
    });
    context.fillStyle = "#474d64";
    context.fillRect(
      leftX + pageWidth,
      outerMargin + 12,
      pageGap,
      pageHeight - 24,
    );

    context.textAlign = "left";
    context.fillStyle = "#6c7390";
    context.font = "700 26px 'LXGW WenKai Mono TC', serif";
    context.fillText(
      replaceVariables(config.kicker),
      contentLeftX,
      outerMargin + 76,
    );
    context.fillStyle = "#6b7080";
    context.font = "25px 'LXGW WenKai Mono TC', serif";
    drawRightAlignedTextLines(
      metaLines,
      leftX + pageWidth - pagePadding,
      outerMargin + 76,
      38,
    );

    context.fillStyle = "#252834";
    context.font = "700 48px 'LXGW WenKai Mono TC', serif";
    let leftY = drawTextLines(titleLines, contentLeftX, outerMargin + 162, 60);
    leftY += 14;

    context.fillStyle = "#303442";
    context.font = "27px 'LXGW WenKai Mono TC', serif";
    leftLines.forEach((lines) => {
      leftY =
        drawTextLines(lines, contentLeftX, leftY, lineHeight) + paragraphGap;
    });

    let rightY = outerMargin + 94;
    rightLines.forEach((lines) => {
      rightY =
        drawTextLines(lines, contentRightX, rightY, lineHeight) + paragraphGap;
    });

    if (state.artwork) {
      try {
        const image = await loadImage(state.artwork);
        context.fillStyle = "#6c7390";
        context.font = "700 23px 'LXGW WenKai Mono TC', serif";
        rightY = drawTextLines(
          getWrappedLines(replaceVariables(config.artwork?.caption), textWidth),
          contentRightX,
          rightY + 16,
          34,
        );
        const imageY = rightY + 8;
        drawContainImage(
          image,
          contentRightX,
          imageY,
          textWidth,
          artworkHeight,
        );
        context.strokeStyle = "#9ba6c0";
        context.lineWidth = 3;
        context.strokeRect(contentRightX, imageY, textWidth, artworkHeight);
      } catch (error) {
        console.warn("Artwork could not be added to memorial card:", error);
      }
    }

    context.fillStyle = "#74798a";
    context.font = "23px 'LXGW WenKai Mono TC', serif";
    context.textAlign = "right";
    context.fillText(
      replaceVariables(config["time-mark"]),
      rightX + pageWidth - pagePadding,
      outerMargin + pageHeight - 48,
    );
    context.textAlign = "left";
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
