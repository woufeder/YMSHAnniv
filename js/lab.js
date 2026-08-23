function initLab() {
  const cardGrid = document.getElementById('cardGrid');
  const progressElement = document.getElementById('progress');
  const movesElement = document.getElementById('moves');
  const timerElement = document.getElementById('timer');
  const comboElement = document.getElementById('combo');
  const logElement = document.getElementById('labLog');
  const resetButton = document.getElementById('resetGame');
  const backButton = document.getElementById('backToMap');

  const experimentPairs = [
    {
      id: 'indicator',
      icon: 'fa-flask',
      label: '酚酞試液',
      type: '材料',
      matchIcon: 'fa-droplet',
      matchLabel: '鹼性時呈桃紅',
      matchType: '觀察',
      note: '指示劑能用顏色協助判斷溶液的酸鹼性。'
    },
    {
      id: 'microscope',
      icon: 'fa-microscope',
      label: '顯微鏡',
      type: '儀器',
      matchIcon: 'fa-seedling',
      matchLabel: '洋蔥表皮細胞',
      matchType: '標本',
      note: '薄薄的洋蔥表皮，是常見的細胞觀察材料。'
    },
    {
      id: 'magnet',
      icon: 'fa-magnet',
      label: '磁鐵',
      type: '器材',
      matchIcon: 'fa-burst',
      matchLabel: '吸引鐵屑',
      matchType: '現象',
      note: '鐵屑會沿著磁場方向排列，形成有趣的紋路。'
    },
    {
      id: 'circuit',
      icon: 'fa-battery-half',
      label: '電池',
      type: '元件',
      matchIcon: 'fa-lightbulb',
      matchLabel: '點亮燈泡',
      matchType: '結果',
      note: '形成閉合迴路後，電流才能讓燈泡發亮。'
    },
    {
      id: 'thermometer',
      icon: 'fa-temperature-half',
      label: '溫度計',
      type: '儀器',
      matchIcon: 'fa-gauge-high',
      matchLabel: '量測溫度',
      matchType: '用途',
      note: '讀取液柱上緣時，視線要和刻度保持水平。'
    },
    {
      id: 'balance',
      icon: 'fa-scale-balanced',
      label: '天平',
      type: '儀器',
      matchIcon: 'fa-weight-hanging',
      matchLabel: '測量質量',
      matchType: '用途',
      note: '測量前先歸零，才能讓實驗紀錄更可靠。'
    },
    {
      id: 'graduated-cylinder',
      icon: 'fa-vial',
      label: '量筒',
      type: '儀器',
      matchIcon: 'fa-ruler-vertical',
      matchLabel: '量取液體體積',
      matchType: '用途',
      note: '讀取量筒刻度時，液面最低處要和視線保持水平。'
    },
    {
      id: 'alcohol-lamp',
      icon: 'fa-fire',
      label: '酒精燈',
      type: '器材',
      matchIcon: 'fa-cloud',
      matchLabel: '加熱使水蒸發',
      matchType: '現象',
      note: '加熱前確認酒精量與燈芯狀態，才能安全觀察變化。'
    }
  ];

  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  let moves = 0;
  let combo = 0;
  let bestCombo = 0;
  let startTime = 0;
  let timerInterval = null;
  let resolveTimeout = null;
  let completionTimeout = null;
  let isResolving = false;

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function createDeck() {
    return shuffle(experimentPairs.flatMap((pair) => [
      { pairId: pair.id, icon: pair.icon, label: pair.label, type: pair.type, note: pair.note },
      { pairId: pair.id, icon: pair.matchIcon, label: pair.matchLabel, type: pair.matchType, note: pair.note }
    ]));
  }

  function renderCards() {
    cardGrid.innerHTML = '';
    cards.forEach((data, index) => {
      const card = document.createElement('button');
      card.className = 'experiment-card';
      card.type = 'button';
      card.dataset.index = String(index);
      card.setAttribute('aria-label', `實驗資料卡 ${index + 1}`);
      card.innerHTML = `
        <span class="card-face card-front" aria-hidden="true">
          <i class="fa-solid fa-flask-vial"></i>
          <p>實驗小卡</p>
        </span>
        <span class="card-face card-back">
          <i class="fa-solid ${data.icon}" aria-hidden="true"></i>
          <span class="card-type">${data.type}</span>
          <strong>${data.label}</strong>
        </span>
      `;
      card.addEventListener('click', flipCard);
      cardGrid.appendChild(card);
    });
  }

  function flipCard(event) {
    const card = event.currentTarget;
    if (isResolving || flippedCards.length >= 2 || card.classList.contains('is-flipped') || card.classList.contains('is-matched')) {
      return;
    }

    card.classList.add('is-flipped');
    card.setAttribute('aria-label', cards[Number(card.dataset.index)].label);
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      moves += 1;
      updateStatus();
      resolvePair();
    }
  }

  function resolvePair() {
    isResolving = true;
    const [firstCard, secondCard] = flippedCards;
    const firstData = cards[Number(firstCard.dataset.index)];
    const secondData = cards[Number(secondCard.dataset.index)];
    const isMatch = firstData.pairId === secondData.pairId;

    resolveTimeout = window.setTimeout(() => {
      if (isMatch) {
        firstCard.classList.add('is-matched');
        secondCard.classList.add('is-matched');
        firstCard.disabled = true;
        secondCard.disabled = true;
        matchedPairs += 1;
        combo += 1;
        bestCombo = Math.max(bestCombo, combo);
        logElement.textContent = `校對成功：${firstData.note}`;
        playSound('corerect.wav');

        if (matchedPairs === experimentPairs.length) {
          updateStatus();
          completionTimeout = window.setTimeout(showCompletion, 180);
        }
      } else {
        firstCard.classList.remove('is-flipped');
        secondCard.classList.remove('is-flipped');
        firstCard.setAttribute('aria-label', `實驗資料卡 ${Number(firstCard.dataset.index) + 1}`);
        secondCard.setAttribute('aria-label', `實驗資料卡 ${Number(secondCard.dataset.index) + 1}`);
        combo = 0;
        logElement.textContent = '紀錄不相符，換一組資料再試試。';
        playSound('wrong.wav');
      }

      flippedCards = [];
      isResolving = false;
      updateStatus();
    }, 750);
  }

  function updateStatus() {
    progressElement.textContent = `配對成功 ${matchedPairs} / ${experimentPairs.length}`;
    movesElement.textContent = `翻牌次數 ${moves}`;
    comboElement.textContent = `連續成功 ${combo}`;
  }

  function startTimer() {
    window.clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(seconds / 60);
      timerElement.textContent = `經過時間 ${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }, 1000);
  }

  function showCompletion() {
    window.clearInterval(timerInterval);
    const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
    const efficiency = moves + Math.floor(totalSeconds / 12);
    const rank = efficiency <= 10 ? 'S' : efficiency <= 15 ? 'A' : efficiency <= 21 ? 'B' : 'C';
    if (rank === 'A') {
      window.YMSHAchievements?.earn('lab-grade-a');
    }
    const overlay = document.createElement('div');
    overlay.className = 'game-complete';
    overlay.innerHTML = `
      <section class="complete-popup" role="dialog" aria-modal="true" aria-labelledby="completeTitle">
        <p class="complete-kicker">YMSH LAB / RECORD 04</p>
        <h2 id="completeTitle">實驗紀錄校對完成</h2>
        <div class="rank-display">${rank}</div>
        <div class="complete-stats">
          <div class="stat-item"><span>翻閱次數</span><strong>${moves}</strong></div>
          <div class="stat-item"><span>完成時間</span><strong>${Math.floor(totalSeconds / 60)} 分 ${totalSeconds % 60} 秒</strong></div>
          <div class="stat-item"><span>最佳連續</span><strong>${bestCombo}</strong></div>
          <div class="stat-item"><span>資料完整度</span><strong>100%</strong></div>
        </div>
        <div class="complete-actions">
          <button class="complete-restart" type="button">重新校對</button>
          <button class="complete-back" type="button">返回地圖</button>
        </div>
      </section>
    `;
    overlay.querySelector('.complete-restart').addEventListener('click', () => {
      overlay.remove();
      initGame();
    });
    overlay.querySelector('.complete-back').addEventListener('click', () => {
      window.location.href = '../map.html';
    });
    document.body.appendChild(overlay);

    const completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];
    if (!completedGames.includes('lab')) {
      completedGames.push('lab');
      localStorage.setItem('completedGames', JSON.stringify(completedGames));
    }
  }

  function initGame() {
    document.querySelector('.game-complete')?.remove();
    window.clearTimeout(resolveTimeout);
    window.clearTimeout(completionTimeout);
    cards = createDeck();
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    combo = 0;
    bestCombo = 0;
    isResolving = false;
    startTime = Date.now();
    timerElement.textContent = '時間 00:00';
    logElement.textContent = '請翻開兩份資料，找出正確的實驗關聯。';
    renderCards();
    updateStatus();
    startTimer();
  }

  resetButton.addEventListener('click', initGame);
  backButton.addEventListener('click', () => {
    window.location.href = '../map.html';
  });

  initGame();
}

window.initLab = initLab;
