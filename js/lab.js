// lab.js - 翻牌遊戲邏輯 (原 classroom.js 搬移)
function initLab() {
    const cardGrid = document.getElementById('cardGrid');
    const scoreElement = document.getElementById('score');
    const movesElement = document.getElementById('moves');
    const timerElement = document.getElementById('timer');
    const comboElement = document.getElementById('combo');
    const memoryPopup = document.getElementById('memoryPopup');
    const comboContainer = document.getElementById('comboContainer');
    const resetBtn = document.getElementById('resetGame');
    const backBtn = document.getElementById('backToMap');

    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;
    let score = 0;
    let combo = 0;
    let startTime = null;
    let timerInterval = null;

    const memories = [
        "記得在實驗室裡那些神奇的化學反應嗎？",
        "那些對著顯微鏡發呆的午後...",
        "實驗失敗時的驚慌失措，現在想來很有趣。",
        "白袍雖然有些大，但穿上就覺得自己像科學家。",
        "一次次地嘗試，直到最後終於成功亮燈。",
        "與夥伴共同討論報告的深夜，是成長的證明。",
        "那些年，我們對未知的好奇心。",
        "老師耐心的指導，讓我們學會思考。",
        "實驗室裡的空氣中，總是瀰漫著好奇的味道。",
        "這間房間，記錄了我們對科學最純粹的熱愛。"
    ];

    const cardData = [
        '🏫', '📚', '✏️', '🎓', '🔬', '🌸', '⚽', '🎨',
        '🏫', '📚', '✏️', '🎓', '🔬', '🌸', '⚽', '🎨'
    ];

    function shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex !== 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    function initGame() {
        cards = shuffle([...cardData]);
        flippedCards = [];
        matchedPairs = 0;
        moves = 0;
        score = 0;
        combo = 0;
        startTime = Date.now();

        updateUI();
        createCards();
        startTimer();
    }

    function createCards() {
        cardGrid.innerHTML = '';
        cards.forEach((symbol, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-front">?</div>
                <div class="card-back"></div>
            `;
            card.addEventListener('click', flipCard);
            cardGrid.appendChild(card);
        });
    }

    function flipCard() {
        if (flippedCards.length >= 2) return;
        if (this.classList.contains('flipped') || this.classList.contains('matched')) return;

        const symbol = cards[this.dataset.index];
        this.querySelector('.card-back').textContent = symbol;

        this.classList.add('flipped');
        flippedCards.push(this);

        if (flippedCards.length === 2) {
            moves++;
            updateUI();
            checkMatch();
        }
    }

    function checkMatch() {
        const [card1, card2] = flippedCards;
        const symbol1 = cards[card1.dataset.index];
        const symbol2 = cards[card2.dataset.index];

        setTimeout(() => {
            if (symbol1 === symbol2) {
                card1.classList.add('matched');
                card2.classList.add('matched');
                card1.querySelector('.card-back').textContent = '✅';
                card2.querySelector('.card-back').textContent = '✅';
                matchedPairs++;

                combo++;
                const comboBonus = combo * 5;
                score += (10 + comboBonus);

                triggerComboEffect();
                showRandomMemory();

                if (matchedPairs === cards.length / 2) {
                    gameComplete();
                }
            } else {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                card1.querySelector('.card-back').textContent = '';
                card2.querySelector('.card-back').textContent = '';
                combo = 0;
            }

            flippedCards = [];
            updateUI();
        }, 800);
    }

    function triggerComboEffect() {
        if (combo < 2) return;
        const text = document.createElement('div');
        text.className = 'combo-text';
        text.textContent = `Combo x${combo}!`;
        const x = 20 + Math.random() * 60;
        const y = 20 + Math.random() * 60;
        text.style.left = `${x}%`;
        text.style.top = `${y}%`;
        comboContainer.appendChild(text);
        setTimeout(() => text.remove(), 800);
    }

    function showRandomMemory() {
        const memory = memories[Math.floor(Math.random() * memories.length)];
        memoryPopup.textContent = memory;
        memoryPopup.classList.add('show');
        setTimeout(() => memoryPopup.classList.remove('show'), 3000);
    }

    function gameComplete() {
        clearInterval(timerInterval);
        const endTime = Date.now();
        const totalTime = Math.floor((endTime - startTime) / 1000);

        let rank = 'C';
        const efficiency = moves + Math.floor(totalTime / 10);
        if (efficiency < 25) rank = 'S';
        else if (efficiency < 35) rank = 'A';
        else if (efficiency < 50) rank = 'B';

        const overlay = document.createElement('div');
        overlay.className = 'game-complete';
        overlay.innerHTML = `
            <div class="complete-popup">
                <h2>回憶碎片收集完成！</h2>
                <div class="rank-display">${rank}</div>
                <div class="complete-stats">
                    <div class="stat-item"><div>得分</div><div class="stat-value">${score}</div></div>
                    <div class="stat-item"><div>步數</div><div class="stat-value">${moves}</div></div>
                    <div class="stat-item"><div>時間</div><div class="stat-value">${Math.floor(totalTime/60)}分${totalTime%60}秒</div></div>
                    <div class="stat-item"><div>最高Combo</div><div class="stat-value">${combo}</div></div>
                </div>
                <button class="btn btn-primary" onclick="location.reload()">再次挑戰</button>
            </div>
        `;
        document.body.appendChild(overlay);

        let completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];
        if (!completedGames.includes('lab')) {
            completedGames.push('lab');
            localStorage.setItem('completedGames', JSON.stringify(completedGames));
        }
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerElement.textContent = `時間: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function updateUI() {
        scoreElement.textContent = `分數: ${score}`;
        movesElement.textContent = `步數: ${moves}`;
        comboElement.textContent = `Combo: ${combo}`;
        if (combo > 0) {
            comboElement.classList.add('bump');
            setTimeout(() => comboElement.classList.remove('bump'), 200);
        }
    }

    resetBtn.addEventListener('click', initGame);
    backBtn.addEventListener('click', () => window.location.href = '../map.html');

    initGame();
}

window.initLab = initLab;
