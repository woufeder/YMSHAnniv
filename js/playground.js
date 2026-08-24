document.addEventListener("DOMContentLoaded", () => {
  const gameTitle = document.getElementById("gameTitle");
  const leadCount = document.getElementById("leadCount");
  const leadProgress = document.getElementById("leadProgress");
  const timeCount = document.getElementById("timeCount");
  const endingDialogue = document.getElementById("game");
  const introStorageKey = "seen_intro_playground";
  const ambience = new Audio(resolveAppAsset("assets/audio/playground.wav"));
  const playgroundRescue = document.querySelector(".playground-rescue");
  const gameBoard = document.getElementById("gameBoard");
  const gameFeedback = document.getElementById("gameFeedback");
  const gameIntroModal = document.getElementById("gameIntroModal");
  const gameIntroText = document.getElementById("gameIntroText");
  const startGameButton = document.getElementById("startGame");

  let gameData;
  let sequence = [];
  let cueIndex = 0;
  let successfulHits = 0;
  let roundStart = 0;
  let inputAcceptedThisBeat = false;
  let gameActive = false;
  let beatTimer;
  let countdownTimer;
  let gameEndsAt = 0;
  let activeCue;
  let activeCueElement;
  let beatRing;
  let cueQueue;

  ambience.loop = true;

  function updateAmbienceVolume() {
    const bgmVolume = SettingsManager.get("bgmVolume", 0.1);
    ambience.volume = Math.min(bgmVolume * 1, 1);
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

  function makeButton({ label, icon, className = "", onClick }) {
    const button = document.createElement("button");
    const labelElement = document.createElement("span");
    button.type = "button";
    button.className = `rescue-button ${className}`.trim();
    button.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
    labelElement.textContent = label;
    button.append(labelElement);
    button.addEventListener("click", onClick);
    return button;
  }

  function setFeedback(message = "", type = "") {
    gameFeedback.textContent = message;
    gameFeedback.className = `game-feedback ${type ? `is-${type}` : ""}`.trim();
  }

  function updateLeadCount() {
    leadCount.textContent = `${successfulHits} / ${gameData.captureHits}`;
    leadProgress.style.width = `${(successfulHits / gameData.captureHits) * 100}%`;
  }

  function markPlaygroundCompleted() {
    const completedGames = JSON.parse(localStorage.getItem("completedGames")) || [];

    if (!completedGames.includes("playground")) {
      completedGames.push("playground");
      localStorage.setItem("completedGames", JSON.stringify(completedGames));
    }
  }

  function clearBeatTimer() {
    if (beatTimer) window.clearTimeout(beatTimer);
    beatTimer = undefined;
  }

  function clearCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = undefined;
  }

  function buildSequence(length) {
    const result = [];
    while (result.length < length) {
      const previousCue = result[result.length - 1];
      const candidates = gameData.cues.filter(
        (cue) => cue.id !== previousCue?.id,
      );
      result.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    return result;
  }

  function renderCueQueue() {
    cueQueue.replaceChildren(
      ...sequence.slice(cueIndex, cueIndex + 5).map((cue, index) => {
        const item = document.createElement("span");
        item.className = index === 0 ? "cue-chip is-current" : "cue-chip";
        item.innerHTML = `<i class="fa-solid ${cue.icon}" aria-hidden="true"></i>`;
        const label = document.createElement("span");
        label.textContent = cue.label;
        item.append(label);
        return item;
      }),
    );
  }

  function renderGameBoard() {
    const stage = document.createElement("section");
    stage.className = "rhythm-stage";
    const beatArea = document.createElement("div");
    beatArea.className = "beat-area";
    beatRing = document.createElement("div");
    beatRing.className = "beat-ring";
    activeCueElement = document.createElement("div");
    activeCueElement.className = "active-cue";
    beatArea.append(beatRing, activeCueElement);

    cueQueue = document.createElement("div");
    cueQueue.className = "cue-queue";
    const controls = document.createElement("div");
    controls.className = "rhythm-controls";
    gameData.cues.forEach((cue) => {
      const button = makeButton({
        label: cue.label,
        icon: cue.icon,
        className: "rhythm-control",
        onClick: () => handleCue(cue),
      });
      const key = document.createElement("kbd");
      key.textContent = {
        ArrowLeft: "←",
        ArrowRight: "→",
        ArrowUp: "↑",
        ArrowDown: "↓",
      }[cue.key];
      button.append(key);
      controls.append(button);
    });
    stage.append(beatArea, cueQueue, controls);
    gameBoard.append(stage);
  }

  function restartBeatRing() {
    beatRing.style.animation = "none";
    void beatRing.offsetWidth;
    beatRing.style.animation = `beat-window ${gameData.tempo}ms linear forwards`;
  }

  function startRound() {
    if (!gameActive) return;

    activeCue = sequence[cueIndex];
    inputAcceptedThisBeat = false;
    roundStart = performance.now();
    updateLeadCount();
    activeCueElement.className = "active-cue";
    activeCueElement.innerHTML = `<i class="fa-solid ${activeCue.icon}" aria-hidden="true"></i><p>${activeCue.hint}</p>`;
    renderCueQueue();
    restartBeatRing();
    clearBeatTimer();
    beatTimer = window.setTimeout(() => {
      if (!inputAcceptedThisBeat) {
        activeCueElement.classList.add("is-missed");
        setFeedback(gameData.feedback.miss, "error");
      }
      startRound();
    }, gameData.tempo);
  }

  function handleCue(cue) {
    if (!gameActive || inputAcceptedThisBeat) return;
    const elapsed = performance.now() - roundStart;
    const beatProgress = elapsed / gameData.tempo;
    const isCorrect = cue.id === activeCue.id;
    const isOnBeat = beatProgress >= 0.3 && beatProgress <= 0.9;

    if (!isCorrect) {
      activeCueElement.classList.add("is-wrong");
      setFeedback(gameData.feedback.wrong, "error");
      return;
    }

    if (!isOnBeat) {
      activeCueElement.classList.add("is-good");
      setFeedback(gameData.feedback.timing, "error");
      return;
    }

    inputAcceptedThisBeat = true;
    clearBeatTimer();
    activeCueElement.classList.add("is-perfect");
    setFeedback(gameData.feedback.perfect, "success");
    successfulHits += 1;
    cueIndex += 1;
    updateLeadCount();

    if (successfulHits >= gameData.captureHits) {
      showEndingDialogue("success");
      return;
    }

    window.setTimeout(startRound, 140);
  }

  function updateCountdown() {
    const remaining = Math.max(0, gameEndsAt - Date.now());
    timeCount.textContent = `${Math.ceil(remaining / 1000)}`;

    if (remaining === 0) {
      showEndingDialogue("escape");
    }
  }

  function startCountdown() {
    clearCountdown();
    gameEndsAt = Date.now() + gameData.timeLimit * 1000;
    updateCountdown();
    countdownTimer = window.setInterval(updateCountdown, 100);
  }

  function showStartModal() {
    gameActive = false;
    clearBeatTimer();
    clearCountdown();
    playgroundRescue.classList.add("hidden");
    gameIntroText.textContent = `在 ${gameData.timeLimit} 秒內，依照畫面提示按下正確方向鍵；成功 ${gameData.captureHits} 次就能抓到小狗。`;
    gameIntroModal.classList.remove("hidden");
  }

  function renderGame() {
    gameActive = true;
    gameIntroModal.classList.add("hidden");
    playgroundRescue.classList.remove("hidden");
    gameBoard.replaceChildren();
    setFeedback();
    renderGameBoard();
    startCountdown();
    startRound();
  }

  function showEndingDialogue(outcome) {
    if (!gameActive) return;

    gameActive = false;
    clearBeatTimer();
    clearCountdown();
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
    sequence = buildSequence(80);
    cueIndex = 0;
    successfulHits = 0;
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

  function handleKeyboardCue(event) {
    if (!gameActive || event.repeat) return;
    const cue = gameData.cues.find((candidate) => candidate.key === event.key);
    if (!cue) return;
    event.preventDefault();
    handleCue(cue);
  }

  startGameButton.addEventListener("click", startGame);

  async function loadGame() {
    try {
      const response = await fetch("data/playground.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      gameData = await response.json();
      gameTitle.textContent = gameData.title;
      updateLeadCount();
      timeCount.textContent = `${gameData.timeLimit}`;
      document.addEventListener("keydown", handleKeyboardCue);
      document.addEventListener("pointerdown", startAmbience);
      document.addEventListener("keydown", startAmbience);
      window.bgm?.setTemporaryVolumeMultiplier(0.5);
      window.addEventListener("ymsh:settings-changed", (event) => {
        if (event.detail?.key === "bgmVolume") updateAmbienceVolume();
      });
      window.addEventListener("pagehide", () => {
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
      gameIntroText.textContent = "遊戲資料無法載入，請重新整理後再試。";
      gameIntroModal.classList.remove("hidden");
    }
  }

  loadGame();
});
