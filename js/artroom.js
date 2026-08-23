document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "ymsh:artwork";
  const canvas = document.getElementById("drawingCanvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const customColor = document.getElementById("customColor");
  const brushSize = document.getElementById("brushSize");
  const swatches = [...document.querySelectorAll(".color-swatch")];
  const toolButtons = [...document.querySelectorAll("[data-tool]")];
  const undoButton = document.getElementById("undo");
  const redoButton = document.getElementById("redo");
  const clearButton = document.getElementById("clearCanvas");
  const saveButton = document.getElementById("saveArtwork");
  const saveStatus = document.getElementById("saveStatus");
  const backButton = document.getElementById("backToArt");
  const footerBackButton = document.getElementById("backToArtFooter");
  const mapButton = document.getElementById("backToMap");
  const toolbar = document.querySelector(".drawing-toolbar");
  const penCursor = document.createElement("div");
  penCursor.className = "pen-cursor";
  penCursor.setAttribute("aria-hidden", "true");
  document.body.append(penCursor);
  let color = "#252834";
  let activeTool = "brush";
  let activeBrush = "round";
  let isDrawing = false;
  let drawingPointerId = null;
  let penPointerId = null;
  let lastPoint = null;
  let history = [];
  let redoHistory = [];

  function fillBackground() {
    context.save();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function saveHistory() {
    history.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 20) history.shift();
    redoHistory = [];
    updateHistoryControls();
  }

  function updateHistoryControls() {
    undoButton.disabled = history.length === 0;
    redoButton.disabled = redoHistory.length === 0;
  }

  function updateStatus(message) {
    saveStatus.textContent = message;
    saveStatus.classList.add("is-visible");
    clearTimeout(updateStatus.timer);
    updateStatus.timer = setTimeout(
      () => saveStatus.classList.remove("is-visible"),
      2200,
    );
  }

  function setColor(nextColor) {
    color = nextColor;
    customColor.value = nextColor;
    swatches.forEach((swatch) =>
      swatch.classList.toggle(
        "is-selected",
        swatch.dataset.color === nextColor,
      ),
    );
  }

  function setTool(tool, brush = activeBrush) {
    activeTool = tool;
    activeBrush = brush;
    toolButtons.forEach((button) => {
      const isBrushMatch = tool === "brush" && button.dataset.brush === brush;
      button.classList.toggle(
        "is-active",
        button.dataset.tool === tool && (tool !== "brush" || isBrushMatch),
      );
    });
    canvas.classList.toggle("is-bucket", tool === "bucket");
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function drawLine(from, to) {
    context.save();
    const isMarker = activeTool === "brush" && activeBrush === "marker";
    context.lineCap = isMarker ? "square" : "round";
    context.lineJoin = "round";
    context.globalAlpha = isMarker && activeTool !== "eraser" ? 0.35 : 1;
    context.lineWidth = Number(brushSize.value) * (isMarker ? 1.25 : 1);
    context.strokeStyle = activeTool === "eraser" ? "#ffffff" : color;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
  }

  function drawSpray(point) {
    const radius = Number(brushSize.value) * 1.6;
    const dotCount = Math.max(18, Math.round(radius * 2.4));
    context.save();
    context.fillStyle = color;
    context.globalAlpha = 0.38;

    for (let index = 0; index < dotCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;
      const size = Math.random() * 1.8 + 0.6;
      context.fillRect(
        point.x + Math.cos(angle) * distance,
        point.y + Math.sin(angle) * distance,
        size,
        size,
      );
    }

    context.restore();
  }

  function fillArea(point) {
    const startX = Math.floor(point.x);
    const startY = Math.floor(point.y);
    if (
      startX < 0 ||
      startY < 0 ||
      startX >= canvas.width ||
      startY >= canvas.height
    )
      return;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;
    const startOffset = (startY * width + startX) * 4;
    const target = [
      data[startOffset],
      data[startOffset + 1],
      data[startOffset + 2],
      data[startOffset + 3],
    ];
    const replacement = color
      .match(/[a-f\d]{2}/gi)
      .map((value) => Number.parseInt(value, 16));
    const tolerance = 18;

    if (
      target[0] === replacement[0] &&
      target[1] === replacement[1] &&
      target[2] === replacement[2] &&
      target[3] === 255
    )
      return;

    const visited = new Uint8Array(width * height);
    const pending = [startY * width + startX];

    // Fill connected pixels close to the clicked colour so anti-aliased edges remain natural.
    while (pending.length) {
      const pixel = pending.pop();
      if (visited[pixel]) continue;
      visited[pixel] = 1;

      const offset = pixel * 4;
      const matchesTarget =
        Math.abs(data[offset] - target[0]) <= tolerance &&
        Math.abs(data[offset + 1] - target[1]) <= tolerance &&
        Math.abs(data[offset + 2] - target[2]) <= tolerance &&
        Math.abs(data[offset + 3] - target[3]) <= tolerance;
      if (!matchesTarget) continue;

      data[offset] = replacement[0];
      data[offset + 1] = replacement[1];
      data[offset + 2] = replacement[2];
      data[offset + 3] = 255;

      const x = pixel % width;
      if (x > 0) pending.push(pixel - 1);
      if (x < width - 1) pending.push(pixel + 1);
      if (pixel >= width) pending.push(pixel - width);
      if (pixel < width * (height - 1)) pending.push(pixel + width);
    }

    context.putImageData(imageData, 0, 0);
  }

  function beginDrawing(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const point = getCanvasPoint(event);
    if (activeTool === "bucket") {
      saveHistory();
      fillArea(point);
      return;
    }

    saveHistory();
    isDrawing = true;
    drawingPointerId = event.pointerId;
    lastPoint = point;
    if (activeBrush === "spray" && activeTool === "brush") {
      drawSpray(point);
    } else {
      drawLine(lastPoint, { x: lastPoint.x + 0.01, y: lastPoint.y + 0.01 });
    }
  }

  function continueDrawing(event) {
    if (!isDrawing || event.pointerId !== drawingPointerId) return;
    const point = getCanvasPoint(event);
    if (activeBrush === "spray" && activeTool === "brush") {
      drawSpray(point);
    } else {
      drawLine(lastPoint, point);
    }
    lastPoint = point;
  }

  function endDrawing(event) {
    if (!isDrawing || event.pointerId !== drawingPointerId) return;
    isDrawing = false;
    drawingPointerId = null;
    lastPoint = null;
  }

  function showPenCursor(event) {
    if (event.pointerType !== "pen") return;

    if (event.type === "pointerdown") {
      penPointerId = event.pointerId;
    }
    if (event.pointerId !== penPointerId) return;

    penCursor.style.left = `${event.clientX}px`;
    penCursor.style.top = `${event.clientY}px`;
    penCursor.classList.add("is-visible");
  }

  function hidePenCursor(event) {
    if (event.pointerType !== "pen" || event.pointerId !== penPointerId) return;

    penPointerId = null;
    penCursor.classList.remove("is-visible");
  }

  function restoreArtwork() {
    const savedArtwork = localStorage.getItem(STORAGE_KEY);
    if (!savedArtwork) {
      fillBackground();
      return;
    }

    const image = new Image();
    image.onload = () =>
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.onerror = fillBackground;
    image.src = savedArtwork;
  }

  function saveArtwork() {
    try {
      localStorage.setItem(STORAGE_KEY, canvas.toDataURL("image/jpeg", 0.86));
      updateStatus("作品已儲存，屆時請去校長室領取紀念卡！");
    } catch (error) {
      console.error("Artwork save failed:", error);
      updateStatus("作品儲存失敗，請嘗試重新儲存。");
    }
  }

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => setColor(swatch.dataset.color));
  });
  customColor.addEventListener("input", () => setColor(customColor.value));
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTool(button.dataset.tool, button.dataset.brush || activeBrush);
    });
  });
  undoButton.addEventListener("click", () => {
    const previous = history.pop();
    if (!previous) return;
    redoHistory.push(context.getImageData(0, 0, canvas.width, canvas.height));
    context.putImageData(previous, 0, 0);
    updateHistoryControls();
  });
  redoButton.addEventListener("click", () => {
    const next = redoHistory.pop();
    if (!next) return;
    history.push(context.getImageData(0, 0, canvas.width, canvas.height));
    context.putImageData(next, 0, 0);
    updateHistoryControls();
  });
  clearButton.addEventListener("click", () => {
    saveHistory();
    fillBackground();
  });
  saveButton.addEventListener("click", saveArtwork);
  const returnToArt = () => {
    saveArtwork()
    window.location.href = "../art.html";
  };
  backButton.addEventListener("click", returnToArt);
  mapButton.addEventListener("click", () => {
    saveArtwork()
    window.location.href = "../map.html";
  });
  footerBackButton.addEventListener("click", returnToArt);
  canvas.addEventListener("pointerdown", beginDrawing);
  canvas.addEventListener("pointermove", continueDrawing);
  canvas.addEventListener("pointerup", endDrawing);
  canvas.addEventListener("pointercancel", endDrawing);
  canvas.addEventListener("pointerleave", endDrawing);
  toolbar.addEventListener("pointerdown", endDrawing);
  window.addEventListener("pointerup", endDrawing);
  window.addEventListener("pointercancel", endDrawing);
  document.addEventListener("pointerdown", showPenCursor, true);
  document.addEventListener("pointermove", showPenCursor, true);
  document.addEventListener("pointerup", hidePenCursor, true);
  document.addEventListener("pointercancel", hidePenCursor, true);
  window.addEventListener("blur", () => penCursor.classList.remove("is-visible"));

  setTool("brush", "round");
  updateHistoryControls();
  restoreArtwork();
});
