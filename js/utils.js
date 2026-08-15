// utils.js - 通用工具函式
const STORAGE_EXPIRY_MINUTES = 30;
const STORAGE_EXPIRY_MS = STORAGE_EXPIRY_MINUTES * 60 * 1000;
const STORAGE_LAST_CLOSED_KEY = 'ymsh:lastClosedAt';
const STORAGE_SESSION_MARKER_KEY = 'ymsh:sessionActive';
const PLAYER_INPUT_KEY = 'playerInput';
const APP_ROOT_URL = (() => {
  const scriptUrl = document.currentScript?.src;
  return scriptUrl ? new URL('../', scriptUrl).href : new URL('./', window.location.href).href;
})();

function resolveAppAsset(path) {
  return new URL(path, APP_ROOT_URL).href;
}

function clearExpiredLocalStorage() {
  try {
    const isNewSession = !sessionStorage.getItem(STORAGE_SESSION_MARKER_KEY);
    if (!isNewSession) {
      return;
    }

    const lastClosedAt = parseInt(localStorage.getItem(STORAGE_LAST_CLOSED_KEY), 10);
    if (Number.isFinite(lastClosedAt) && Date.now() - lastClosedAt >= STORAGE_EXPIRY_MS) {
      localStorage.clear();
    }

    sessionStorage.setItem(STORAGE_SESSION_MARKER_KEY, '1');
    localStorage.removeItem(STORAGE_LAST_CLOSED_KEY);
  } catch (error) {
    console.error('Error clearing expired localStorage:', error);
  }
}

function markLocalStorageClosedAt() {
  try {
    localStorage.setItem(STORAGE_LAST_CLOSED_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error writing localStorage close timestamp:', error);
  }
}

function guardPlayerInputAccess() {
  try {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const exemptPages = new Set(['index.html', 'hall.html', 'whoAreYou.html']);

    if (exemptPages.has(currentPage)) {
      return;
    }

    const playerInput = localStorage.getItem(PLAYER_INPUT_KEY);
    if (playerInput && playerInput.trim()) {
      return;
    }

    const isGamePage = window.location.pathname.includes('/games/');
    const fallbackPath = isGamePage ? '../whoAreYou.html' : 'whoAreYou.html';
    window.location.replace(fallbackPath);
  } catch (error) {
    console.error('Error guarding playerInput access:', error);
  }
}

clearExpiredLocalStorage();
guardPlayerInputAccess();
window.addEventListener('pagehide', markLocalStorageClosedAt);
window.addEventListener('beforeunload', markLocalStorageClosedAt);

// 取得 localStorage 資料的安全方法
function getStorageData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

// 設定 localStorage 資料的安全方法
function setStorageData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
    return false;
  }
}

// 動畫工具 - 淡入效果
function fadeIn(element, duration = 300) {
  element.style.opacity = 0;
  element.style.display = 'block';

  const start = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      element.style.opacity = progress;
      requestAnimationFrame(animate);
    } else {
      element.style.opacity = 1;
    }
  }

  requestAnimationFrame(animate);
}

// 動畫工具 - 淡出效果
function fadeOut(element, duration = 300) {
  const start = performance.now();
  const startOpacity = parseFloat(window.getComputedStyle(element).opacity);

  function animate(currentTime) {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      element.style.opacity = startOpacity * (1 - progress);
      requestAnimationFrame(animate);
    } else {
      element.style.opacity = 0;
      element.style.display = 'none';
    }
  }

  requestAnimationFrame(animate);
}

// 滑動效果
function slideIn(element, direction = 'left', duration = 300) {
  const directions = {
    left: { from: '-100%', to: '0%', property: 'translateX' },
    right: { from: '100%', to: '0%', property: 'translateX' },
    up: { from: '-100%', to: '0%', property: 'translateY' },
    down: { from: '100%', to: '0%', property: 'translateY' }
  };

  const config = directions[direction];
  element.style.transform = `${config.property}(${config.from})`;
  element.style.display = 'block';

  const start = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      const currentPos = parseFloat(config.from) * (1 - progress);
      element.style.transform = `${config.property}(${currentPos}%)`;
      requestAnimationFrame(animate);
    } else {
      element.style.transform = `${config.property}(${config.to})`;
    }
  }

  requestAnimationFrame(animate);
}

// 彈跳效果
function bounce(element, scale = 1.1, duration = 200) {
  const originalTransform = element.style.transform || 'scale(1)';

  element.style.transform = `scale(${scale})`;
  element.style.transition = `transform ${duration}ms ease-out`;

  setTimeout(() => {
    element.style.transform = originalTransform;
    setTimeout(() => {
      element.style.transition = '';
    }, duration);
  }, duration);
}

