/**
 * 全站設定面板
 */
class SettingsUI {
  constructor() {
    this.modal = null;
    this.btn = null;
    this.init();
  }

  init() {
    this.injectStyles();
    this.createButton();
    this.createModal();
  }

  injectStyles() {
    if (document.getElementById('settings-ui-style')) return;

    const style = document.createElement('style');
    style.id = 'settings-ui-style';
    style.textContent = `
      .settings-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border: 2px solid #fff;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }

      .settings-btn:hover {
        transform: rotate(45deg) scale(1.1);
      }

      .settings-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
      }

      .settings-modal.hidden {
        display: none;
      }

      .settings-content {
        width: min(360px, calc(100vw - 32px));
        padding: 28px;
        border-radius: 8px;
        background: #343742;
        color: #fff;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: "LXGW WenKai Mono TC", "Noto Sans TC", sans-serif;
      }

      .settings-content h3 {
        margin: 0;
        text-align: center;
        color: #BDBDFB;
      }

      .bgm-credit {
        margin: -6px 0 0;
        color: #d9d9ff;
        font-size: 14px;
        line-height: 1.5;
      }

      .bgm-credit i {
        margin-right: 6px;
      }

      .setting-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .setting-item label {
        font-size: 16px;
      }

      .setting-options {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
      }

      .setting-option {
        min-height: 38px;
        padding: 4px 2px;
        border: 1px solid #8495B1;
        border-radius: 8px;
        background: transparent;
        color: #dfe5f0;
        font: inherit;
        font-size: 13px;
        line-height: 1.2;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }

      .setting-option:hover,
      .setting-option:focus-visible {
        border-color: #BDBDFB;
        outline: none;
      }

      .setting-option.is-active {
        border-color: #BDBDFB;
        background: #BDBDFB;
        color: #343742;
        font-weight: bold;
      }

      .settings-confirm {
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: #8495B1;
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: bold;
      }

      .settings-confirm:hover,
      .settings-confirm:focus-visible {
        background: #BDBDFB;
        color: #343742;
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }

  createButton() {
    if (document.querySelector('.settings-btn')) return;

    this.btn = document.createElement('button');
    this.btn.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
    this.btn.className = 'settings-btn';
    this.btn.type = 'button';
    this.btn.setAttribute('aria-label', '開啟設定');
    this.btn.onclick = () => this.toggleModal(true);
    document.body.appendChild(this.btn);
  }

  createOptionGroup(id, label, options) {
    const buttons = options.map(({ value, text }) => `
      <button class="setting-option" type="button" data-value="${value}" role="radio" aria-checked="false">${text}</button>
    `).join('');

    return `
      <div class="setting-item">
        <label id="${id}-label">${label}</label>
        <div id="${id}" class="setting-options" role="radiogroup" aria-labelledby="${id}-label">
          ${buttons}
        </div>
      </div>
    `;
  }

  createModal() {
    if (document.querySelector('.settings-modal')) return;

    const volumeOptions = [
      { value: 0, text: '靜音' },
      { value: 0.25, text: '低' },
      { value: 0.5, text: '中' },
      { value: 0.75, text: '高' },
      { value: 1, text: '滿' }
    ];
    const speedOptions = [
      { value: 120, text: '慢' },
      { value: 90, text: '稍慢' },
      { value: 60, text: '普通' },
      { value: 35, text: '稍快' },
      { value: 15, text: '快' }
    ];

    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal hidden';
    this.modal.innerHTML = `
      <div class="settings-content" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h3 id="settings-title">系統設定</h3>
        <p class="bgm-credit"><i class="fa-solid fa-music" aria-hidden="true"></i> 真島こころ-陽はまた昇る</p>
        ${this.createOptionGroup('vol-bgm', 'BGM 音量', volumeOptions)}
        ${this.createOptionGroup('vol-se', '效果音音量', volumeOptions)}
        ${this.createOptionGroup('speed-text', '文字速度', speedOptions)}
        <p class="bgm-credit">文字速度變更後請重整頁面才會生效</p>
        <button id="close-settings" class="settings-confirm" type="button">確定</button>
      </div>
    `;
    document.body.appendChild(this.modal);

    this.modal.querySelector('#close-settings').onclick = () => this.toggleModal(false);
    this.bindOptionGroup('vol-bgm', 'bgmVolume', 0.25, () => window.bgm?.updateVolume());
    this.bindOptionGroup('vol-se', 'seVolume', 0.5);
    this.bindOptionGroup('speed-text', 'textSpeed', 60);
  }

  bindOptionGroup(id, settingKey, defaultValue, onChange) {
    const group = this.modal.querySelector(`#${id}`);
    const options = [...group.querySelectorAll('.setting-option')];
    const savedValue = SettingsManager.get(settingKey, defaultValue);
    const selected = options.reduce((closest, option) => {
      const distance = Math.abs(Number(option.dataset.value) - savedValue);
      return distance < closest.distance ? { option, distance } : closest;
    }, { option: options[0], distance: Infinity }).option;

    const select = (option) => {
      const value = Number(option.dataset.value);
      options.forEach((item) => {
        const active = item === option;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-checked', active.toString());
      });
      SettingsManager.set(settingKey, value);
      onChange?.(value);
    };

    options.forEach((option) => {
      option.addEventListener('click', () => select(option));
    });
    select(selected);
  }

  toggleModal(show) {
    this.modal.classList.toggle('hidden', !show);
  }
}

const settingsUI = new SettingsUI();
