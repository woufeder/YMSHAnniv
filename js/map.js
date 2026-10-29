// map.js - 地圖互動與進度管理
document.addEventListener("DOMContentLoaded", function () {
  const progressChecklist = document.getElementById("progress-checklist");
  const campusMap = document.getElementById("campusMap");
  const markers = document.querySelector(".location-hotspots");
  const debugOverlays = document.querySelector(".map-debug-overlays");
  const achievementToggle = document.getElementById("achievementToggle");
  const achievementDrawer = document.getElementById("achievementDrawer");
  const achievementClose = document.getElementById("achievementClose");
  const achievementBackdrop = document.getElementById("achievementBackdrop");
  const mapConfig = window.YMSHMapConfig;

  if (!mapConfig) {
    console.error("Map: 找不到 YMSHMapConfig");
    return;
  }

  function normalizeClipPath(value, fallback = "none") {
    const clipPath = String(value || "")
      .trim()
      .replace(/;+\s*$/, "");
    return clipPath || fallback;
  }

  const {
    width: mapWidth,
    height: mapHeight,
    locations,
    easterEggs = [],
  } = mapConfig;

  // 初始化進度
  let completedGames = JSON.parse(localStorage.getItem("completedGames")) || [];
  updateProgress();
  setupAchievementDrawer();

  // 建立覆蓋在建築本體上的滑鼠熱區
  createLocationHotspots();
  createMapDebugOverlays();
  positionLocationHotspots();
  window.addEventListener("resize", positionLocationHotspots);
  window.addEventListener("ymsh:map-revealed", positionLocationHotspots);
  campusMap?.addEventListener("load", positionLocationHotspots);

  function rememberReturnLocation(locationId) {
    try {
      sessionStorage.setItem(mapConfig.returnLocationKey, locationId);
    } catch (error) {
      console.warn("Map: 無法記錄返回位置", error);
    }
  }

  function setupAchievementDrawer() {
    if (!achievementToggle || !achievementDrawer || !achievementBackdrop) {
      return;
    }

    const setOpen = (isOpen, returnFocus = true) => {
      achievementDrawer.classList.toggle("is-open", isOpen);
      achievementBackdrop.classList.toggle("is-open", isOpen);
      achievementDrawer.setAttribute("aria-hidden", String(!isOpen));
      achievementDrawer.inert = !isOpen;
      achievementToggle.setAttribute("aria-expanded", String(isOpen));
      window.dispatchEvent(
        new CustomEvent("ymsh:map-ui-lock", {
          detail: { locked: isOpen },
        }),
      );

      if (isOpen) {
        achievementClose?.focus();
      } else if (returnFocus) {
        achievementToggle.focus();
      }
    };

    achievementToggle.addEventListener("click", () => {
      setOpen(!achievementDrawer.classList.contains("is-open"), false);
    });
    achievementClose?.addEventListener("click", () => setOpen(false));
    achievementBackdrop.addEventListener("click", () => setOpen(false));

    window.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        achievementDrawer.classList.contains("is-open")
      ) {
        setOpen(false);
      }
    });
  }

  function createLocationHotspots() {
    if (!markers) return;

    locations.forEach((location) => {
      const hotspot = document.createElement("button");
      hotspot.className = "location-hotspot";
      hotspot.type = "button";
      hotspot.dataset.locationId = location.id;
      hotspot.setAttribute("aria-label", `前往${location.name}`);

      const label = document.createElement("span");
      label.className = "location-label";
      label.textContent = location.name;
      setLocationLabelPosition(label, location.namePosition);
      hotspot.append(label);

      // 檢查是否已完成
      if (completedGames.includes(location.id)) {
        hotspot.classList.add("completed");
      }

      hotspot.addEventListener("click", () => {
        rememberReturnLocation(location.id);
        window.location.href = location.url;
      });

      markers.appendChild(hotspot);
    });
  }

  function setLocationLabelPosition(label, position = {}) {
    const resolvedPosition = {
      left: "50%",
      right: "auto",
      top: "auto",
      bottom: "7%",
      transform: "translateX(-50%)",
      ...position,
    };

    Object.entries(resolvedPosition).forEach(([property, value]) => {
      label.style[property] = value;
    });
  }

  function getLocationTriggerAreas(location) {
    if (Array.isArray(location.triggerArea)) {
      return location.triggerArea.filter(Boolean);
    }

    return location.triggerArea ? [location.triggerArea] : [];
  }

  function createMapDebugOverlays() {
    if (!debugOverlays) return;

    locations.forEach((location) => {
      const triggerAreas = getLocationTriggerAreas(location);

      triggerAreas.forEach((area, index) => {
        const trigger = document.createElement("div");
        trigger.className = "map-debug-trigger";
        trigger.dataset.locationId = location.id;
        trigger.dataset.triggerIndex = String(index);
        const suffix = triggerAreas.length > 1 ? ` ${index + 1}` : "";
        trigger.innerHTML = `<span>${location.name} 觸發區${suffix}</span>`;
        debugOverlays.append(trigger);
      });

      const spawn = document.createElement("div");
      spawn.className = "map-debug-spawn";
      spawn.dataset.locationId = location.id;
      spawn.innerHTML = `<span>${location.name} spawn</span>`;

      debugOverlays.append(spawn);
    });

    easterEggs
      .filter((easterEgg) => easterEgg.enabled !== false)
      .forEach((easterEgg) => {
        const marker = document.createElement("div");
        marker.className = "map-debug-easter-egg";
        marker.dataset.easterEggId = easterEgg.id;
        // marker.innerHTML = `<span>${easterEgg.name || easterEgg.id} 彩蛋區</span>`;
        debugOverlays.append(marker);
      });
  }

  function positionLocationHotspots() {
    if (!markers) return;

    markers.querySelectorAll(".location-hotspot").forEach((hotspot) => {
      const location = locations.find(
        (item) => item.id === hotspot.dataset.locationId,
      );

      if (!location) return;

      const area = location.clickArea;

      hotspot.style.left = `${area.x}px`;
      hotspot.style.top = `${area.y}px`;
      hotspot.style.width = `${area.width}px`;
      hotspot.style.height = `${area.height}px`;
      hotspot.style.clipPath = normalizeClipPath(area.clipPath);
    });

    debugOverlays?.querySelectorAll(".map-debug-trigger").forEach((trigger) => {
      const location = locations.find(
        (item) => item.id === trigger.dataset.locationId,
      );

      if (!location) return;

      const triggerIndex = Number.parseInt(trigger.dataset.triggerIndex, 10);

      const area = getLocationTriggerAreas(location)[triggerIndex];

      if (!area) return;

      trigger.style.left = `${area.x}px`;
      trigger.style.top = `${area.y}px`;
      trigger.style.width = `${area.width}px`;
      trigger.style.height = `${area.height}px`;

      trigger.style.setProperty(
        "--debug-trigger-shape",
        normalizeClipPath(area.clipPath, "inset(0)"),
      );
    });

    debugOverlays?.querySelectorAll(".map-debug-spawn").forEach((spawn) => {
      const location = locations.find(
        (item) => item.id === spawn.dataset.locationId,
      );

      if (!location) return;

      spawn.style.left = `${location.spawn.x}px`;
      spawn.style.top = `${location.spawn.y}px`;
    });

    debugOverlays
      ?.querySelectorAll(".map-debug-easter-egg")
      .forEach((marker) => {
        const easterEgg = easterEggs.find(
          (item) => item.id === marker.dataset.easterEggId,
        );

        if (!easterEgg) return;

        const area = easterEgg.area;

        marker.style.left = `${area.x}px`;
        marker.style.top = `${area.y}px`;
        marker.style.width = `${area.width}px`;
        marker.style.height = `${area.height}px`;
      });
  }

  function updateProgress() {
    if (!progressChecklist) return;

    const achievements = window.YMSHAchievements?.all || [];
    const achievementItems = achievements.map((achievement) => {
      const earned = window.YMSHAchievements.has(achievement.id);
      const item = document.createElement("div");
      item.className = `progress-achievement${earned ? " is-earned" : ""}`;

      const icon = document.createElement("i");
      icon.className = earned ? "fa-solid fa-star" : "fa-solid fa-question";
      icon.setAttribute("aria-hidden", "true");

      const name = document.createElement("span");
      name.textContent = earned
        ? `達成成就：${achievement.title}`
        : "？？？？？";
      item.append(icon, name);
      return item;
    });

    progressChecklist.replaceChildren(...achievementItems);
  }
});
