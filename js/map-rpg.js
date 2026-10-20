// map-rpg.js - RPG 式地圖移動控制
(function () {
  "use strict";

  const MAP_WIDTH = 5959;
  const MAP_HEIGHT = 4092;

  // 角色設定
  const CHARACTER_CONFIG = {
    tileSize: 32, // 每個格子大小
    framesPerDirection: 3, // 每個方向 3 幀動畫
    totalDirections: 4, // 上、下、左、右
    spriteSheet: "assets/images/RPG-avatar.png", // Sprite sheet 路徑
    speed: 400, // 移動速度
  };

  // 計算 sprite sheet 尺寸
  // 排列方式：4 行 x 3 列 = 96x128
  const SPRITE_WIDTH = CHARACTER_CONFIG.tileSize * 3; // 96px (3 frames wideF)
  const SPRITE_HEIGHT = CHARACTER_CONFIG.tileSize * 4; // 128px (4 rows high)

  // 各地點的觸發範圍（縮小避免誤觸）
  const LOCATIONS = Object.freeze([
    {
      id: "art",
      name: "藝術大樓",
      x: 1025,
      y: 1200,
      radius: 120, // 縮小觸發範圍
      url: "art.html",
    },
    {
      id: "classroom",
      name: "教室",
      x: 565,
      y: 3000,
      radius: 120,
      url: "games/classroom.html",
    },
    {
      id: "garden",
      name: "花圃",
      x: 2225,
      y: 950,
      radius: 120,
      url: "games/garden.html",
    },
    {
      id: "lab",
      name: "實驗室",
      x: 2550,
      y: 2600,
      radius: 120,
      url: "games/lab.html",
    },
    {
      id: "principal",
      name: "校長室",
      x: 3500,
      y: 3200,
      radius: 120,
      url: "principal.html",
    },
    {
      id: "hall",
      name: "穿堂",
      x: 3355,
      y: 1500,
      radius: 120,
      url: "hall.html",
    },
    {
      id: "playground",
      name: "操場",
      x: 4850,
      y: 1600,
      radius: 120,
      url: "playground.html",
    },
    {
      id: "index",
      name: "校門口",
      x: 4400,
      y: 3600,
      radius: 120,
      url: "index.html",
    },
  ]);

  // 可行走區域（簡單的矩形範圍，可根據實際地圖調整）
  const WALKABLE_AREA = {
    left: 100,
    top: 100,
    right: MAP_WIDTH - 100,
    bottom: MAP_HEIGHT - 100,
  };

  class RPGMapController {
    constructor() {
      this.player = { x: 4400, y: 3600 }; // 從校門口開始
      this.speed = CHARACTER_CONFIG.speed;
      this.isMoving = false;
      this.currentTrigger = null;
      // 出生時所在的傳送點先封鎖，必須離開該範圍後才能重新觸發
      this.isAnimating = false;
      this.isTransitioning = false;
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.animationInterval = 150; // 動畫幀率（毫秒）
      this.lastDirection = "front";

      // 避免出生點及取消 Modal 後重複觸發
      this.blockedTriggerIds = new Set();

      // 道路碰撞遮罩
      this.collisionCanvas = null;
      this.collisionContext = null;
      this.collisionReady = false;

      // 地點確認 Modal
      this.locationModal = null;
      this.pendingLocation = null;
      this.confirmEnterButton = null;

      // 遊戲迴圈時間
      this.lastFrameTime = 0;
      this.keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false,
        s: false,
        a: false,
        d: false,
        W: false,
        S: false,
        A: false,
        D: false,
      };

      this.playerElement = null;
      this.spriteImg = null;
      this.rpgControls = null;

      this.init();
    }

    init() {
      this.playerElement = document.getElementById("playerCharacter");
      this.spriteImg = document.getElementById("playerSprite");
      this.rpgControls = document.getElementById("rpgControls");

      if (!this.playerElement || !this.spriteImg) {
        console.warn("RPG Mode: player element not found");
        return;
      }

      this.loadSpriteSheet();

      // 載入道路碰撞遮罩
      this.loadCollisionMap();

      // 設定角色碰撞時使用的 Modal
      this.setupLocationModal();

      this.playerElement.style.display = "block";

      this.setupKeyboardControls();

      if (this.isTouchDevice()) {
        if (this.rpgControls) {
          this.rpgControls.style.display = "flex";
          this.setupTouchControls();
        }
      }

      // 出生點如果正好位於傳送區，先暫時封鎖
      this.blockInitialTriggers();

      this.updatePlayerElement();

      window.addEventListener("resize", () => {
        this.updatePlayerElement();
      });

      this.gameLoop();
    }

    loadSpriteSheet() {
      if (!this.spriteImg) return;

      const image = new Image();

      image.onload = () => {
        console.log(
          "Sprite sheet loaded successfully:",
          image.naturalWidth,
          image.naturalHeight,
        );

        this.spriteImg.style.backgroundImage = `url("${CHARACTER_CONFIG.spriteSheet}")`;

        this.spriteImg.style.backgroundRepeat = "no-repeat";
        this.spriteImg.style.backgroundSize = `${SPRITE_WIDTH}px ${SPRITE_HEIGHT}px`;
      };

      image.onerror = () => {
        console.error(
          "Failed to load sprite sheet:",
          CHARACTER_CONFIG.spriteSheet,
        );

        this.spriteImg.textContent = "角色圖片載入失敗";
        this.spriteImg.style.color = "red";
        this.spriteImg.style.fontSize = "12px";
      };

      image.src = CHARACTER_CONFIG.spriteSheet;
    }

    loadCollisionMap() {
      this.collisionCanvas = document.getElementById("collisionCanvas");

      if (!this.collisionCanvas) {
        console.error("RPG Mode: 找不到 #collisionCanvas");
        return;
      }

      this.collisionCanvas.width = MAP_WIDTH;
      this.collisionCanvas.height = MAP_HEIGHT;

      this.collisionContext = this.collisionCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      const collisionImage = new Image();

      collisionImage.onload = () => {
        this.collisionContext.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

        this.collisionContext.drawImage(
          collisionImage,
          0,
          0,
          MAP_WIDTH,
          MAP_HEIGHT,
        );

        this.collisionReady = true;

        console.log(
          "出生點是否可行走：",
          this.isWalkable(this.player.x, this.player.y),
        );

        console.log(
          "道路碰撞圖載入成功：",
          collisionImage.naturalWidth,
          collisionImage.naturalHeight,
        );
      };

      collisionImage.onerror = () => {
        this.collisionReady = false;

        console.error("道路碰撞圖載入失敗：assets/images/map-collision.png");
      };

      collisionImage.src = "assets/images/map-collision.png";
    }

    setupLocationModal() {
      const modalElement = document.getElementById("locationConfirmModal");

      this.confirmEnterButton = document.getElementById("confirmEnterLocation");

      if (!modalElement) {
        console.error("RPG Mode: 找不到 #locationConfirmModal");
        return;
      }

      if (typeof bootstrap === "undefined") {
        console.error("RPG Mode: Bootstrap JavaScript 尚未載入");
        return;
      }

      this.locationModal = new bootstrap.Modal(modalElement, {
        backdrop: "static",
        keyboard: true,
      });

      this.confirmEnterButton?.addEventListener("click", () => {
        if (!this.pendingLocation) return;

        const location = this.pendingLocation;

        // 先標記為即將進入，避免 hidden 事件執行取消流程
        this.isTransitioning = true;

        this.locationModal.hide();
        this.enterLocation(location);
      });

      modalElement.addEventListener("hidden.bs.modal", () => {
        // 按「進入地點」關閉 Modal 時，不執行取消
        if (this.isTransitioning) return;

        this.cancelLocationEntry();
      });
    }

    clearMovementKeys() {
      Object.keys(this.keys).forEach((key) => {
        this.keys[key] = false;
      });

      this.isMoving = false;

      this.rpgControls
        ?.querySelectorAll(".dir-btn.active")
        .forEach((button) => {
          button.classList.remove("active");
        });
    }

    cancelLocationEntry() {
      if (this.currentTrigger) {
        // 取消後先封鎖目前地點，避免站在原地反覆跳出 Modal
        this.blockedTriggerIds.add(this.currentTrigger.id);
      }

      this.currentTrigger = null;
      this.pendingLocation = null;
      this.isAnimating = false;
      this.isTransitioning = false;

      this.clearMovementKeys();
    }

    async enterLocation(location) {
      if (!location) {
        this.isTransitioning = false;
        this.cancelLocationEntry();
        return;
      }

      this.isAnimating = true;
      this.isTransitioning = true;
      this.clearMovementKeys();

      try {
        const introSeenKey = `seen_intro_${location.id}`;

        const hasSeenIntro = sessionStorage.getItem(introSeenKey) === "true";

        if (!hasSeenIntro) {
          await this.showLocationIntro(location);
        }

        window.location.href = location.url;
      } catch (error) {
        console.error(`Error entering ${location.name}:`, error);

        this.isTransitioning = false;
        this.cancelLocationEntry();
      }
    }

    isTouchDevice() {
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    }

    setupKeyboardControls() {
      window.addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        const arrowKey = e.key.startsWith("Arrow") ? e.key : null;
        const mapKey = arrowKey || key;

        if (this.keys.hasOwnProperty(mapKey) && mapKey) {
          this.keys[mapKey] = true;
          this.isMoving = true;

          if (arrowKey) {
            e.preventDefault();
          }
        }
      });

      window.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        const arrowKey = e.key.startsWith("Arrow") ? e.key : null;
        const mapKey = arrowKey || key;

        if (this.keys.hasOwnProperty(mapKey) && mapKey) {
          this.keys[mapKey] = false;

          const stillPressed = Object.values(this.keys).some((v) => v);
          if (!stillPressed) {
            this.isMoving = false;
          }
        }
      });
    }

    setupTouchControls() {
      const buttons = this.rpgControls?.querySelectorAll(".dir-btn");
      if (!buttons) return;

      buttons.forEach((btn) => {
        const key = btn.dataset.key;

        btn.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            this.keys[key] = true;
            this.isMoving = true;
            btn.classList.add("active");
          },
          { passive: false },
        );

        btn.addEventListener("touchend", (e) => {
          e.preventDefault();
          this.keys[key] = false;
          btn.classList.remove("active");

          const stillPressed = Object.values(this.keys).some((v) => v);
          if (!stillPressed) {
            this.isMoving = false;
          }
        });

        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.keys[key] = true;
          this.isMoving = true;
          btn.classList.add("active");
        });

        btn.addEventListener("mouseup", (e) => {
          e.preventDefault();
          this.keys[key] = false;
          btn.classList.remove("active");

          const stillPressed = Object.values(this.keys).some((v) => v);
          if (!stillPressed) {
            this.isMoving = false;
          }
        });

        btn.addEventListener("mouseleave", (e) => {
          this.keys[key] = false;
          btn.classList.remove("active");

          const stillPressed = Object.values(this.keys).some((v) => v);
          if (!stillPressed) {
            this.isMoving = false;
          }
        });
      });
    }

    updatePlayerPosition(deltaSeconds) {
      if (
        !this.isMoving ||
        this.isTransitioning ||
        this.isAnimating ||
        this.currentTrigger
      ) {
        return;
      }

      // 碰撞圖尚未載入完成時，先禁止移動
      if (!this.collisionReady) {
        return;
      }

      let dx = 0;
      let dy = 0;

      if (this.keys.ArrowUp || this.keys.w || this.keys.W) {
        dy = -1;
      }

      if (this.keys.ArrowDown || this.keys.s || this.keys.S) {
        dy = 1;
      }

      if (this.keys.ArrowLeft || this.keys.a || this.keys.A) {
        dx = -1;
      }

      if (this.keys.ArrowRight || this.keys.d || this.keys.D) {
        dx = 1;
      }

      if (dx === 0 && dy === 0) {
        this.isMoving = false;
        return;
      }

      // 對角線保持相同總速度
      const length = Math.hypot(dx, dy);

      dx = (dx / length) * this.speed * deltaSeconds;
      dy = (dy / length) * this.speed * deltaSeconds;

      const nextX = this.player.x + dx;
      const nextY = this.player.y + dy;
      // 先檢查水平方向
      if (
        this.isInsideMap(nextX, this.player.y) &&
        this.isWalkable(nextX, this.player.y)
      ) {
        this.player.x = nextX;
      }

      // 再檢查垂直方向
      if (
        this.isInsideMap(this.player.x, nextY) &&
        this.isWalkable(this.player.x, nextY)
      ) {
        this.player.y = nextY;
      }

      this.updateAnimation(deltaSeconds);
      this.updatePlayerElement();
      this.checkTriggers();
    }

    isInsideMap(x, y) {
      const footHalfWidth = 7;
      const footTopOffset = 4;

      return (
        x - footHalfWidth >= WALKABLE_AREA.left &&
        x + footHalfWidth <= WALKABLE_AREA.right &&
        y - footTopOffset >= WALKABLE_AREA.top &&
        y <= WALKABLE_AREA.bottom
      );
    }

    isWalkable(x, y) {
      if (!this.collisionReady || !this.collisionContext) {
        return false;
      }

      /*
       * 檢查角色腳底三個點：
       *
       * 左腳底  中央  右腳底
       *
       * 不檢查整個 32×32 方框，
       * 否則角色頭部靠近建築時也會被擋住。
       */
      const footPoints = [
        { x: x - 7, y: y - 2 },
        { x, y },
        { x: x + 7, y: y - 2 },
      ];

      return footPoints.every((point) => {
        const sampleX = Math.round(point.x);
        const sampleY = Math.round(point.y);

        if (!this.isInsideMap(sampleX, sampleY)) {
          return false;
        }

        const pixel = this.collisionContext.getImageData(
          sampleX,
          sampleY,
          1,
          1,
        ).data;

        const red = pixel[0];
        const green = pixel[1];
        const blue = pixel[2];
        const alpha = pixel[3];

        const brightness = (red + green + blue) / 3;

        // 越接近白色越能通行
        return alpha > 0 && brightness >= 180;
      });
    }

    mapToScreen(mapX, mapY) {
      const mapImage = document.getElementById("campusMap");
      const mapArea = document.querySelector(".map-area");

      if (!mapImage || !mapArea) {
        return { x: 0, y: 0 };
      }

      const containerWidth = mapArea.clientWidth;
      const containerHeight = mapArea.clientHeight;

      // object-fit: contain 的實際縮放比例
      const scale = Math.min(
        containerWidth / MAP_WIDTH,
        containerHeight / MAP_HEIGHT,
      );

      // 縮放後的圖片尺寸
      const renderedWidth = MAP_WIDTH * scale;
      const renderedHeight = MAP_HEIGHT * scale;

      // object-position: center 所產生的留白
      const offsetX = (containerWidth - renderedWidth) / 2;
      const offsetY = (containerHeight - renderedHeight) / 2;

      return {
        x: offsetX + mapX * scale,
        y: offsetY + mapY * scale,
      };
    }

    updatePlayerElement() {
      if (!this.playerElement || !this.spriteImg) return;

      // 將地圖原始座標轉換成目前畫面座標
      const screenPosition = this.mapToScreen(this.player.x, this.player.y);

      this.playerElement.style.left = `${screenPosition.x}px`;
      this.playerElement.style.top = `${screenPosition.y}px`;

      const direction = this.getCurrentDirection();
      const row = this.getDirectionRow(direction);

      const frameX = this.currentFrame * CHARACTER_CONFIG.tileSize;
      const frameY = row * CHARACTER_CONFIG.tileSize;

      this.spriteImg.style.width = `${CHARACTER_CONFIG.tileSize}px`;
      this.spriteImg.style.height = `${CHARACTER_CONFIG.tileSize}px`;

      this.spriteImg.style.backgroundImage = `url("${CHARACTER_CONFIG.spriteSheet}")`;

      this.spriteImg.style.backgroundRepeat = "no-repeat";
      this.spriteImg.style.backgroundSize = `${SPRITE_WIDTH}px ${SPRITE_HEIGHT}px`;

      this.spriteImg.style.backgroundPosition = `-${frameX}px -${frameY}px`;
    }

    getCurrentDirection() {
      if (this.keys.ArrowUp || this.keys.w || this.keys.W) {
        this.lastDirection = "back";
      } else if (this.keys.ArrowDown || this.keys.s || this.keys.S) {
        this.lastDirection = "front";
      } else if (this.keys.ArrowRight || this.keys.d || this.keys.D) {
        this.lastDirection = "right";
      } else if (this.keys.ArrowLeft || this.keys.a || this.keys.A) {
        this.lastDirection = "left";
      }

      return this.lastDirection;
    }

    getDirectionRow(direction) {
      // 根據 sprite sheet 的排列方式
      // 行 0: 面向前，行 1: 面向後，行 2: 面向右，行 3: 面向左
      const rows = {
        front: 0, // 向下
        back: 1, // 向上
        right: 2, // 向右
        left: 3, // 向左
      };
      return rows[direction] || 0;
    }

    updateAnimation(deltaSeconds) {
      if (!this.isMoving) {
        this.currentFrame = 0;
        this.frameTimer = 0;
        return;
      }

      this.frameTimer += deltaSeconds * 1000;

      if (this.frameTimer >= this.animationInterval) {
        this.frameTimer %= this.animationInterval;

        this.currentFrame =
          (this.currentFrame + 1) % CHARACTER_CONFIG.framesPerDirection;
      }
    }

    blockInitialTriggers() {
      for (const location of LOCATIONS) {
        const dx = this.player.x - location.x;
        const dy = this.player.y - location.y;
        const distance = Math.hypot(dx, dy);

        if (distance < location.radius) {
          this.blockedTriggerIds.add(location.id);
        }
      }
    }

    checkTriggers() {
      if (this.isAnimating || this.isTransitioning) return;

      for (const location of LOCATIONS) {
        const dx = this.player.x - location.x;
        const dy = this.player.y - location.y;
        const distance = Math.hypot(dx, dy);
        const isInside = distance < location.radius;

        // 出生時就在此傳送點內，離開範圍前不觸發
        if (this.blockedTriggerIds.has(location.id)) {
          if (!isInside) {
            // 已離開出生傳送點，之後重新走進去時可以正常觸發
            this.blockedTriggerIds.delete(location.id);
          }

          continue;
        }

        if (isInside && !this.currentTrigger) {
          this.currentTrigger = location;
          this.handleLocationTrigger(location);
          break;
        }
      }
    }

    handleLocationTrigger(location) {
      this.isAnimating = true;
      this.isMoving = false;
      this.pendingLocation = location;

      this.clearMovementKeys();

      const nameElement = document.getElementById("locationConfirmName");

      if (nameElement) {
        nameElement.textContent = location.name;
      }

      if (!this.locationModal) {
        console.error(
          "地點 Modal 尚未初始化，請檢查 Bootstrap JS 和 Modal HTML",
        );

        this.cancelLocationEntry();
        return;
      }

      this.locationModal.show();
    }

    async showLocationIntro(location) {
      if (typeof startLocationIntro !== "function") {
        return;
      }

      try {
        await startLocationIntro({
          data: `data/intro_${location.id}.json`,
          storageKey: `seen_intro_${location.id}`,
          contentSelector: "#mapContent",
          onReady: () => {},
        });
      } catch (error) {
        console.warn(`Could not load intro for ${location.name}:`, error);
      }
    }

    gameLoop(timestamp = 0) {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }

      let deltaSeconds = (timestamp - this.lastFrameTime) / 1000;

      this.lastFrameTime = timestamp;

      // 避免切換分頁再回來時，角色瞬間跳很遠
      deltaSeconds = Math.min(deltaSeconds, 0.033);

      this.updatePlayerPosition(deltaSeconds);

      requestAnimationFrame((nextTimestamp) => {
        this.gameLoop(nextTimestamp);
      });
    }
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new RPGMapController();
    });
  } else {
    new RPGMapController();
  }
})();
