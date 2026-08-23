// garden.js - 花圃急救站
document.addEventListener('DOMContentLoaded', () => {
  const ROUND_DURATION = 60;
  const MAX_HEALTH = 5;
  const MAX_ACTIVE_EVENTS = 4;
  const SPAWN_INTERVAL = 1900;
  const eventGrid = document.getElementById('eventGrid');
  const timeElement = document.getElementById('timeRemaining');
  const scoreElement = document.getElementById('score');
  const comboElement = document.getElementById('combo');
  const healthElement = document.getElementById('health');
  const roundMessage = document.getElementById('roundMessage');
  const memoryPopup = document.getElementById('memoryPopup');
  const roundResult = document.getElementById('roundResult');
  const gameIntro = document.getElementById('gameIntro');
  const startButton = document.getElementById('startGame');
  const resultFlower = document.getElementById('resultFlower');
  const resultTitle = document.getElementById('resultTitle');
  const resultSummary = document.getElementById('resultSummary');
  const restartButton = document.getElementById('restartGame');
  const backButton = document.getElementById('backToMap');
  const toolButtons = [...document.querySelectorAll('.garden-tool')];
  const ambience = new Audio(resolveAppAsset('assets/audio/playground.wav'));

  // 事件類型定義：在此修改每個隨機事件的圖示(icon)、名稱(label)與所需工具(tool)
  const eventTypes = [
    {
      id: "dry",
      label: "土太乾了",
      icon: '<i class="fa-solid fa-droplet"></i>',
      tool: "water",
      points: 10,
      lifetime: 9000,
      success: "喝水咕嚕咕嚕",
    },
    {
      id: "shade",
      label: "天氣不好",
      icon: '<i class="fa-solid fa-sun"></i>',
      tool: "sunlight",
      points: 12,
      lifetime: 8500,
      success: "Do RE MI SO太陽出來囉",
    },
    {
      id: "hungry",
      label: "養分不夠",
      icon: '<i class="fa-solid fa-plant-wilt"></i>',
      tool: "fertilize",
      points: 14,
      lifetime: 8800,
      success: "土壤恢復精神",
    },
    {
      id: "weeds",
      label: "雜草太多",
      icon: '<i class="fa-solid fa-seedling"></i>',
      tool: "tidy",
      points: 12,
      lifetime: 8200,
      success: "花圃整理乾淨了",
    },
    {
      id: "memory",
      label: "有張紙條",
      icon: '<i class="fa-solid fa-note-sticky"></i>',
      tool: "tidy",
      points: 18,
      lifetime: 9800,
      success: "找到一張匿名紙條",
    },
  ];

  const toolSounds = {
    water: 'waterdrop',
    sunlight: 'sunshine',
    fertilize: 'put',
    tidy: 'grab',
  };
  const memories = [
    "無論生活把你栽種在哪，優雅地綻放。",
    "種樹的最佳時間是十年前，其次是現在。",
    "每個人都有自己綻放的時刻。",
    "最好的肥料是園丁的影子。",
    "願你如花，即使面對揉碎它的手，依然留下滿掌餘香。",
    "強大如地球，也需要經歷四季更迭方能變化。",
    "像花一樣，永遠向陽。",
    "未見之處，皆是繁花",
  ];

  let selectedTool = 'water';
  let score = 0;
  let combo = 0;
  let health = MAX_HEALTH;
  let timeRemaining = ROUND_DURATION;
  let gameActive = false;
  let slots = [];
  let spawnTimer = null;
  let countdownTimer = null;
  let memoryTimer = null;
  const activeEvents = new Map();

  ambience.loop = true;

  function updateAmbienceVolume() {
    ambience.volume = SettingsManager.get('bgmVolume', 0.25);
  }

  function startAmbience() {
    updateAmbienceVolume();
    ambience.play().then(() => {
      document.removeEventListener('pointerdown', startAmbience);
      document.removeEventListener('keydown', startAmbience);
    }).catch(() => {});
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function createGrid() {
    eventGrid.replaceChildren();
    slots = Array.from({ length: 16 }, (_, index) => {
      const slot = document.createElement('div');
      slot.className = 'garden-slot';
      slot.dataset.slot = index;
      eventGrid.appendChild(slot);
      return slot;
    });
  }

  function startRound() {
    stopTimers();
    activeEvents.forEach(event => {
      clearTimeout(event.timeoutId);
      clearTimeout(event.warningTimeoutId);
    });
    activeEvents.clear();
    score = 0;
    combo = 0;
    health = MAX_HEALTH;
    timeRemaining = ROUND_DURATION;
    gameActive = true;
    gameIntro.classList.add('hidden');
    roundResult.classList.add('hidden');
    hideMemory();
    createGrid();
    selectTool('water');
    setRoundMessage('巡園開始');
    renderStats();
    spawnEvent();
    spawnTimer = setInterval(spawnEvent, SPAWN_INTERVAL);
    countdownTimer = setInterval(tick, 1000);
  }

  function stopTimers() {
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    spawnTimer = null;
    countdownTimer = null;
  }

  function tick() {
    timeRemaining -= 1;
    renderStats();
    if (timeRemaining <= 0) {
      endRound(health > 0);
    }
  }

  function spawnEvent() {
    if (!gameActive || activeEvents.size >= MAX_ACTIVE_EVENTS) return;

    const availableSlots = slots.filter((_, index) => !activeEvents.has(index));
    if (!availableSlots.length) return;

    const slot = randomItem(availableSlots);
    const slotIndex = Number(slot.dataset.slot);
    const eventType = randomItem(eventTypes);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `garden-event garden-event--${eventType.id}`;
    button.setAttribute('aria-label', eventType.label);
    button.innerHTML = `<span class="event-icon" aria-hidden="true">${eventType.icon}</span><span>${eventType.label}</span>`;

    const event = { slotIndex, eventType, button, timeoutId: null, warningTimeoutId: null };
    button.addEventListener('click', () => handleEvent(event));
    slot.appendChild(button);
    activeEvents.set(slotIndex, event);
    event.warningTimeoutId = setTimeout(
      () => button.classList.add('is-expiring'),
      Math.max(eventType.lifetime - 2500, 0)
    );
    event.timeoutId = setTimeout(() => expireEvent(event), eventType.lifetime);
  }

  function handleEvent(event) {
    if (!gameActive || activeEvents.get(event.slotIndex) !== event) return;

    if (selectedTool === event.eventType.tool) {
      const comboBonus = Math.min(combo, 5) * 2;
      score += event.eventType.points + comboBonus;
      combo += 1;
      setRoundMessage(`${event.eventType.success} +${event.eventType.points + comboBonus}`);
      event.button.classList.add('is-resolved');
      if (event.eventType.id === 'memory') {
        showMemory();
      }
      playSound?.(toolSounds[event.eventType.tool]);
    } else {
      health -= 1;
      combo = 0;
      setRoundMessage('工具不對！，花圃健康下降');
      event.button.classList.add('is-missed');
    }

    resolveEvent(event);
    renderStats();
    if (health <= 0) {
      endRound(false);
    }
  }

  function expireEvent(event) {
    if (!gameActive || activeEvents.get(event.slotIndex) !== event) return;

    health -= 1;
    combo = 0;
    setRoundMessage(`${event.eventType.label}來不及處理`);
    resolveEvent(event);
    renderStats();
    if (health <= 0) {
      endRound(false);
    }
  }

  function resolveEvent(event) {
    clearTimeout(event.timeoutId);
    clearTimeout(event.warningTimeoutId);
    event.button.classList.remove('is-expiring');
    activeEvents.delete(event.slotIndex);
    setTimeout(() => event.button.remove(), 180);
  }

  function selectTool(tool) {
    selectedTool = tool;
    toolButtons.forEach(button => {
      const isSelected = button.dataset.tool === tool;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected.toString());
    });
  }

  function renderStats() {
    timeElement.textContent = timeRemaining;
    scoreElement.textContent = score;
    comboElement.textContent = combo;
    healthElement.textContent = `${'♥'.repeat(health)}${'♡'.repeat(MAX_HEALTH - health)}`;
    healthElement.setAttribute('aria-label', `健康值 ${health} / ${MAX_HEALTH}`);
  }

  function setRoundMessage(message) {
    roundMessage.textContent = message;
    roundMessage.classList.remove('is-visible');
    void roundMessage.offsetWidth;
    roundMessage.classList.add('is-visible');
  }

  function showMemory() {
    memoryPopup.textContent = randomItem(memories);
    memoryPopup.classList.add('show');
    clearTimeout(memoryTimer);
    memoryTimer = setTimeout(hideMemory, 2800);
  }

  function hideMemory() {
    memoryPopup.classList.remove('show');
  }

  function endRound(completed) {
    if (!gameActive) return;

    gameActive = false;
    stopTimers();
    activeEvents.forEach(event => {
      clearTimeout(event.timeoutId);
      clearTimeout(event.warningTimeoutId);
      event.button.disabled = true;
    });
    activeEvents.clear();

    const flower = score >= 160 ? '🌻' : score >= 100 ? '🌷' : '🌼';
    resultFlower.textContent = completed ? flower : '🥀';
    resultTitle.textContent = completed ? '巡園完成' : '花圃需要再照顧';
    resultSummary.textContent = completed
      ? `你守住了花圃，獲得 ${score} 分。`
      : `這次獲得 ${score} 分，再接再厲！`;
    roundResult.classList.remove('hidden');

    if (completed) {
      markGameComplete();
      if (health === MAX_HEALTH) {
        window.YMSHAchievements?.earn('garden-perfect');
      }
    }
  }

  function markGameComplete() {
    const completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];
    if (!completedGames.includes('garden')) {
      completedGames.push('garden');
      localStorage.setItem('completedGames', JSON.stringify(completedGames));
    }
  }

  toolButtons.forEach(button => {
    button.addEventListener('click', () => selectTool(button.dataset.tool));
  });
  document.addEventListener('keydown', event => {
    if (!gameActive || event.altKey || event.ctrlKey || event.metaKey) return;

    const toolButton = toolButtons[Number(event.key) - 1];
    if (!toolButton) return;

    event.preventDefault();
    selectTool(toolButton.dataset.tool);
    setRoundMessage(`已選擇${toolButton.getAttribute('aria-label')}`);
  });
  startButton.addEventListener('click', startRound);
  restartButton.addEventListener('click', startRound);
  backButton.addEventListener('click', () => window.location.href = '../map.html');
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

  createGrid();
  renderStats();
  setRoundMessage('選擇工具後開始巡園');
});
