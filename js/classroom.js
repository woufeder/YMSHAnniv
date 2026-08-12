// classroom.js - 溫馨快問快答邏輯
document.addEventListener('DOMContentLoaded', async function() {
    // -------------------------------------------------------------------------
    // 1. 對話系統啟動邏輯
    // -------------------------------------------------------------------------
    const role = localStorage.getItem('playerRole') || 'student';
    const introStorageKey = 'seen_intro_classroom';
    const introCompletedAtKey = 'seen_intro_classroom_completed_at';

    if (localStorage.getItem(introStorageKey) === 'true' && !localStorage.getItem(introCompletedAtKey)) {
        localStorage.removeItem(introStorageKey);
    }

    async function handleIntro() {
        if (!localStorage.getItem(introStorageKey)) {
            console.log('🎬 啟動對話系統...');
            try {
                const intro = new DialogueCore({
                    container: '#game',
                    data: '../data/intro_classroom.json',
                    role,
                    onFinish: () => {
                        console.log('✅ 對話完整結束，標記為已閱並進入遊戲');
                        // 只有在對話真正結束後才標記為 true
                        localStorage.setItem(introStorageKey, 'true');
                        localStorage.setItem(introCompletedAtKey, Date.now().toString());
                        startQuiz();
                    }
                });

                await intro.init();
            } catch (error) {
                console.error('❌ 對話系統啟動失敗:', error);
                startQuiz();
            }
        } else {
            console.log('⏩ 已完整看完對話，直接進入遊戲');
            startQuiz();
        }
    }

    // -------------------------------------------------------------------------
    // 📝 題目設定區
    // -------------------------------------------------------------------------
    const quizData = [
        {
            question: "在 YMSH 的校園裡，最讓人感到溫馨的地方是哪裡？",
            options: ["穿堂留言板", "校長室", "實驗室", "體育館"],
            answer: 0,
            fact: "對許多人來說，穿堂是交流情感最溫暖的地方。❤️"
        },
        {
            question: "如果要在學校找一個安靜思考或研究的地方，最合適的是？",
            options: ["教室", "圖書館", "實驗室", "操場"],
            answer: 2,
            fact: "在實驗室裡，好奇心是最好的導師。🔬"
        },
        {
            question: "關於 YMSH 的 5 週年，最想對學校說的一句話是？",
            options: ["祝願越來越好", "謝謝陪伴", "回憶滿滿", "以上全部"],
            answer: 3,
            fact: "無論選擇哪個，這份心意都是最珍貴的。✨"
        },
        {
            question: "在實驗室翻牌遊戲中，配對成功後會出現什麼符號？",
            options: ["🌟", "✅", "❤️", "🌸"],
            answer: 1,
            fact: "看到那個打勾，是不是很有成就感呢！"
        },
    ];

    let currentQuestionIndex = 0;
    let score = 0;
    let shuffledQuestions = [];

    const questionText = document.getElementById('question-text');
    const optionsGrid = document.getElementById('options-grid');
    const scoreElement = document.getElementById('score');
    const progressElement = document.getElementById('progress');
    const feedbackElement = document.getElementById('feedback');
    const quizCard = document.getElementById('quiz-card');
    const resetBtn = document.getElementById('resetGame');
    const backBtn = document.getElementById('backToMap');

    function startQuiz() {
        const gameContainer = document.getElementById('game');
        const quizContainer = document.getElementById('quizContainer');
        if (gameContainer) gameContainer.style.display = 'none';
        if (quizContainer) quizContainer.style.display = 'block';

        initGame();
    }

    function initGame() {
        score = 0;
        currentQuestionIndex = 0;
        shuffledQuestions = [...quizData].sort(() => Math.random() - 0.5);
        updateUI();
        showQuestion();
    }

    function showQuestion() {
        if (currentQuestionIndex >= shuffledQuestions.length) {
            gameComplete();
            return;
        }
        const q = shuffledQuestions[currentQuestionIndex];
        questionText.textContent = q.question;
        optionsGrid.innerHTML = '';
        q.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', () => handleAnswer(index));
            optionsGrid.appendChild(btn);
        });
        feedbackElement.textContent = '';
        quizCard.classList.remove('shake', 'bounce');
    }

    function handleAnswer(selectedIndex) {
        const q = shuffledQuestions[currentQuestionIndex];
        const buttons = optionsGrid.querySelectorAll('.option-btn');
        buttons.forEach(btn => btn.style.pointerEvents = 'none');

        if (selectedIndex === q.answer) {
            score += 10;
            buttons[selectedIndex].classList.add('correct');
            feedbackElement.textContent = `正確！${q.fact}`;
            quizCard.classList.add('bounce');
        } else {
            buttons[selectedIndex].classList.add('wrong');
            buttons[q.answer].classList.add('correct');
            feedbackElement.textContent = "沒關係，回憶有時就是模糊的。";
            quizCard.classList.add('shake');
        }
        updateUI();
        setTimeout(() => {
            currentQuestionIndex++;
            showQuestion();
        }, 2500);
    }

    function updateUI() {
        scoreElement.textContent = `得分: ${score}`;
        progressElement.textContent = `進度: ${currentQuestionIndex + 1} / ${shuffledQuestions.length}`;
    }

    function gameComplete() {
        questionText.textContent = "測驗完成！";
        optionsGrid.innerHTML = `
            <div style="grid-column: span 2; font-size: 1.2rem; color: #5d4037; margin-bottom: 20px;">
                你的最終得分是 ${score} 分！<br>
                感謝你與我們一起回憶 YMSH 的時光。
            </div>
        `;
        feedbackElement.textContent = "所有的回憶都已收集完畢 ❤️";
        let completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];
        if (!completedGames.includes('classroom')) {
            completedGames.push('classroom');
            localStorage.setItem('completedGames', JSON.stringify(completedGames));
        }
    }

    resetBtn.addEventListener('click', initGame);
    backBtn.addEventListener('click', () => window.location.href = '../map.html');

    handleIntro();
});
