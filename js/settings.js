/**
 * 設定 UI 元件
 */
class SettingsUI {
  constructor() {
    this.modal = null;
    this.btn = null;
    this.init();
  }

  init() {
    this.createButton();
    this.createModal();
  }

  createButton() {
    this.btn = document.createElement('button');
    this.btn.innerHTML = '⚙️';
    this.btn.className = 'settings-btn';
    this.btn.onclick = () => this.toggleModal(true);
    document.body.appendChild(this.btn);
  }

  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal hidden';
    this.modal.innerHTML = `
      <div class="settings-content">
        <h3>系統設定</h3>

        <div class="setting-item">
          <label>BGM 音量</label>
          <input type="range" id="vol-bgm" min="0" max="1" step="0.2" value="0.5">
        </div>

        <div class="setting-item">
          <label>效果音音量</label>
          <input type="range" id="vol-se" min="0" max="1" step="0.2" value="0.5">
        </div>

        <div class="setting-item">
          <label>文字速度</label>
          <input type="range" id="speed-text" min="0" max="100" step="10" value="50">
          <span id="speed-val">普通</span>
        </div>

        <button id="close-settings">確定</button>
      </div>
    `;
    document.body.appendChild(this.modal);

    // 綁定事件
    this.modal.querySelector('#close-settings').onclick = () => this.toggleModal(false);

    const bgmInput = this.modal.querySelector('#vol-bgm');
    bgmInput.oninput = (e) => {
      const val = parseFloat(e.target.value);
      SettingsManager.set('bgmVolume', val);
      if (window.bgm) bgm.updateVolume();
    };

    const seInput = this.modal.querySelector('#vol-se');
    seInput.oninput = (e) => {
      const val = parseFloat(e.target.value);
      SettingsManager.set('seVolume', val);
    };

    const speedInput = this.modal.querySelector('#speed-text');
    speedInput.oninput = (e) => {
      const val = parseInt(e.target.value);
      SettingsManager.set('textSpeed', val);
      this.updateSpeedLabel(val);
    };

    // 初始化數值
    bgmInput.value = SettingsManager.get('bgmVolume', 0.5);
    seInput.value = SettingsManager.get('seVolume', 0.5);
    speedInput.value = SettingsManager.get('textSpeed', 50);
    this.updateSpeedLabel(speedInput.value);
  }

  updateSpeedLabel(val) {
    const label = this.modal.querySelector('#speed-val');
    if (val === 0) label.textContent = '瞬間';
    else if (val < 30) label.textContent = '快';
    else if (val < 70) label.textContent = '普通';
    else label.textContent = '慢';
  }

  toggleModal(show) {
    if (show) {
      this.modal.classList.remove('hidden');
    } else {
      this.modal.classList.add('hidden');
    }
  }
}

// 實例化
const settingsUI = new SettingsUI();
