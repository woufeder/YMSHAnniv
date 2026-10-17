document.addEventListener("DOMContentLoaded", () => {
  const gameTitle = document.getElementById("gameTitle");
  const exitCount = document.getElementById("exitCount");
  const fenceCount = document.getElementById("fenceCount");
  const endingDialogue = document.getElementById("game");
  const playgroundRescue = document.querySelector(".playground-rescue");
  const gameBoard = document.getElementById("gameBoard");
  const gameFeedback = document.getElementById("gameFeedback");
  const gameIntroModal = document.getElementById("gameIntroModal");
  const gameIntroTitle = document.getElementById("gameIntroTitle");
  const gameIntroText = document.getElementById("gameIntroText");
  const startGameButton = document.getElementById("startGame");
  const introStorageKey = "seen_intro_playground";
  const lastMapStorageKey = "ymsh:lastPlaygroundMap";
  const ambience = new Audio(resolveAppAsset("assets/audio/playground.wav"));

  let gameData;
  let currentMap;
  let dogPosition;
  let placedFences = new Set();
  let placementOrder = [];
  let gameActive = false;
  let animationToken = 0;

  ambience.loop = true;

  function updateAmbienceVolume() {
    const bgmVolume = SettingsManager.get("bgmVolume", 0.1);
    ambience.volume = Math.min(bgmVolume, 1);
  }

  function startAmbience() {
    updateAmbienceVolume();
    ambience
      .play()
      .then(() => {
        document.removeEventListener("pointerdown", startAmbience);
        document.removeEventListener("keydown", startAmbience);
      })
      .catch(() => {});
  }

  function cellKey(cell) {
    return `${cell[0]},${cell[1]}`;
  }

  function cellsEqual(first, second) {
    return first[0] === second[0] && first[1] === second[1];
  }

  function getNeighbors(cell, size) {
    const [row, column] = cell;
    return [
      [row - 1, column],
      [row + 1, column],
      [row, column - 1],
      [row, column + 1],
    ].filter(
      ([nextRow, nextColumn]) =>
        nextRow >= 0 &&
        nextColumn >= 0 &&
        nextRow < size &&
        nextColumn < size,
    );
  }

  function findPath(start, destination, blockedCells, size) {
    const startKey = cellKey(start);
    const destinationKey = cellKey(destination);
    if (blockedCells.has(startKey) || blockedCells.has(destinationKey)) return null;

    const queue = [start];
    const previous = new Map([[startKey, null]]);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const currentKey = cellKey(current);
      if (currentKey === destinationKey) break;

      getNeighbors(current, size).forEach((neighbor) => {
        const neighborKey = cellKey(neighbor);
        if (blockedCells.has(neighborKey) || previous.has(neighborKey)) return;
        previous.set(neighborKey, currentKey);
        queue.push(neighbor);
      });
    }

    if (!previous.has(destinationKey)) return null;

    const path = [];
    let cursor = destinationKey;
    while (cursor) {
      path.unshift(cursor.split(",").map(Number));
      cursor = previous.get(cursor);
    }
    return path;
  }

  function analyzeBoard() {
    const blockedCells = new Set([
      ...currentMap.fixedBlocks.map(cellKey),
      ...placedFences,
    ]);
    const makeRoute = (exit, type) => ({
      ...exit,
      type,
      path: findPath(dogPosition, exit.cell, blockedCells, currentMap.size),
    });
    const targetRoute = makeRoute(currentMap.targetExit, "target");
    const dangerRoutes = currentMap.dangerExits.map((exit) =>
      makeRoute(exit, "danger"),
    );
    const reachableDangerRoutes = dangerRoutes.filter((route) => route.path);
    const reachableRoutes = [targetRoute, ...dangerRoutes].filter(
      (route) => route.path,
    );
    const previewRoute =
      [...reachableDangerRoutes].sort(
        (first, second) => first.path.length - second.path.length,
      )[0] || (targetRoute.path ? targetRoute : null);

    return {
      targetRoute,
      dangerRoutes,
      reachableDangerRoutes,
      reachableRoutes,
      previewRoute,
    };
  }

  function setFeedback(message = "", type = "") {
    gameFeedback.textContent = message;
    gameFeedback.className = `game-feedback ${type ? `is-${type}` : ""}`.trim();
  }

  function formatFeedback(template, count) {
    return template.replace("{count}", count);
  }

  function updateBoardStatus(analysis, announce = true) {
    exitCount.textContent = `${analysis.reachableRoutes.length}`;
    fenceCount.textContent = `${gameData.fenceLimit - placedFences.size}`;

    if (!announce) return;
    if (!analysis.targetRoute.path && analysis.reachableDangerRoutes.length === 0) {
      setFeedback(gameData.feedback.blocked, "error");
      return;
    }
    if (analysis.reachableDangerRoutes.length === 0 && analysis.targetRoute.path) {
      setFeedback(gameData.feedback.ready, "success");
      return;
    }
    setFeedback(
      formatFeedback(gameData.feedback.open, analysis.reachableDangerRoutes.length),
      "warning",
    );
  }

  function createIcon(className) {
    const icon = document.createElement("i");
    icon.className = `fa-solid ${className}`;
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function getExitAt(cell) {
    if (cellsEqual(cell, currentMap.targetExit.cell)) {
      return { ...currentMap.targetExit, type: "target" };
    }
    const dangerExit = currentMap.dangerExits.find((exit) =>
      cellsEqual(cell, exit.cell),
    );
    return dangerExit ? { ...dangerExit, type: "danger" } : null;
  }

  function createCourtCell(row, column, analysis) {
    const position = [row, column];
    const key = cellKey(position);
    const fixed = currentMap.fixedBlocks.some((cell) => cellsEqual(cell, position));
    const placeable = currentMap.placementCells.some((cell) =>
      cellsEqual(cell, position),
    );
    const occupied = placedFences.has(key);
    const isDog = cellsEqual(position, dogPosition);
    const exit = getExitAt(position);
    const onPreviewRoute = analysis.previewRoute?.path?.some((cell) =>
      cellsEqual(cell, position),
    );
    const cell = document.createElement(placeable ? "button" : "div");

    cell.className = "court-cell";
    cell.setAttribute("role", "gridcell");
    if (placeable) {
      cell.type = "button";
      cell.classList.add("is-placeable");
      cell.setAttribute("aria-pressed", occupied ? "true" : "false");
      cell.setAttribute(
        "aria-label",
        occupied ? "撤回這個位置的同學" : "安排同學守住這個位置",
      );
      cell.disabled = !gameActive;
      cell.addEventListener("click", () => toggleFence(position));
    }
    if (fixed) cell.classList.add("is-fixed");
    if (occupied) cell.classList.add("is-occupied");
    if (onPreviewRoute) cell.classList.add("is-route");
    if (isDog) cell.classList.add("has-dog");

    if (exit) {
      cell.classList.add(`is-${exit.type}-exit`, `exit-${exit.side}`);
      cell.title = exit.label;
      const exitMarker = document.createElement("span");
      exitMarker.className = "exit-marker";
      exitMarker.append(
        createIcon(exit.type === "target" ? "fa-people-arrows" : "fa-person-running"),
      );
      const exitLabel = document.createElement("span");
      exitLabel.textContent = exit.type === "target" ? "集合" : "缺口";
      exitMarker.append(exitLabel);
      cell.append(exitMarker);
    }

    if (fixed) {
      const blocker = document.createElement("span");
      blocker.className = "fixed-blocker";
      blocker.append(createIcon("fa-person"));
      blocker.title = "已經站定位的同學";
      cell.append(blocker);
    }

    if (placeable && !occupied) {
      const slot = document.createElement("span");
      slot.className = "placement-slot";
      slot.append(createIcon("fa-shoe-prints"));
      cell.append(slot);
    }

    if (occupied) {
      const fence = document.createElement("span");
      fence.className = "player-fence";
      fence.append(createIcon("fa-person-circle-check"));
      cell.append(fence);
    }

    if (onPreviewRoute && !isDog) {
      const paw = document.createElement("span");
      paw.className = "route-paw";
      paw.append(createIcon("fa-paw"));
      cell.append(paw);
    }

    if (isDog) {
      const dog = document.createElement("span");
      dog.className = "dog-token";
      dog.append(createIcon("fa-dog"));
      cell.append(dog);
    }

    return cell;
  }

  function createExitList(analysis) {
    const list = document.createElement("ul");
    list.className = "exit-list";
    [analysis.targetRoute, ...analysis.dangerRoutes].forEach((route) => {
      const item = document.createElement("li");
      const reachable = Boolean(route.path);
      item.className = `exit-list__item is-${route.type} ${
        reachable ? "is-open" : "is-closed"
      }`;
      item.append(
        createIcon(
          reachable
            ? route.type === "target"
              ? "fa-circle-check"
              : "fa-triangle-exclamation"
            : "fa-lock",
        ),
      );
      const text = document.createElement("span");
      text.textContent = route.label;
      const state = document.createElement("strong");
      state.textContent = reachable ? "可達" : "已封鎖";
      item.append(text, state);
      list.append(item);
    });
    return list;
  }

  function makeActionButton(label, icon, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `rescue-button ${className}`.trim();
    button.append(createIcon(icon), document.createTextNode(label));
    button.disabled = !gameActive;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderGameBoard(announce = true) {
    const analysis = analyzeBoard();
    const layout = document.createElement("div");
    layout.className = "pursuit-layout";

    const boardFrame = document.createElement("div");
    boardFrame.className = "court-frame";
    const board = document.createElement("div");
    board.className = "court-board";
    board.style.setProperty("--court-size", currentMap.size);
    board.setAttribute("role", "grid");
    board.setAttribute("aria-label", `${currentMap.name}圍捕路線圖`);
    for (let row = 0; row < currentMap.size; row += 1) {
      for (let column = 0; column < currentMap.size; column += 1) {
        board.append(createCourtCell(row, column, analysis));
      }
    }
    boardFrame.append(board);

    const routePanel = document.createElement("aside");
    routePanel.className = "route-panel";
    const mapLabel = document.createElement("p");
    mapLabel.className = "route-panel__label";
    mapLabel.textContent = "本次路線";
    const mapName = document.createElement("h4");
    mapName.textContent = currentMap.name;
    const briefing = document.createElement("p");
    briefing.className = "route-panel__briefing";
    briefing.textContent = currentMap.briefing;
    const routeHint = document.createElement("p");
    routeHint.className = "route-panel__hint";
    routeHint.append(createIcon("fa-paw"));
    routeHint.append(
      document.createTextNode(
        analysis.previewRoute
          ? `目前預測：${analysis.previewRoute.label}`
          : "目前沒有可通行的出口",
      ),
    );
    routePanel.append(mapLabel, mapName, briefing, createExitList(analysis), routeHint);

    const actions = document.createElement("div");
    actions.className = "puzzle-actions";
    const undoButton = makeActionButton("撤回", "fa-rotate-left", "", undoFence);
    undoButton.disabled = !gameActive || placementOrder.length === 0;
    const resetButton = makeActionButton("重設", "fa-arrow-rotate-right", "", resetBoard);
    resetButton.disabled = !gameActive || placedFences.size === 0;
    const releaseButton = makeActionButton(
      "開始圍捕",
      "fa-flag-checkered",
      "rescue-button--primary",
      releaseDog,
    );
    actions.append(undoButton, resetButton, releaseButton);

    layout.append(boardFrame, routePanel, actions);
    gameBoard.replaceChildren(layout);
    updateBoardStatus(analysis, announce);
  }

  function toggleFence(position) {
    if (!gameActive) return;
    const key = cellKey(position);
    if (placedFences.has(key)) {
      placedFences.delete(key);
      placementOrder = placementOrder.filter((placedKey) => placedKey !== key);
      renderGameBoard();
      return;
    }
    if (placedFences.size >= gameData.fenceLimit) {
      setFeedback(gameData.feedback.limit, "error");
      return;
    }
    placedFences.add(key);
    placementOrder.push(key);
    renderGameBoard();
  }

  function undoFence() {
    if (!gameActive || placementOrder.length === 0) return;
    const lastFence = placementOrder.pop();
    placedFences.delete(lastFence);
    renderGameBoard();
  }

  function resetBoard() {
    if (!gameActive) return;
    placedFences.clear();
    placementOrder = [];
    dogPosition = [...currentMap.dog];
    renderGameBoard();
  }

  function wait(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  async function animateDog(path, outcome) {
    gameActive = false;
    const token = ++animationToken;
    setFeedback(
      outcome === "success"
        ? "路線成立！大家收緊包圍，小狗正往集合門跑。"
        : "還有缺口！小狗立刻往沒有人守住的方向跑去。",
      outcome === "success" ? "success" : "error",
    );
    renderGameBoard(false);

    for (let index = 1; index < path.length; index += 1) {
      await wait(220);
      if (token !== animationToken) return;
      dogPosition = [...path[index]];
      renderGameBoard(false);
    }
    await wait(420);
    if (token === animationToken) showEndingDialogue(outcome);
  }

  function releaseDog() {
    if (!gameActive) return;
    const analysis = analyzeBoard();

    if (!analysis.targetRoute.path && analysis.reachableDangerRoutes.length === 0) {
      setFeedback(gameData.feedback.blocked, "error");
      return;
    }

    if (analysis.reachableDangerRoutes.length > 0) {
      const escapeRoute = [...analysis.reachableDangerRoutes].sort(
        (first, second) => first.path.length - second.path.length,
      )[0];
      animateDog(escapeRoute.path, "escape");
      return;
    }

    if (analysis.targetRoute.path) {
      animateDog(analysis.targetRoute.path, "success");
    }
  }

  function chooseRandomMap() {
    const lastMapId = sessionStorage.getItem(lastMapStorageKey);
    const alternatives = gameData.maps.filter((map) => map.id !== lastMapId);
    const pool = alternatives.length > 0 ? alternatives : gameData.maps;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    sessionStorage.setItem(lastMapStorageKey, selected.id);
    return selected;
  }

  function markPlaygroundCompleted() {
    const completedGames = JSON.parse(localStorage.getItem("completedGames")) || [];
    if (!completedGames.includes("playground")) {
      completedGames.push("playground");
      localStorage.setItem("completedGames", JSON.stringify(completedGames));
    }
  }

  function showStartModal() {
    gameActive = false;
    animationToken += 1;
    playgroundRescue.classList.add("hidden");
    gameIntroTitle.textContent = gameData.intro.title;
    gameIntroText.textContent = gameData.intro.text;
    gameIntroModal.classList.remove("hidden");
  }

  function renderGame() {
    gameActive = true;
    gameIntroModal.classList.add("hidden");
    playgroundRescue.classList.remove("hidden");
    gameTitle.textContent = gameData.title;
    setFeedback();
    renderGameBoard();
  }

  function showEndingDialogue(outcome) {
    gameActive = false;
    animationToken += 1;
    playgroundRescue.classList.add("hidden");
    gameIntroModal.classList.add("hidden");

    if (outcome === "success") {
      localStorage.setItem("ymsh:playgroundCompleted", "true");
      markPlaygroundCompleted();
      window.YMSHAchievements?.earn("playground-dog");
    }

    if (typeof DialogueCore !== "function") {
      if (outcome === "success") window.location.href = "map.html";
      else showStartModal();
      return;
    }

    endingDialogue.style.display = "block";
    const dataPath =
      outcome === "success"
        ? "data/playground-capture.json"
        : "data/playground-escape.json";
    const dialogue = new DialogueCore({
      container: "#game",
      data: dataPath,
      role: localStorage.getItem("playerRole") || "default",
      onFinish: () => {
        if (outcome === "success") window.location.href = "map.html";
      },
      onAction: (action) => {
        if (action === "playground:retry") {
          endingDialogue.style.display = "none";
          startGame();
        }
        if (action === "navigate:map") {
          window.location.href = "map.html";
        }
      },
    });
    dialogue.init().catch((error) => {
      console.error("Playground ending dialogue failed:", error);
      if (outcome === "success") window.location.href = "map.html";
      else showStartModal();
    });
  }

  function startGame() {
    animationToken += 1;
    currentMap = chooseRandomMap();
    dogPosition = [...currentMap.dog];
    placedFences = new Set();
    placementOrder = [];
    renderGame();
  }

  function startIntroDialogue() {
    if (
      localStorage.getItem(introStorageKey) === "true" ||
      typeof DialogueCore !== "function"
    ) {
      showStartModal();
      return;
    }

    endingDialogue.style.display = "block";
    const dialogue = new DialogueCore({
      container: "#game",
      data: "data/intro_playground.json",
      role: localStorage.getItem("playerRole") || "default",
      onFinish: () => {
        localStorage.setItem(introStorageKey, "true");
        endingDialogue.style.display = "none";
        showStartModal();
      },
    });
    dialogue.init().catch((error) => {
      console.error("Playground intro dialogue failed:", error);
      endingDialogue.style.display = "none";
      showStartModal();
    });
  }

  function handleKeyboard(event) {
    if (!gameActive || event.repeat) return;
    if (event.key === "Backspace" || event.key.toLowerCase() === "z") {
      event.preventDefault();
      undoFence();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      resetBoard();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      releaseDog();
    }
  }

  startGameButton.addEventListener("click", startGame);

  async function loadGame() {
    try {
      const response = await fetch("data/playground.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      gameData = await response.json();
      gameTitle.textContent = gameData.title;
      exitCount.textContent = `${gameData.maps[0].dangerExits.length + 1}`;
      fenceCount.textContent = `${gameData.fenceLimit}`;
      document.addEventListener("keydown", handleKeyboard);
      document.addEventListener("pointerdown", startAmbience);
      document.addEventListener("keydown", startAmbience);
      window.bgm?.setTemporaryVolumeMultiplier(0.5);
      window.addEventListener("ymsh:settings-changed", (event) => {
        if (event.detail?.key === "bgmVolume") updateAmbienceVolume();
      });
      window.addEventListener("pagehide", () => {
        animationToken += 1;
        ambience.pause();
        window.bgm?.setTemporaryVolumeMultiplier(1);
      });
      window.addEventListener("pageshow", (event) => {
        if (!event.persisted) return;
        window.bgm?.setTemporaryVolumeMultiplier(0.5);
        startAmbience();
      });
      startIntroDialogue();
    } catch (error) {
      console.error("Playground game could not be loaded:", error);
      gameIntroText.textContent = "遊戲資料暫時無法讀取，請重新整理頁面再試一次。";
      gameIntroModal.classList.remove("hidden");
    }
  }

  loadGame();
});
