document.addEventListener('DOMContentLoaded', () => {
  const gameKicker = document.getElementById('gameKicker');
  const gameTitle = document.getElementById('gameTitle');
  const leadCount = document.getElementById('leadCount');
  const timeCount = document.getElementById('timeCount');
  const endingDialogue = document.getElementById('game');
  const introStorageKey = 'seen_intro_playground';
  const ambience = new Audio(resolveAppAsset('assets/audio/playground.wav'));
  const playgroundRescue = document.querySelector('.playground-rescue');
  const sceneIcon = document.getElementById('sceneIcon');
  const sceneLabel = document.getElementById('sceneLabel');
  const sceneHeading = document.getElementById('sceneHeading');
  const sceneText = document.getElementById('sceneText');
  const gameBoard = document.getElementById('gameBoard');
  const gameFeedback = document.getElementById('gameFeedback');
  const gameActions = document.getElementById('gameActions');
  const captureHint = document.getElementById('captureHint');

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
    const bgmVolume = SettingsManager.get('bgmVolume', 0.1);
    ambience.volume = Math.min(bgmVolume * 1, 1);
  }

  function startAmbience() {
    updateAmbienceVolume();
    ambience.play().then(() => {
      document.removeEventListener('pointerdown', startAmbience);
      document.removeEventListener('keydown', startAmbience);
    }).catch(() => {});
  }

  function makeButton({ label, icon, className = '', onClick }) {
    const button = document.createElement('button');
    const labelElement = document.createElement('span');
    button.type = 'button';
    button.className = `rescue-button ${className}`.trim();
    button.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
    labelElement.textContent = label;
    button.append(labelElement);
    button.addEventListener('click', onClick);
    return button;
  }

  function setScene({ icon, label, title, text }) {
    sceneIcon.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
    sceneLabel.textContent = label;
    sceneHeading.textContent = title;
    sceneText.textContent = text;
    gameBoard.replaceChildren();
    gameActions.replaceChildren();
    setFeedback();
  }

  function setFeedback(message = '', type = '') {
    gameFeedback.textContent = message;
    gameFeedback.className = `game-feedback ${type ? `is-${type}` : ''}`.trim();
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
      const candidates = gameData.cues.filter(cue => cue.id !== previousCue?.id);
      result.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    return result;
  }

  function renderCueQueue() {
    cueQueue.replaceChildren(...sequence.slice(cueIndex, cueIndex + 5).map((cue, index) => {
      const item = document.createElement('span');
      item.className = index === 0 ? 'cue-chip is-current' : 'cue-chip';
      item.innerHTML = `<i class="fa-solid ${cue.icon}" aria-hidden="true"></i>`;
      const label = document.createElement('span');
      label.textContent = cue.label;
      item.append(label);
      return item;
    }));
  }

  function renderGameBoard() {
    const stage = document.createElement('section');
    stage.className = 'rhythm-stage';
    const beatArea = document.createElement('div');
    beatArea.className = 'beat-area';
    beatRing = document.createElement('div');
    beatRing.className = 'beat-ring';
    activeCueElement = document.createElement('div');
    activeCueElement.className = 'active-cue';
    beatArea.append(beatRing, activeCueElement);

    cueQueue = document.createElement('div');
    cueQueue.className = 'cue-queue';
    const controls = document.createElement('div');
    controls.className = 'rhythm-controls';
    gameData.cues.forEach(cue => {
      const button = makeButton({
        label: cue.label,
        icon: cue.icon,
        className: 'rhythm-control',
        onClick: () => handleCue(cue)
      });
      const key = document.createElement('kbd');
      key.textContent = cue.label;
      button.append(key);
      controls.append(button);
    });
    stage.append(beatArea, cueQueue, controls);
    gameBoard.append(stage);
  }

  function restartBeatRing() {
    beatRing.style.animation = 'none';
    void beatRing.offsetWidth;
    beatRing.style.animation = `beat-window ${gameData.tempo}ms linear forwards`;
  }

  function startRound() {
    if (!gameActive) return;

    activeCue = sequence[cueIndex];
    inputAcceptedThisBeat = false;
    roundStart = performance.now();
    leadCount.textContent = `${successfulHits} / ${gameData.captureHits}`;
    activeCueElement.className = 'active-cue';
    activeCueElement.innerHTML = `<i class="fa-solid ${activeCue.icon}" aria-hidden="true"></i><strong>${activeCue.label}</strong><span>${activeCue.hint}</span>`;
    renderCueQueue();
    restartBeatRing();
    clearBeatTimer();
    beatTimer = window.setTimeout(() => {
      if (!inputAcceptedThisBeat) {
        activeCueElement.classList.add('is-missed');
        setFeedback(gameData.feedback.miss, 'error');
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
      activeCueElement.classList.add('is-wrong');
      setFeedback(gameData.feedback.wrong, 'error');
      return;
    }

    if (!isOnBeat) {
      activeCueElement.classList.add('is-good');
      setFeedback(gameData.feedback.timing, 'error');
      return;
    }

    inputAcceptedThisBeat = true;
    clearBeatTimer();
    activeCueElement.classList.add('is-perfect');
    setFeedback(gameData.feedback.perfect, 'success');
    successfulHits += 1;
    cueIndex += 1;
    leadCount.textContent = `${successfulHits} / ${gameData.captureHits}`;

    if (successfulHits >= gameData.captureHits) {
      showEndingDialogue('success');
      return;
    }

    window.setTimeout(startRound, 140);
  }

  function updateCountdown() {
    const remaining = Math.max(0, gameEndsAt - Date.now());
    timeCount.textContent = `${Math.ceil(remaining / 1000)}`;

    if (remaining === 0) {
      showEndingDialogue('escape');
    }
  }

  function startCountdown() {
    clearCountdown();
    gameEndsAt = Date.now() + gameData.timeLimit * 1000;
    updateCountdown();
    countdownTimer = window.setInterval(updateCountdown, 100);
  }

  function renderIntro() {
    gameActive = false;
    clearBeatTimer();
    clearCountdown();
    playgroundRescue.classList.remove('hidden');
    captureHint.textContent = gameData.instructions;
    setScene({
      icon: 'fa-wave-square',
      label: '操場中央',
      title: gameData.intro.title,
      text: gameData.intro.text
    });
    gameActions.append(makeButton({
      label: gameData.intro.action,
      icon: 'fa-play',
      className: 'rescue-button--primary',
      onClick: startGame
    }));
  }

  function renderGame() {
    gameActive = true;
    captureHint.textContent = gameData.instructions;
    setScene({
      icon: 'fa-drum',
      label: '操場現場',
      title: '跟著大家的口令，不要搶拍',
      text: '口令會在拍點中央亮起；同一個方向會一直重複，直到你在正確拍點接住它。'
    });
    renderGameBoard();
    startCountdown();
    startRound();
  }

  function showEndingDialogue(outcome) {
    if (!gameActive) return;
    gameActive = false;
    clearBeatTimer();
    clearCountdown();

    if (outcome === 'success') {
      localStorage.setItem('ymsh:playgroundCompleted', 'true');
      window.YMSHAchievements?.earn('playground-dog');
    }

    if (typeof DialogueCore !== 'function') {
      renderOutcome(outcome);
      return;
    }

    endingDialogue.style.display = 'block';
    const dataPath = outcome === 'success'
      ? 'data/playground-capture.json'
      : 'data/playground-escape.json';
    const dialogue = new DialogueCore({
      container: '#game',
      data: dataPath,
      onFinish: () => {
        endingDialogue.style.display = 'none';
        renderOutcome(outcome);
      }
    });
    dialogue.init().catch((error) => {
      console.error('Playground ending dialogue failed:', error);
      endingDialogue.style.display = 'none';
      renderOutcome(outcome);
    });
  }

  function renderOutcome(outcome) {
    leadCount.textContent = `${successfulHits} / ${gameData.captureHits}`;
    timeCount.textContent = outcome === 'success' ? '完成' : '0';
    const isSuccess = outcome === 'success';
    setScene({
      icon: isSuccess ? 'fa-paw' : 'fa-door-open',
      label: isSuccess ? '操場側門' : '跑道旁邊',
      title: isSuccess ? gameData.success.title : '小狗從側門鑽出去了',
      text: isSuccess
        ? gameData.success.text
        : '這次的口令還沒接起來，但牠跑出去前仍回頭望了一眼。再試一次，把大家的節拍接得更長吧。'
    });
    gameActions.append(
      makeButton({
        label: gameData.success.replayAction,
        icon: 'fa-rotate-right',
        onClick: startGame
      }),
      makeButton({
        label: gameData.success.mapAction,
        icon: 'fa-map',
        className: 'rescue-button--primary',
        onClick: () => {
          window.location.href = 'map.html';
        }
      })
    );
  }

  function startGame() {
    sequence = buildSequence(80);
    cueIndex = 0;
    successfulHits = 0;
    renderGame();
  }

  function startIntroDialogue() {
    if (localStorage.getItem(introStorageKey) === 'true' || typeof DialogueCore !== 'function') {
      renderIntro();
      return;
    }

    endingDialogue.style.display = 'block';
    const dialogue = new DialogueCore({
      container: '#game',
      data: 'data/intro_playground.json',
      onFinish: () => {
        localStorage.setItem(introStorageKey, 'true');
        endingDialogue.style.display = 'none';
        renderIntro();
      }
    });
    dialogue.init().catch((error) => {
      console.error('Playground intro dialogue failed:', error);
      endingDialogue.style.display = 'none';
      renderIntro();
    });
  }

  function handleKeyboardCue(event) {
    if (!gameActive || event.repeat) return;
    const cue = gameData.cues.find(candidate => candidate.key === event.key);
    if (!cue) return;
    event.preventDefault();
    handleCue(cue);
  }

  async function loadGame() {
    try {
      const response = await fetch('data/playground.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      gameData = await response.json();
      gameKicker.textContent = gameData.kicker;
      gameTitle.textContent = gameData.title;
      leadCount.textContent = `0 / ${gameData.captureHits}`;
      timeCount.textContent = `${gameData.timeLimit}`;
      document.addEventListener('keydown', handleKeyboardCue);
      document.addEventListener('pointerdown', startAmbience);
      document.addEventListener('keydown', startAmbience);
      window.bgm?.setTemporaryVolumeMultiplier(0.5);
      window.addEventListener('ymsh:settings-changed', (event) => {
        if (event.detail?.key === 'bgmVolume') updateAmbienceVolume();
      });
      window.addEventListener('pagehide', () => {
        ambience.pause();
        window.bgm?.setTemporaryVolumeMultiplier(1);
      });
      window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        window.bgm?.setTemporaryVolumeMultiplier(0.5);
        startAmbience();
      });
      startIntroDialogue();
    } catch (error) {
      console.error('Playground game could not be loaded:', error);
      playgroundRescue.classList.remove('hidden');
      sceneLabel.textContent = '操場現場';
      sceneHeading.textContent = '暫時無法開啟口令練習';
      sceneText.textContent = '請重新整理頁面後再試一次。';
      setFeedback('遊戲文字檔沒有成功讀取。', 'error');
    }
  }

  loadGame();
});