// 震動效果
function shake(element, intensity = 10, duration = 300) {
  const originalPosition = element.style.position || 'static';
  const originalLeft = element.style.left || '0px';

  element.style.position = 'relative';

  const start = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      const offset = Math.sin(progress * Math.PI * 10) * intensity * (1 - progress);
      element.style.left = parseFloat(originalLeft) + offset + 'px';
      requestAnimationFrame(animate);
    } else {
      element.style.position = originalPosition;
      element.style.left = originalLeft;
    }
  }

  requestAnimationFrame(animate);
}

// 隨機數生成器
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// 隨機整數生成器
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 陣列隨機排序
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 延遲執行
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 防抖動函式
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 節流函式
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 格式化時間
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 檢查是否為行動裝置
function isMobile() {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 播放音效：未指定副檔名時會依序嘗試 MP3 與 WAV。
function playSound(soundName) {
  try {
    const seVolume = parseFloat(localStorage.getItem('ymsh:setting_seVolume') || '0.5');
    const hasExtension = /\.(mp3|wav)$/i.test(soundName);
    const fileNames = hasExtension
      ? [soundName]
      : [`${soundName}.mp3`, `${soundName}.wav`];
    const audio = document.createElement('audio');

    fileNames.forEach((fileName) => {
      const source = document.createElement('source');
      source.src = resolveAppAsset(`assets/audio/${fileName}`);
      source.type = fileName.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
      audio.appendChild(source);
    });

    audio.volume = seVolume;
    audio.load();
    audio.play().catch(e => console.log('Audio play failed:', e));
  } catch (error) {
    console.log('Sound not available:', soundName);
  }
}

/**
 * 設定管理器 - 負責音量與速度的持久化
 */
const SettingsManager = {
  get(key, defaultValue) {
    const val = localStorage.getItem(`ymsh:setting_${key}`);
    return val !== null ? parseFloat(val) : defaultValue;
  },
  set(key, value) {
    localStorage.setItem(`ymsh:setting_${key}`, value.toString());
  }
};

/**
 * BGM 管理器 - 實現跨頁接續播放
 */
class BGMManager {
  constructor(audioSrc, volume = 0.5) {
    this.audio = new Audio(audioSrc);
    this.audio.loop = true;
    this.storageKey = 'ymsh:bgm_currentTime';
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    // 1. 從 localStorage 恢復播放進度
    const savedTime = localStorage.getItem(this.storageKey);
    if (savedTime) {
      this.audio.currentTime = parseFloat(savedTime);
    }

    // 2. 定時儲存目前進度 (每 1 秒存一次)
    setInterval(() => {
      localStorage.setItem(this.storageKey, this.audio.currentTime.toString());
    }, 1000);

    this.updateVolume();
    this.isInitialized = true;
  }

  async play() {
    try {
      await this.audio.play();
    } catch (e) {
      console.log('BGM Autoplay blocked. Waiting for user interaction.');
      document.addEventListener('click', () => {
        this.audio.play();
      }, { once: true });
    }
  }

  stop() {
    this.audio.pause();
  }

  updateVolume() {
    const vol = SettingsManager.get('bgmVolume', 0.5);
    this.audio.volume = vol;
  }
}

// 建立單例供全站使用
const bgm = new BGMManager(resolveAppAsset('assets/audio/hihamatanoboru.mp3'));
window.bgm = bgm;
window.resolveAppAsset = resolveAppAsset;

window.addEventListener('DOMContentLoaded', () => {
  bgm.init();
  bgm.play();
});


// 顯示載入中動畫
function showLoading(container) {
  const loader = document.createElement('div');
  loader.className = 'loading-spinner';
  loader.innerHTML = '載入中...';
  container.appendChild(loader);
  return loader;
}

// 隱藏載入中動畫
function hideLoading(loader) {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}


// 淡入淡出
function fadeTo(url, element = 'scene-container') {
  const el = document.querySelector(`.${element}`);
  if (!el) return;

  el.style.transition = 'opacity 0.6s ease';
  el.style.opacity = 0;

  el.addEventListener('transitionend', () => {
    window.location.href = url;
  }, { once: true });
}
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('fade-in');
});

// 畫面效果動畫
function triggerEffect(type) {
  const target = document.querySelector('.scene-container') || document.body;

  switch (type) {
    case 'shake':
      target.classList.add('shake');
      setTimeout(() => target.classList.remove('shake'), 600);
      break;

    case 'shakeStrong':
      target.classList.add('shakeStrong');
      setTimeout(() => target.classList.remove('shakeStrong'), 800);
      break;

    case 'flash':
      target.classList.add('flash');
      setTimeout(() => target.classList.remove('flash'), 400);
      break;

    default:
      console.warn('未知效果:', type);
  }
}
