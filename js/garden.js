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

  const eventTypes = [
    { id: 'dry', label: '乾土', icon: '💧', tool: 'water', points: 10, lifetime: 9000, success: '水分補充完成' },
    { id: 'shade', label: '遮蔭', icon: '☁️', tool: 'sunlight', points: 12, lifetime: 8500, success: '陽光回到花圃了' },
    { id: 'hungry', label: '缺養分', icon: '🍂', tool: 'fertilize', points: 14, lifetime: 8800, success: '土壤恢復精神' },
    { id: 'weeds', label: '雜草', icon: '🌿', tool: 'tidy', points: 12, lifetime: 8200, success: '花圃整理乾淨了' },
    { id: 'memory', label: '回憶紙條', icon: '✉️', tool: 'tidy', points: 18, lifetime: 9800, success: '找到一張回憶紙條' }
  ];
  const memories = [
    '午休後的花圃，總有一點剛澆完水的味道。',
    '有人把花圃當成通往教室前最後一段慢下來的路。',
    '記得那年校慶，花圃旁的笑聲比花還熱鬧。',
    '看似不起眼的角落，也收著一段段校園日常。',
    '風一吹，花圃裡的葉子像在替大家打招呼。'
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
    activeEvents.forEach(event => clearTimeout(event.timeoutId));
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

    const event = { slotIndex, eventType, button, timeoutId: null };
    button.addEventListener('click', () => handleEvent(event));
    slot.appendChild(button);
    activeEvents.set(slotIndex, event);
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
        playSound?.('paper');
      } else {
        playSound?.('step');
      }
    } else {
      health -= 1;
      combo = 0;
      setRoundMessage('工具不對，花圃健康下降');
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
      event.button.disabled = true;
    });
    activeEvents.clear();

    const flower = score >= 160 ? '🌻' : score >= 100 ? '🌷' : '🌼';
    resultFlower.textContent = completed ? flower : '🥀';
    resultTitle.textContent = completed ? '巡園完成' : '花圃需要再照顧';
    resultSummary.textContent = completed
      ? `你守住了花圃，獲得 ${score} 分。`
      : `這次獲得 ${score} 分，換個節奏再試一次。`;
    roundResult.classList.remove('hidden');

    if (completed) {
      markGameComplete();
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

  createGrid();
  renderStats();
  setRoundMessage('選擇工具後開始巡園');
});
