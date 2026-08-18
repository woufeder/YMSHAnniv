// classroom.js - 溫馨快問快答邏輯
document.addEventListener("DOMContentLoaded", async function () {
  // -------------------------------------------------------------------------
  // 1. 對話系統啟動邏輯
  // -------------------------------------------------------------------------
  const role = localStorage.getItem("playerRole") || "student";
  const introStorageKey = "seen_intro_classroom";
  const introCompletedAtKey = "seen_intro_classroom_completed_at";

  if (
    localStorage.getItem(introStorageKey) === "true" &&
    !localStorage.getItem(introCompletedAtKey)
  ) {
    localStorage.removeItem(introStorageKey);
  }

  async function handleIntro() {
    if (!localStorage.getItem(introStorageKey)) {
      console.log("🎬 啟動對話系統...");
      try {
        const intro = new DialogueCore({
          container: "#game",
          data: "../data/intro_classroom.json",
          role,
          onFinish: () => {
            console.log("✅ 對話完整結束，標記為已閱並進入遊戲");
            // 只有在對話真正結束後才標記為 true
            localStorage.setItem(introStorageKey, "true");
            localStorage.setItem(introCompletedAtKey, Date.now().toString());
            startQuiz();
          },
        });

        await intro.init();
      } catch (error) {
        console.error("❌ 對話系統啟動失敗:", error);
        startQuiz();
      }
    } else {
      console.log("⏩ 已完整看完對話，直接進入遊戲");
      startQuiz();
    }
  }

  // -------------------------------------------------------------------------
  // 📝 題目設定區
  // -------------------------------------------------------------------------
  const quizData = [
    {
      question: "永明高中的全名是？",
      options: [
        "永明高級中學",
        "永明高中",
        "國立永明高級中學",
        "永明高級中等學校",
      ],
      answer: 3,
      fact: "考試的時候就知道名字很重要了，對吧？",
    },
    {
      question: "健康中心在哪一棟樓？",
      options: ["卓陽樓", "延安樓", "勤和樓", "逸心樓 "],
      answer: 2,
      fact: "別忘記和林太郎老師打招呼喔！",
    },
    {
      question: "企劃營運中，學業任務6是哪一科的？",
      options: ["國文", "數學", "社會", "體育"],
      answer: 4,
      fact: "體育課的任務就是要動起來，才能保持健康！",
    },
    {
      question: "下列哪一句是永明的校訓？",
      options: [
        "光明與你同在",
        "願智慧之光永恆長存",
        "愛人愛己，自強不息",
        "真理照耀永明",
      ],
      answer: 2,
      fact: "在你身上點亮一盞小燈泡！",
    },
    {
      question: "運動會活動中，藍色名牌＋校徽能換得什麼禮物？",
      options: ["兩張冰淇淋兌換券", "永明小書包", "手工音樂盒", "殺人鯨娃娃"],
      answer: 4,
      fact: "和O家的鯊魚娃娃真的不是兄弟！",
    },
    {
      question: "企劃官網的教師NPC中，沒有哪一項人員？",
      options: ["警衛", "自然", "教官", "輔導"],
      answer: 1,
      fact: "雖然官網沒有但在這個網站裡，沒寫名字就翻牆進來會被警衛伯伯抓到喔！",
    },
    {
      question: "距離永明高中最近的捷運站是哪一站？",
      options: ["仁北站", "排排站", "景湖站", "不服來站"],
      answer: 3,
      fact: "雖然營運中未多有描述，但在校外地理還是可以看得到喔！",
    },
    {
      question: "學業任務和課外活動分別有幾項？",
      options: [
        "學業任務5項，課外活動3項",
        "學業任務8項，課外活動2項",
        "學業任務4項，課外活動2項",
        "學業任務10項，課外活動5項",
      ],
      answer: 2,
      fact: "看來是有認真交作業的好學生！",
    },
    {
      question: "永明高中的班級名稱順序為？",
      options: [
        "仁和信義，智誠勤敬，真善謙愛",
        "智誠勤敬，仁和信義，真善謙愛",
        "真善謙愛，智誠勤敬，仁和信義",
        "智誠勤敬，真善謙愛，仁和信義",
      ],
      answer: 1,
      fact: "居然能答對！這題的答案在官網QA的營運#21中！",
    },
    {
      question: "福利社阿姨在結業式中拿著的花是？",
      options: ["卡斯比亞", "海芋", "向日葵", "百合"],
      answer: 2,
      fact: "嘿嘿，那還記得福利社阿姨的名字嗎？",
    },
    {
      question: "學業任務4-社會課中提到的期刊文章節錄作者為？",
      options: [
        "卡爾·薩根",
        "愛德溫·哈伯",
        "卡爾·史瓦西",
        "亨麗埃塔·史旺·勒維特",
      ],
      answer: 1,
      fact: "這四位都是非常重要的天文學家，對於天文學的發展有著不可磨滅的貢獻。",
    },
    {
      question: "校慶活動中，哪一組選項的年級與活動對應正確？",
      options: [
        "一年級：串珠；二年級：手拉坏；三年級：金工",
        "一年級：刺繡；二年級：押花；三年級：手工香皂",
        "一年級：絹印；二年級：蝶古巴特；三年級：粽子吊飾",
        "一年級：魁地奇；二年級:三巫鬥法大賽；三年級：普等巫測",
      ],
      answer: 3,
      fact: "應該不會有人選魁地奇吧？這是永明不是霍格華茲捏。",
    },
    {
      question: "學生心情不好的話，校長會請同學到校長室做什麼？",
      options: ["唱卡拉ok", "做運動", "寫考卷", "喝茶"],
      answer: 4,
      fact: "「要不要來杯茶？」",
    },
    {
      question: "企劃營運中，結業證書分為幾種？",
      options: ["1種", "2種", "3種", "4種"],
      answer: 4,
      fact: "結業證書分為四種，分別為智育、德育、五育、全勤。",
    },
    {
      question: "企劃營運的營運年分為？",
      options: ["2019", "2020", "2021", "2022"],
      answer: 2,
      fact: "企劃營運時間為2020年8月1日至10月31日喔！",
    },
  ];

  let currentQuestionIndex = 0;
  let score = 0;
  let shuffledQuestions = [];

  const questionText = document.getElementById("question-text");
  const optionsGrid = document.getElementById("options-grid");
  const scoreElement = document.getElementById("score");
  const progressElement = document.getElementById("progress");
  const feedbackElement = document.getElementById("feedback");
  const quizCard = document.getElementById("quiz-card");
  const resetBtn = document.getElementById("resetGame");
  const backBtn = document.getElementById("backToMap");

  function startQuiz() {
    const gameContainer = document.getElementById("game");
    const quizContainer = document.getElementById("quizContainer");
    if (gameContainer) gameContainer.style.display = "none";
    if (quizContainer) quizContainer.style.display = "block";

    initGame();
  }

  function initGame() {
    score = 0;
    currentQuestionIndex = 0;
    shuffledQuestions = [...quizData]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
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
    optionsGrid.innerHTML = "";
    q.options.forEach((opt, index) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(index));
      optionsGrid.appendChild(btn);
    });
    hideFeedback();
    quizCard.classList.remove("shake", "bounce");
  }

  function showFeedback(message) {
    feedbackElement.textContent = message;
    feedbackElement.classList.remove("show");
    void feedbackElement.offsetWidth;
    feedbackElement.classList.add("show");
  }

  function hideFeedback() {
    feedbackElement.classList.remove("show");
    feedbackElement.textContent = "";
  }

  function handleAnswer(selectedIndex) {
    const q = shuffledQuestions[currentQuestionIndex];
    const correctIndex = q.answer - 1;
    const buttons = optionsGrid.querySelectorAll(".option-btn");
    buttons.forEach((btn) => (btn.style.pointerEvents = "none"));

    if (selectedIndex === correctIndex) {
      score += 10;
      buttons[selectedIndex].classList.add("correct");
      showFeedback(`正確！${q.fact}`);
      quizCard.classList.add("bounce");
    } else {
      buttons[selectedIndex].classList.add("wrong");
      buttons[correctIndex].classList.add("correct");
      showFeedback("唉呀沒關係，可以偷偷去官網找答案喔！");
      quizCard.classList.add("shake");
    }
    currentQuestionIndex++;
    updateUI();
    setTimeout(() => {
      showQuestion();
    }, 2500);
  }

  function updateUI() {
    scoreElement.textContent = `得分: ${score}`;
    progressElement.textContent = `進度: ${currentQuestionIndex} / ${shuffledQuestions.length}`;
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
    let completedGames =
      JSON.parse(localStorage.getItem("completedGames")) || [];
    if (!completedGames.includes("classroom")) {
      completedGames.push("classroom");
      localStorage.setItem("completedGames", JSON.stringify(completedGames));
    }

    if (score === shuffledQuestions.length * 10) {
      window.YMSHAchievements?.earn("classroom-perfect");
    }
  }

  resetBtn.addEventListener("click", initGame);
  backBtn.addEventListener(
    "click",
    () => (window.location.href = "../map.html"),
  );

  handleIntro();
});
