/**
 * 通用對話系統
 * 用法：
 *   const game = new DialogueCore({
 *     container: '#game',                // 包覆整個對話畫面容器
 *     data: 'data/start_default.json',    // 預設劇情
 *     students: 'data/student.json',      // (選) 學生名單
 *     onFinish: () => fadeTo('map.html')  // 劇情結束 callback
 *   });
 *   game.init();
 */

class DialogueCore {
  constructor(options) {
    this.container = document.querySelector(options.container || '#game');
    this.dataPath = options.data;
    this.studentsPath = options.students || null;
    this.role = options.role || 'default';
    this.dialogueKey = options.dialogueKey || null;
    this.playerInfo = options.playerInfo || {};
    this.reuseExistingLayout = Boolean(options.reuseExistingLayout);
    this.typeTextSpeed = options.textSpeed || 50;
    this.onFinish = options.onFinish || function () {};

    // 狀態
    this.dialogue = [];
    this.current = 0;
    this.studentList = [];
    this.studentInfo = null;
    this.typingTimer = null;
    this.textSpeed = this.typeTextSpeed; // 每字間隔
  }

  async init() {
    // 學生資料可選
    if (this.studentsPath) {
      try {
        const res = await fetch(this.studentsPath);
        this.studentList = await res.json();
      } catch (err) {
        console.warn('⚠️ 沒有載入學生名單', err);
      }
    }

    // 載入對話檔
    await this.loadDialogue(this.dataPath);
    if (this.reuseExistingLayout) {
      this.bindLayout();
    } else {
      this.buildLayout();
    }
    this.showLine();
  }

  async loadDialogue(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        this.dialogue = data;
      } else {
        const selected = data[this.dialogueKey] || data[this.role] || data.default || Object.values(data).find(Array.isArray);
        this.dialogue = Array.isArray(selected) ? selected : [];
      }

      if (!this.dialogue.length) {
        throw new Error('劇情檔沒有可播放的對話');
      }

      this.current = 0;
    } catch (err) {
      console.error(`❌ 劇情檔載入失敗：${path}`, err);
      throw err;
    }
  }

  buildLayout() {
    this.container.innerHTML = `
      <div class="background-layer"><img id="bg" /></div>
      <div class="character-layer"><img id="char" /></div>
      <div class="dialogue-layer">
        <div class="dialogue-box">
          <div class="dialogue-header"><span id="name"></span></div>
          <div id="text" class="dialogue-text"></div>

          <div id="inputArea" class="input-area hidden">
            <input id="playerName" type="text" placeholder="請輸入你的名字" />
            <button id="submitName">確定</button>
          </div>

          <div class="control-area">
            <button id="nextBtn" class="next-btn"><i class="fa-solid fa-play"></i></button>
          </div>
        </div>
      </div>
    `;

    this.bindLayout();
  }

  bindLayout() {
    this.bg = this.container.querySelector('#bg');
    this.charImg = this.container.querySelector('#char');
    this.nameBox = this.container.querySelector('#name');
    this.dialogueHeader = this.container.querySelector('.dialogue-header');
    this.textBox = this.container.querySelector('#text');
    this.nextBtn = this.container.querySelector('#nextBtn');
    this.inputArea = this.container.querySelector('#inputArea');
    this.playerInput = this.container.querySelector('#playerName');
    this.submitName = this.container.querySelector('#submitName');

    this.nextBtn?.addEventListener('click', () => this.nextLine());
    this.submitName?.addEventListener('click', () => this.handleNameSubmit());
  }

  replaceVars(str) {
    const info = this.studentInfo || this.playerInfo || {};
    const inputName = localStorage.getItem('playerInput') || info.input || info.name || '';

    return str
      .replaceAll('{{input}}', inputName)
      .replaceAll('{{name}}', info.name || '')
      .replaceAll('{{class}}', info.className || info.class || '')
      .replaceAll('{{role}}', info.role || this.role || '')
      .replaceAll('{{year}}', info.year || '');
  }

  getDisplayText(text) {
    return this.replaceVars(text || '')
      .replace(/<wait=?\d*>/g, '')
      .replace(/\|/g, '');
  }

  typeText(text) {
    this.textBox.textContent = '';
    const parsed = this.replaceVars(text || '');
    let index = 0;
    let pauseUntil = 0;

    clearInterval(this.typingTimer);
    this.typingTimer = setInterval(() => {
      if (Date.now() < pauseUntil) {
        return;
      }

      const remaining = parsed.slice(index);

      if (remaining.startsWith('<wait')) {
        const match = remaining.match(/^<wait=?(\d*)>/);
        if (match) {
          const delay = match[1] ? parseInt(match[1], 10) : 300;
          pauseUntil = Date.now() + delay;
          index += match[0].length;
          return;
        }
      }

      if (remaining[0] === '|') {
        pauseUntil = Date.now() + 500;
        index++;
        return;
      }

      this.textBox.textContent += parsed[index] || '';
      index++;

      if (index >= parsed.length) {
        clearInterval(this.typingTimer);
      }
    }, this.textSpeed);
  }

  showLine() {
    const line = this.dialogue[this.current];
    if (!line) return this.onFinish();

    // 背景、角色
    if (this.bg && line.bg) {
      this.bg.src = line.bg;
    }

    if (this.charImg && line.char) {
      this.charImg.src = line.char;
    }

    // 名字與文字
    if (this.nameBox) {
      this.nameBox.textContent = line.name || '';
    }

    if (this.dialogueHeader) {
      this.dialogueHeader.style.display = line.name ? 'block' : 'none';
    }

    if (line.effect && typeof triggerEffect === 'function') {
      triggerEffect(line.effect);
    }

    this.typeText(line.text || '');

    // 是否顯示輸入框
    if (!this.inputArea || !this.nextBtn) {
      return;
    }

    if (line.action === 'askName') {
      this.inputArea.classList.remove('hidden');
      this.nextBtn.classList.add('hidden');
    } else {
      this.inputArea.classList.add('hidden');
      this.nextBtn.classList.remove('hidden');
    }
  }

  async handleNameSubmit() {
    const input = this.playerInput.value.trim();
    if (!input) return;

    this.inputArea.style.transition = 'opacity 0.5s';
    this.inputArea.style.opacity = 0;

    setTimeout(() => {
      this.inputArea.classList.add('hidden');
      this.nextBtn.classList.remove('hidden');
    }, 500);

    this.studentInfo = this.studentList.find(
      s => s.name.trim().normalize() === input.normalize()
    );

    if (this.studentInfo && this.studentInfo.dialogue) {
      // 如果學生資料包含對應劇情
      await this.loadDialogue(this.studentInfo.dialogue);
    }
    this.current = 0;
    this.showLine();
  }

  nextLine() {
    clearInterval(this.typingTimer);
    const line = this.dialogue[this.current];
    // 如果正在逐字播放，快速跳完
    const fullText = this.getDisplayText(line?.text || '');
    if (this.textBox.textContent.length < fullText.length) {
      this.textBox.textContent = fullText;
      return;
    }

    this.current++;
    if (this.current < this.dialogue.length) {
      this.showLine();
    } else {
      this.onFinish();
    }
  }
}

// 自動偵測啟動（容器明確標記 data-dialogue-auto="true" 時）
window.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#game[data-dialogue-auto="true"]')) {
    const game = new DialogueCore({
      container: '#game',
      data: 'data/start_default.json',
      students: 'data/student.json',
      onFinish: () => fadeTo('map.html')
    });
    game.init();
  }
});
