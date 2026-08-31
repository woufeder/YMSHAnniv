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
    this.createButton();
    this.createModal();
  }

  createButton() {
    if (document.querySelector(".settings-btn")) return;

    this.btn = document.createElement("button");
    this.btn.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
    this.btn.className = "settings-btn";
    this.btn.type = "button";
    this.btn.setAttribute("aria-label", "開啟設定");
    this.btn.onclick = () => this.toggleModal(true);
    document.body.appendChild(this.btn);
  }

  createOptionGroup(id, label, options) {
    const buttons = options
      .map(
        ({ value, text }) => `
      <button class="setting-option" type="button" data-value="${value}" role="radio" aria-checked="false">${text}</button>
    `,
      )
      .join("");

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
    if (document.querySelector(".settings-modal")) return;

    const volumeOptions = [
      { value: 0, text: "靜音" },
      { value: 0.20, text: "低" },
      { value: 0.40, text: "中" },
      { value: 0.60, text: "高" },
      { value: 0.80, text: "滿" },
    ];
    const speedOptions = [
      { value: 100, text: "慢" },
      { value: 75, text: "稍慢" },
      { value: 45, text: "普通" },
      { value: 30, text: "稍快" },
      { value: 10, text: "快" },
    ];

    const creditsPath = window.location.pathname.includes("/games/")
      ? "../credits.html"
      : "credits.html";

    this.modal = document.createElement("div");
    this.modal.className = "settings-modal hidden";
    this.modal.innerHTML = `
      <div class="settings-content " role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h3 id="settings-title">系統設定</h3>
        ${this.createOptionGroup("vol-bgm", "音樂：真島こころ-陽はまた昇る", volumeOptions)}
        ${this.createOptionGroup("vol-se", "音效", volumeOptions)}
        ${this.createOptionGroup("speed-text", "文字速度(變更後重整才會生效)", speedOptions)}
        <div class="d-grid gap-2 mt-3">
          <button id="close-settings" class="settings-confirm" type="button">確定</button>
          <button id="clear-all-data" class="btn btn-outline-danger btn-sm" type="button" style="font-size: 0.8rem;">清空所有數據</button>
        </div>
        <a class="settings-info" href="credits.html">製作資訊・素材來源</a>
      </div>
    `;
    document.body.appendChild(this.modal);

    const settingsActions = this.modal.querySelector(".d-grid");
    settingsActions?.classList.remove("d-grid", "gap-2", "mt-3");
    settingsActions?.classList.add("settings-actions");

    const clearAllButton = this.modal.querySelector("#clear-all-data");
    clearAllButton?.classList.remove("btn", "btn-outline-danger", "btn-sm");
    clearAllButton?.classList.add("settings-danger");

    this.modal.querySelector(".settings-info").href = creditsPath;

    this.modal.querySelector("#close-settings").onclick = () =>
      this.toggleModal(false);
    this.modal.querySelector("#clear-all-data").onclick = () => {
      if (confirm('確定要清空所有遊戲進度與設定嗎？此操作無法還原。')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    };
    this.bindOptionGroup("vol-bgm", "bgmVolume", 0.20, () =>
      window.bgm?.updateVolume(),
    );
    this.bindOptionGroup("vol-se", "seVolume", 0.5);
    this.bindOptionGroup("speed-text", "textSpeed", 45);
  }

  bindOptionGroup(id, settingKey, defaultValue, onChange) {
    const group = this.modal.querySelector(`#${id}`);
    const options = [...group.querySelectorAll(".setting-option")];
    const savedValue = SettingsManager.get(settingKey, defaultValue);
    const selected = options.reduce(
      (closest, option) => {
        const distance = Math.abs(Number(option.dataset.value) - savedValue);
        return distance < closest.distance ? { option, distance } : closest;
      },
      { option: options[0], distance: Infinity },
    ).option;

    const select = (option) => {
      const value = Number(option.dataset.value);
      options.forEach((item) => {
        const active = item === option;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-checked", active.toString());
      });
      SettingsManager.set(settingKey, value);
      onChange?.(value);
    };

    options.forEach((option) => {
      option.addEventListener("click", () => select(option));
    });
    select(selected);
  }

  toggleModal(show) {
    this.modal.classList.toggle("hidden", !show);
  }
}

const settingsUI = new SettingsUI();
