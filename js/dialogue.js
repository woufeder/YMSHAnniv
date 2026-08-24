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

    // 從 SettingsManager 獲取速度設定，若無則使用預設值 50
    this.typeTextSpeed = SettingsManager.get('textSpeed', 50);
    this.onFinish = options.onFinish || function () {};

    // 狀態
    this.dialogue = [];
    this.current = 0;
    this.studentList = [];
    this.studentInfo = null;
    this.typingTimer = null;
    this.textSpeed = this.typeTextSpeed; // 每字間隔
    this.backgroundImages = [];
    this.activeBackgroundIndex = 0;
    this.backgroundRequestId = 0;
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
      <div class="background-layer">
        <img id="bg" class="dialogue-background" alt="" />
        <img class="dialogue-background" alt="" />
      </div>
      <div class="character-layer"><img id="char" /></div>
      <div class="dialogue-layer">
        <div class="dialogue-box">
          <div class="dialogue-header"><span id="name"></span></div>
          <div id="text" class="dialogue-text">
            <div class="dialogue-content"></div>
            <div id="optionsArea" class="options-area hidden"></div>
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
    this.setupBackgroundLayers();
    this.bg = this.backgroundImages[0] || null;
    this.charImg = this.container.querySelector('#char');
    if (!this.charImg) {
      const characterLayer = this.container.querySelector('.character-layer');
      if (characterLayer) {
        this.charImg = document.createElement('img');
        this.charImg.id = 'char';
        this.charImg.alt = '';
        characterLayer.appendChild(this.charImg);
      }
    }
    this.nameBox = this.container.querySelector('#name');
    this.dialogueHeader = this.container.querySelector('.dialogue-header');
    this.textBox = this.container.querySelector('#text');
    this.dialogueContent = this.textBox?.querySelector('.dialogue-content');
    if (this.textBox && !this.dialogueContent) {
      this.dialogueContent = document.createElement('div');
      this.dialogueContent.className = 'dialogue-content';
      this.textBox.prepend(this.dialogueContent);
    }
    this.nextBtn = this.container.querySelector('#nextBtn');
    this.optionsArea = this.container.querySelector('#optionsArea');
    if (this.textBox && !this.optionsArea) {
      this.optionsArea = document.createElement('div');
      this.optionsArea.id = 'optionsArea';
      this.optionsArea.className = 'options-area hidden';
      this.textBox.append(this.optionsArea);
    } else if (this.textBox && this.optionsArea.parentElement !== this.textBox) {
      this.textBox.append(this.optionsArea);
    }

    this.nextBtn?.addEventListener('click', () => this.nextLine());
  }

  setupBackgroundLayers() {
    const backgroundLayer = this.container.querySelector('.background-layer');
    if (!backgroundLayer) return;

    const images = [...backgroundLayer.querySelectorAll('img')];
    while (images.length < 2) {
      const image = document.createElement('img');
      image.className = 'dialogue-background';
      image.alt = '';
      backgroundLayer.appendChild(image);
      images.push(image);
    }

    this.backgroundImages = images.slice(0, 2);
    this.backgroundImages.forEach((image) => image.classList.add('dialogue-background'));

    const initialIndex = this.backgroundImages.findIndex((image) => image.getAttribute('src'));
    this.activeBackgroundIndex = initialIndex >= 0 ? initialIndex : 0;
    if (initialIndex >= 0) {
      this.backgroundImages[initialIndex].classList.add('is-visible');
    }
  }

  setBackground(src) {
    if (!src || this.backgroundImages.length < 2) return;

    const resolvedSrc = new URL(src, document.baseURI).href;
    const currentImage = this.backgroundImages[this.activeBackgroundIndex];
    if (currentImage?.src === resolvedSrc) return;

    const nextIndex = this.activeBackgroundIndex === 0 ? 1 : 0;
    const nextImage = this.backgroundImages[nextIndex];
    const requestId = ++this.backgroundRequestId;

    const revealBackground = () => {
      if (requestId !== this.backgroundRequestId || nextImage.src !== resolvedSrc) return;

      nextImage.classList.add('is-visible');
      currentImage?.classList.remove('is-visible');
      this.activeBackgroundIndex = nextIndex;
    };

    nextImage.onload = revealBackground;
    nextImage.onerror = () => console.warn(`背景圖片載入失敗：${src}`);
    nextImage.src = src;

    if (nextImage.complete && nextImage.naturalWidth > 0) {
      revealBackground();
    }
  }

  resolveCharacterSource(src) {
    if (/^(?:[a-z]+:|\/|\.\/|\.\.\/)/i.test(src)) {
      return src;
    }

    if (typeof resolveAppAsset === 'function') {
      return resolveAppAsset(`assets/images/${src}`);
    }

    return `assets/images/${src}`;
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
      .replace(/<[^>]*>/g, '')
      .replace(/\|/g, '');
  }

  /**
   * 逐字播放文字並解析行內指令
   *
   * 支援指令清單：
   * 1. 節奏控制：
   *    - <wait=ms>  : 暫停指定毫秒 (例如 <wait=500>)，不填數字預設 300ms
   *    - |          : 快捷停頓 500ms
   * 2. 音效觸發：
   *    - <sound=name> : 播放指定音效；可寫成 <sound=name.wav>
   * 3. 視覺特效 (全螢幕)：
   *    - <shake>      : 輕微螢幕震動
   *    - <shakeStrong> : 強烈螢幕震動
   *    - <flash>       : 螢幕閃爍
   * 4. 角色專用特效 (僅角色圖片)：
   *    - <char:shake>      : 角色輕微震動
   *    - <char:shakeStrong> : 角色強烈震動
   *    - <char:jump>        : 角色往上跳
   *    - <char:dashAcross>  : 角色由右側畫面外快速穿越至左側畫面外
   *    - <char:dropPause>  : 角色稍微下移、停頓 0.5 秒後歸位
   *    (格式為 <char:特效名稱>)
   */
  typeText(text) {
    this.dialogueContent.textContent = '';
    const parsed = this.replaceVars(text || '');
    let index = 0;
    let pauseUntil = 0;

    clearInterval(this.typingTimer);
    this.typingTimer = setInterval(() => {
      if (Date.now() < pauseUntil) {
        return;
      }

      const remaining = parsed.slice(index);

      if (remaining.startsWith('<')) {
        const closingIndex = remaining.indexOf('>');
        if (closingIndex !== -1) {
          const command = remaining.slice(1, closingIndex);

          if (command.startsWith('wait')) {
            const match = command.match(/=(\d+)/);
            const delay = match ? parseInt(match[1], 10) : 300;
            pauseUntil = Date.now() + delay;
            index += closingIndex + 1;
            return;
          } else if (command.startsWith('sound=')) {
            const match = command.match(/^sound=([A-Za-z0-9._-]+)$/);
            if (match && typeof playSound === 'function') {
              playSound(match[1]);
            }
          } else if (command.startsWith('char:')) {
            const charEffect = command.slice(5);
            this.triggerCharEffect(charEffect);
          } else {
            if (typeof triggerEffect === 'function') {
              triggerEffect(command);
            }
          }
          index += closingIndex + 1;
          return;
        }
      }

      if (remaining[0] === '|') {
        pauseUntil = Date.now() + 500;
        index++;
        return;
      }

      this.dialogueContent.textContent += parsed[index] || '';
      index++;

      if (index >= parsed.length) {
        clearInterval(this.typingTimer);
        // 文字播放完畢後，檢查是否有選項需要顯示
        this.checkAndShowOptions();
      }
    }, this.textSpeed);
  }

  checkAndShowOptions() {
    const line = this.dialogue[this.current];
    if (line && line.options && line.options.length > 0) {
      this.renderOptions(line.options);
      if (this.nextBtn) this.nextBtn.classList.add('hidden');
    }
  }

  triggerCharEffect(effect) {
    if (!this.charImg) return;

    let className = '';
    switch (effect) {
      case 'shake': className = 'char-shake'; break;
      case 'shakeStrong': className = 'char-shake-strong'; break;
      case 'jump': className = 'char-jump'; break;
      case 'dashAcross': className = 'char-dash-across'; break;
      case 'dropPause': className = 'char-drop-pause'; break;
      default: return;
    }

    this.charImg.classList.remove(
      'char-shake',
      'char-shake-strong',
      'char-jump',
      'char-dash-across',
      'char-drop-pause'
    );
    this.charImg.style.transform = effect === 'dashAcross' ? 'translateX(125vw)' : '';
    // 強制重繪 (Reflow) 以便重新觸發動畫
    void this.charImg.offsetWidth;
    this.charImg.classList.add(className);
  }

  prepareLeadingCharEffect(text) {
    if (!this.charImg) return;

    const startsWithDash = /^(?:(?:<wait(?:=\d+)?>)|\|)*<char:dashAcross>/.test(text || '');
    if (startsWithDash) {
      this.charImg.style.transform = 'translateX(125vw)';
    }
  }

  showLine() {
    const line = this.dialogue[this.current];
    if (!line) return this.onFinish();

    // 背景、角色
    if (line.bg) {
      this.setBackground(line.bg);
    }

    if (this.charImg && line.char) {
      this.charImg.classList.remove(
        'char-shake',
        'char-shake-strong',
        'char-jump',
        'char-dash-across',
        'char-drop-pause'
      );
      this.charImg.style.transform = '';
      this.charImg.src = this.resolveCharacterSource(line.char);
      this.prepareLeadingCharEffect(line.text);
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

    // 重設當前選項與下一句按鈕狀態。
    if (!this.nextBtn) {
      return;
    }

    if (this.optionsArea) {
      this.optionsArea.innerHTML = '';
      this.optionsArea.classList.add('hidden');
    }

    if (!line.options || line.options.length === 0) {
      this.nextBtn.classList.remove('hidden');
    } else {
      this.nextBtn.classList.add('hidden');
    }
  }

  renderOptions(options) {
    if (!this.optionsArea) return;
    this.optionsArea.innerHTML = '';
    this.optionsArea.classList.remove('hidden');

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-option-btn';
      btn.textContent = this.replaceVars(opt.text);
      btn.onclick = async () => {
        this.optionsArea.classList.add('hidden');
        if (this.nextBtn) this.nextBtn.classList.remove('hidden');

        if (typeof opt.next === 'number') {
          const targetLine = this.dialogue.find(l => l.id === opt.next);
          if (targetLine) {
            this.current = this.dialogue.indexOf(targetLine);
          } else {
            this.current = opt.next;
          }
        } else if (typeof opt.next === 'string') {
          await this.loadDialogue(opt.next);
          this.current = 0;
        }
        this.showLine();
      };
      this.optionsArea.appendChild(btn);
    });
  }

  nextLine() {
    clearInterval(this.typingTimer);
    const line = this.dialogue[this.current];
    // 如果正在逐字播放，快速跳完
    const fullText = this.getDisplayText(line?.text || '');
    if (this.dialogueContent.textContent.length < fullText.length) {
      this.dialogueContent.textContent = fullText;
      return;
    }

    // 如果目前有選項，不允許透過「下一步」跳過
    if (line?.options && line.options.length > 0) {
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
