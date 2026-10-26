// map-rpg.js - RPG 式地圖移動控制
(function () {
  "use strict";

  const MAP_CONFIG = window.YMSHMapConfig;

  if (!MAP_CONFIG) {
    console.error("RPG Mode: 找不到 YMSHMapConfig");
    return;
  }

  const MAP_WIDTH = MAP_CONFIG.width;
  const MAP_HEIGHT = MAP_CONFIG.height;
  const LOCATIONS = MAP_CONFIG.locations;
  const EASTER_EGGS = (MAP_CONFIG.easterEggs || []).filter(
    (easterEgg) => easterEgg.enabled !== false,
  );

  // 角色設定
  const CHARACTER_CONFIG = {
    tileSize: 48, // 144 x 192 sprite sheet，每格為 48 x 48
    framesPerDirection: 3, // 每個方向 3 幀動畫
    totalDirections: 4, // 上、下、左、右
    spriteSheet: "assets/images/RPG-avatar.png", // Sprite sheet 路徑
    speed: 150, // 依 1867 × 1280 地圖尺寸換算後的移動速度
  };

  // 計算 sprite sheet 尺寸
  // 排列方式：4 行 x 3 列 = 144 x 192
  const SPRITE_WIDTH = CHARACTER_CONFIG.tileSize * 3;
  const SPRITE_HEIGHT = CHARACTER_CONFIG.tileSize * 4;

  // 遮罩外框仍保留少量邊距，實際可行走範圍由碰撞圖決定。
  const WALKABLE_AREA = {
    left: 8,
    top: 8,
    right: MAP_WIDTH - 8,
    bottom: MAP_HEIGHT - 8,
  };

  function resolveAreaLength(value, size) {
    const token = String(value).trim();
    const number = Number.parseFloat(token);
    if (!Number.isFinite(number)) return null;
    return token.endsWith("%") ? (number / 100) * size : number;
  }

  function resolveAreaPosition(value, size) {
    const token = String(value || "50%").trim().toLowerCase();
    if (token === "left" || token === "top") return 0;
    if (token === "center") return size / 2;
    if (token === "right" || token === "bottom") return size;
    return resolveAreaLength(token, size);
  }

  function isInsidePolygon(x, y, points) {
    let inside = false;

    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
      const currentPoint = points[index];
      const previousPoint = points[previous];
      const crossesY = currentPoint.y > y !== previousPoint.y > y;
      const crossingX =
        ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
        currentPoint.x;

      if (crossesY && x < crossingX) inside = !inside;
    }

    return inside;
  }

  function isInsideClipPath(localX, localY, area) {
    const clipPath = area.clipPath?.trim();
    if (!clipPath || clipPath === "none") return true;

    const circleMatch = clipPath.match(
      /^circle\(\s*([^\s]+)(?:\s+at\s+([^\s]+)\s+([^\s]+))?\s*\)$/i,
    );
    if (circleMatch) {
      const centerX = resolveAreaPosition(circleMatch[2], area.width);
      const centerY = resolveAreaPosition(circleMatch[3], area.height);
      const radiusToken = circleMatch[1].toLowerCase();
      let radius;

      if (radiusToken === "closest-side") {
        radius = Math.min(
          centerX,
          area.width - centerX,
          centerY,
          area.height - centerY,
        );
      } else if (radiusToken === "farthest-side") {
        radius = Math.max(
          centerX,
          area.width - centerX,
          centerY,
          area.height - centerY,
        );
      } else {
        radius = resolveAreaLength(
          radiusToken,
          Math.hypot(area.width, area.height) / Math.SQRT2,
        );
      }

      if (radius === null || centerX === null || centerY === null) return true;
      return Math.hypot(localX - centerX, localY - centerY) <= radius;
    }

    const ellipseMatch = clipPath.match(
      /^ellipse\(\s*([^\s]+)\s+([^\s]+)(?:\s+at\s+([^\s]+)\s+([^\s]+))?\s*\)$/i,
    );
    if (ellipseMatch) {
      const centerX = resolveAreaPosition(ellipseMatch[3], area.width);
      const centerY = resolveAreaPosition(ellipseMatch[4], area.height);
      const radiusX = resolveAreaLength(ellipseMatch[1], area.width);
      const radiusY = resolveAreaLength(ellipseMatch[2], area.height);

      if (
        radiusX === null ||
        radiusY === null ||
        radiusX === 0 ||
        radiusY === 0 ||
        centerX === null ||
        centerY === null
      ) {
        return true;
      }

      const normalizedX = (localX - centerX) / radiusX;
      const normalizedY = (localY - centerY) / radiusY;
      return normalizedX ** 2 + normalizedY ** 2 <= 1;
    }

    const polygonMatch = clipPath.match(/^polygon\(\s*(.+)\s*\)$/i);
    if (polygonMatch) {
      const pointTokens = polygonMatch[1]
        .replace(/^(?:nonzero|evenodd)\s*,\s*/i, "")
        .split(",");
      const points = pointTokens.map((pointToken) => {
        const [pointX, pointY] = pointToken.trim().split(/\s+/);
        return {
          x: resolveAreaLength(pointX, area.width),
          y: resolveAreaLength(pointY, area.height),
        };
      });

      if (
        points.length < 3 ||
        points.some((point) => point.x === null || point.y === null)
      ) {
        return true;
      }

      return isInsidePolygon(localX, localY, points);
    }

    return true;
  }

  function isInsideArea(x, y, area) {
    const isInsideBounds =
      x >= area.x &&
      x <= area.x + area.width &&
      y >= area.y &&
      y <= area.y + area.height;

    if (!isInsideBounds) return false;

    return isInsideClipPath(x - area.x, y - area.y, area);
  }

  function getLocationTriggerAreas(location) {
    if (Array.isArray(location.triggerArea)) {
      return location.triggerArea.filter(Boolean);
    }

    return location.triggerArea ? [location.triggerArea] : [];
  }

  function isInsideLocationTrigger(x, y, location) {
    return getLocationTriggerAreas(location).some((area) =>
      isInsideArea(x, y, area),
    );
  }

  function findReferrerLocation() {
    if (!document.referrer) return null;

    try {
      const pageName = new URL(document.referrer).pathname.split("/").pop();
      return LOCATIONS.find((location) =>
        location.returnPages?.includes(pageName),
      ) || null;
    } catch (error) {
      console.warn("RPG Mode: 無法解析來源頁面", error);
      return null;
    }
  }

  function consumeReturnLocation() {
    let locationId = null;

    try {
      locationId = sessionStorage.getItem(MAP_CONFIG.returnLocationKey);
      sessionStorage.removeItem(MAP_CONFIG.returnLocationKey);
    } catch (error) {
      console.warn("RPG Mode: 無法讀取返回位置", error);
    }

    return (
      LOCATIONS.find((location) => location.id === locationId) ||
      findReferrerLocation()
    );
  }

  class RPGMapController {
    constructor() {
      const returnLocation = consumeReturnLocation();
      const initialSpawn = returnLocation?.spawn || MAP_CONFIG.defaultSpawn;

      this.player = { x: initialSpawn.x, y: initialSpawn.y };
      this.initialLocationId = returnLocation?.id || null;
      this.speed = CHARACTER_CONFIG.speed;
      this.isMoving = false;
      this.isUiLocked = false;
      this.currentTrigger = null;
      this.currentEasterEgg = null;
      // 出生時所在的傳送點先封鎖，必須離開該範圍後才能重新觸發
      this.isAnimating = false;
      this.isTransitioning = false;
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.animationInterval = 150; // 動畫幀率（毫秒）
      this.lastDirection = initialSpawn.direction || "front";

      // 避免出生點及取消 Modal 後重複觸發
      this.blockedTriggerIds = new Set();
      this.blockedEasterEggIds = new Set();

      // 道路碰撞遮罩
      this.collisionCanvas = null;
      this.collisionContext = null;
      this.collisionReady = false;

      // 地點確認 Modal
      this.locationModal = null;
      this.exitModal = null;
      this.pendingLocation = null;
      this.confirmEnterButton = null;
      this.confirmExitButton = null;

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
      this.easterEggDialogueContainer = null;

      this.init();
    }

    init() {
      this.playerElement = document.getElementById("playerCharacter");
      this.spriteImg = document.getElementById("playerSprite");
      this.rpgControls = document.getElementById("rpgControls");
      this.easterEggDialogueContainer = document.getElementById(
        "EggDialogue",
      );

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
      window.addEventListener("ymsh:map-ui-lock", (event) => {
        this.isUiLocked = Boolean(event.detail?.locked);
        if (this.isUiLocked) this.clearMovementKeys();
      });

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

      window.addEventListener("pageshow", (event) => {
        if (event.persisted) this.restoreReturnPosition();
      });

      this.gameLoop();
    }

    restoreReturnPosition() {
      let locationId = null;

      try {
        locationId = sessionStorage.getItem(MAP_CONFIG.returnLocationKey);
        sessionStorage.removeItem(MAP_CONFIG.returnLocationKey);
      } catch (error) {
        console.warn("RPG Mode: 無法還原返回位置", error);
      }

      const location = LOCATIONS.find((item) => item.id === locationId);
      if (!location) return;

      this.player = { x: location.spawn.x, y: location.spawn.y };
      this.initialLocationId = location.id;
      this.lastDirection = location.spawn.direction || "front";
      this.currentTrigger = null;
      this.currentEasterEgg = null;
      this.pendingLocation = null;
      this.isAnimating = false;
      this.isTransitioning = false;
      this.blockedTriggerIds.clear();
      this.blockedEasterEggIds.clear();
      this.blockInitialTriggers();
      this.clearMovementKeys();
      this.updatePlayerElement();
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
      const exitModalElement = document.getElementById("exitConfirmModal");

      this.confirmEnterButton = document.getElementById("confirmEnterLocation");
      this.confirmExitButton = document.getElementById("confirmExitCampus");

      if (!modalElement || !exitModalElement) {
        console.error("RPG Mode: 找不到地點確認 Modal");
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
      this.exitModal = new bootstrap.Modal(exitModalElement, {
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

      this.confirmExitButton?.addEventListener("click", () => {
        if (!this.pendingLocation) return;

        const location = this.pendingLocation;
        this.isTransitioning = true;

        this.exitModal.hide();
        this.enterLocation(location);
      });

      modalElement.addEventListener("hidden.bs.modal", () => {
        // 按「進入地點」關閉 Modal 時，不執行取消
        if (this.isTransitioning) return;

        this.cancelLocationEntry();
      });

      exitModalElement.addEventListener("hidden.bs.modal", () => {
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

        try {
          sessionStorage.setItem(MAP_CONFIG.returnLocationKey, location.id);
        } catch (error) {
          console.warn("RPG Mode: 無法記錄返回位置", error);
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
        this.isUiLocked ||
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
        if (
          location.id === this.initialLocationId ||
          isInsideLocationTrigger(this.player.x, this.player.y, location)
        ) {
          this.blockedTriggerIds.add(location.id);
        }
      }

      for (const easterEgg of EASTER_EGGS) {
        if (isInsideArea(this.player.x, this.player.y, easterEgg.area)) {
          this.blockedEasterEggIds.add(easterEgg.id);
        }
      }
    }

    checkTriggers() {
      if (this.isAnimating || this.isTransitioning) return;

      for (const easterEgg of EASTER_EGGS) {
        const isInside = isInsideArea(
          this.player.x,
          this.player.y,
          easterEgg.area,
        );

        if (easterEgg.once && this.hasSeenEasterEgg(easterEgg)) {
          continue;
        }

        if (this.blockedEasterEggIds.has(easterEgg.id)) {
          if (!isInside) {
            this.blockedEasterEggIds.delete(easterEgg.id);
          }
          continue;
        }

        if (isInside && !this.currentTrigger && !this.currentEasterEgg) {
          this.currentEasterEgg = easterEgg;
          this.handleEasterEggTrigger(easterEgg);
          return;
        }
      }

      for (const location of LOCATIONS) {
        const isInside = isInsideLocationTrigger(
          this.player.x,
          this.player.y,
          location,
        );

        // 出生時就在此傳送點內，離開範圍前不觸發
        if (this.blockedTriggerIds.has(location.id)) {
          if (!isInside) {
            // 已離開出生傳送點，之後重新走進去時可以正常觸發
            this.blockedTriggerIds.delete(location.id);
          }

          continue;
        }

        if (isInside && !this.currentTrigger && !this.currentEasterEgg) {
          this.currentTrigger = location;
          this.handleLocationTrigger(location);
          break;
        }
      }
    }

    getEasterEggStorageKey(easterEgg) {
      return easterEgg.storageKey || `seen_map_easter_egg_${easterEgg.id}`;
    }

    hasSeenEasterEgg(easterEgg) {
      try {
        return (
          localStorage.getItem(this.getEasterEggStorageKey(easterEgg)) ===
          "true"
        );
      } catch (error) {
        console.warn("RPG Mode: unable to read easter egg state", error);
        return false;
      }
    }

    markEasterEggSeen(easterEgg) {
      if (!easterEgg.once) return;

      try {
        localStorage.setItem(this.getEasterEggStorageKey(easterEgg), "true");
      } catch (error) {
        console.warn("RPG Mode: unable to save easter egg state", error);
      }
    }

    async handleEasterEggTrigger(easterEgg) {
      this.isAnimating = true;
      this.isMoving = false;
      this.clearMovementKeys();

      try {
        await this.showEasterEggDialogue(easterEgg);
        this.markEasterEggSeen(easterEgg);
      } catch (error) {
        console.warn(`Could not load map easter egg ${easterEgg.id}:`, error);
      } finally {
        this.easterEggDialogueContainer?.replaceChildren();
        if (this.easterEggDialogueContainer) {
          this.easterEggDialogueContainer.hidden = true;
        }
        this.blockedEasterEggIds.add(easterEgg.id);
        this.currentEasterEgg = null;
        this.isAnimating = false;
        this.isTransitioning = false;
        this.clearMovementKeys();
        this.updatePlayerElement();
      }
    }

    showEasterEggDialogue(easterEgg) {
      if (
        !this.easterEggDialogueContainer ||
        typeof DialogueCore !== "function"
      ) {
        return Promise.reject(
          new Error("Map easter egg dialogue is unavailable"),
        );
      }

      this.easterEggDialogueContainer.hidden = false;

      const name = localStorage.getItem("playerName");
      const role = localStorage.getItem("playerRole") || "default";
      const className = localStorage.getItem("playerClass");

      return new Promise((resolve, reject) => {
        const dialogue = new DialogueCore({
          container: "#EggDialogue",
          data: easterEgg.dialoguePath || "data/map_easter_eggs.json",
          dialogueKey: easterEgg.dialogueKey || easterEgg.id,
          role,
          playerInfo: { name, className, role },
          onFinish: resolve,
        });

        dialogue.init().catch(reject);
      });
    }

    handleLocationTrigger(location) {
      this.isAnimating = true;
      this.isMoving = false;
      this.pendingLocation = location;

      this.clearMovementKeys();

      const nameElement = document.getElementById("locationConfirmName");
      const buildNameElement = document.getElementById(
        "locationConfirmBuildName",
      );

      if (nameElement) {
        nameElement.textContent = location.name;
      }

      if (buildNameElement) {
        buildNameElement.textContent = location.build_name || location.name;
      }

      const selectedModal =
        location.modalType === "exit" ? this.exitModal : this.locationModal;

      if (!selectedModal) {
        console.error(
          "地點 Modal 尚未初始化，請檢查 Bootstrap JS 和 Modal HTML",
        );

        this.cancelLocationEntry();
        return;
      }

      selectedModal.show();
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
