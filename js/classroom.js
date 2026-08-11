// classroom.js - 翻牌遊戲邏輯升級版
document.addEventListener('DOMContentLoaded', function() {
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
        "記得在教室裡偷偷吃零食的日子嗎？",
        "那些一起熬夜準備考卷的深夜...",
        "操場上揮灑汗水的夏天，依然清晰。",
        "校門口的便利商店，是我們最愛的聚集地。",
        "一次次的小爭執，最後都變成了笑話。",
        "畢業那天，我們以為這只是暫時的離別。",
        "那些年，我們共同追逐的夢想。",
        "老師的叮嚀，現在回想起來都是關心。",
        "在走廊上奔跑的聲音，是青春的節奏。",
        "這所學校，承載了我們最純粹的時光。"
    ];

    const cardData = [
        '🏫', '📚', '✏️', '🎓', '🔬', '🌸', '⚽', '🎨',
        '🏫', '📚', '✏️', '🎓', '🔬', '🌸', '⚽', '🎨'
    ];

    // Fisher-Yates Shuffle: 真正的隨機洗牌算法
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
            // 重要：card-back 初始為空，防止 F12 直接看到答案
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

        // 動態注入符號：只有在翻轉時才將答案填入 DOM
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

                // 將配對成功的符號改成打勾
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

                // 再次隱藏符號，防止透過 DOM 檢查答案
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
        if (!completedGames.includes('classroom')) {
            completedGames.push('classroom');
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
});
