document.addEventListener("DOMContentLoaded", () => {
  const gameTitle = document.getElementById("gameTitle");
  const exitCount = document.getElementById("exitCount");
  const fenceCount = document.getElementById("fenceCount");
  const endingDialogue = document.getElementById("game");
  const playgroundRescue = document.querySelector(".playground-rescue");
  const gameBoard = document.getElementById("gameBoard");
  const gameFeedback = document.getElementById("gameFeedback");
  const gameIntroModal = document.getElementById("gameIntroModal");
  const gameIntroTitle = document.getElementById("gameIntroTitle");
  const gameIntroText = document.getElementById("gameIntroText");
  const startGameButton = document.getElementById("startGame");
  const introStorageKey = "seen_intro_playground";
  const lastMapStorageKey = "ymsh:lastPlaygroundMap";
  const ambience = new Audio(resolveAppAsset("assets/audio/playground.wav"));

  let gameData;
  let currentMap;
  let dogPosition;
  let placedPieces = new Map();
  let pieceRotations = new Map();
  let selectedPieceId = null;
  let gameActive = false;
  let animationToken = 0;

  ambience.loop = true;

  function updateAmbienceVolume() {
    const bgmVolume = SettingsManager.get("bgmVolume", 0.1);
    ambience.volume = Math.min(bgmVolume, 1);
  }

  function startAmbience() {
    updateAmbienceVolume();
    ambience
      .play()
      .then(() => {
        document.removeEventListener("pointerdown", startAmbience);
        document.removeEventListener("keydown", startAmbience);
      })
      .catch(() => {});
  }

  function cellKey(cell) {
    return `${cell[0]},${cell[1]}`;
  }

  function cellsEqual(first, second) {
    return first[0] === second[0] && first[1] === second[1];
  }

  function isBoundaryCell(cell, size = currentMap.size) {
    return (
      cell[0] === 0 ||
      cell[1] === 0 ||
      cell[0] === size - 1 ||
      cell[1] === size - 1
    );
  }

  function isNoDeployCell(cell) {
    return (currentMap.noDeployCells || []).some((reservedCell) =>
      cellsEqual(reservedCell, cell),
    );
  }

  function getNeighbors(cell, size) {
    const [row, column] = cell;
    return [
      [row - 1, column],
      [row + 1, column],
      [row, column - 1],
      [row, column + 1],
    ].filter(
      ([nextRow, nextColumn]) =>
        nextRow >= 0 &&
        nextColumn >= 0 &&
        nextRow < size &&
        nextColumn < size,
    );
  }

  function getBoundarySide(cell, size) {
    if (cell[0] === 0) return "top";
    if (cell[1] === size - 1) return "right";
    if (cell[0] === size - 1) return "bottom";
    return "left";
  }

  function getBoundaryExits() {
    const sideNames = {
      top: "北側",
      right: "東側",
      bottom: "南側",
      left: "西側",
    };
    const exits = [];
    let dangerIndex = 0;

    for (let row = 0; row < currentMap.size; row += 1) {
      for (let column = 0; column < currentMap.size; column += 1) {
        const cell = [row, column];
        if (!isBoundaryCell(cell)) continue;
        if (cellsEqual(cell, currentMap.targetExit.cell)) {
          exits.push({ ...currentMap.targetExit, type: "target" });
          continue;
        }
        const side = getBoundarySide(cell, currentMap.size);
        dangerIndex += 1;
        exits.push({
          cell,
          side,
          type: "danger",
          label: `${sideNames[side]}缺口 ${dangerIndex}`,
        });
      }
    }
    return exits;
  }

  function findPath(start, destination, blockedCells, size, exitKeys) {
    const startKey = cellKey(start);
    const destinationKey = cellKey(destination);
    if (blockedCells.has(startKey) || blockedCells.has(destinationKey)) return null;

    const queue = [start];
    const previous = new Map([[startKey, null]]);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const currentKey = cellKey(current);
      if (currentKey === destinationKey) break;

      getNeighbors(current, size).forEach((neighbor) => {
        const neighborKey = cellKey(neighbor);
        if (
          blockedCells.has(neighborKey) ||
          previous.has(neighborKey) ||
          (exitKeys.has(neighborKey) && neighborKey !== destinationKey)
        ) {
          return;
        }
        previous.set(neighborKey, currentKey);
        queue.push(neighbor);
      });
    }

    if (!previous.has(destinationKey)) return null;

    const path = [];
    let cursor = destinationKey;
    while (cursor) {
      path.unshift(cursor.split(",").map(Number));
      cursor = previous.get(cursor);
    }
    return path;
  }

  function normalizeShape(shape) {
    const minRow = Math.min(...shape.map((cell) => cell[0]));
    const minColumn = Math.min(...shape.map((cell) => cell[1]));
    return shape
      .map(([row, column]) => [row - minRow, column - minColumn])
      .sort((first, second) => first[0] - second[0] || first[1] - second[1]);
  }

  function rotateShape(shape, turns) {
    let rotated = shape.map((cell) => [...cell]);
    for (let turn = 0; turn < turns; turn += 1) {
      rotated = rotated.map(([row, column]) => [column, -row]);
      rotated = normalizeShape(rotated);
    }
    return normalizeShape(rotated);
  }

  function getPiece(pieceId) {
    return currentMap.pieces.find((piece) => piece.id === pieceId);
  }

  function getShapePivotOffset(shape) {
    const rowCount = Math.max(...shape.map((cell) => cell[0])) + 1;
    const columnCount = Math.max(...shape.map((cell) => cell[1])) + 1;
    const occupied = new Set(shape.map(cellKey));
    const geometricCenter = [(rowCount - 1) / 2, (columnCount - 1) / 2];
    const cardinalOffsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    const connectedCells = shape
      .map((cell) => ({
        cell,
        neighborCount: cardinalOffsets.filter(([rowOffset, columnOffset]) =>
          occupied.has(
            cellKey([cell[0] + rowOffset, cell[1] + columnOffset]),
          ),
        ).length,
      }))
      .sort((first, second) => {
        if (first.neighborCount !== second.neighborCount) {
          return second.neighborCount - first.neighborCount;
        }
        const firstDistance =
          Math.abs(first.cell[0] - geometricCenter[0]) +
          Math.abs(first.cell[1] - geometricCenter[1]);
        const secondDistance =
          Math.abs(second.cell[0] - geometricCenter[0]) +
          Math.abs(second.cell[1] - geometricCenter[1]);
        return firstDistance - secondDistance;
      });

    if (connectedCells[0]?.neighborCount >= 2) return connectedCells[0].cell;

    return [Math.round(geometricCenter[0]), Math.round(geometricCenter[1])];
  }

  function getPieceCells(pieceId, center, rotation = pieceRotations.get(pieceId) || 0) {
    const piece = getPiece(pieceId);
    const shape = rotateShape(piece.shape, rotation);
    const pivotOffset = getShapePivotOffset(shape);

    return shape.map(([row, column]) => [
      center[0] + row - pivotOffset[0],
      center[1] + column - pivotOffset[1],
    ]);
  }

  function getPlacedCellOwners() {
    const owners = new Map();
    placedPieces.forEach((placement, pieceId) => {
      getPieceCells(pieceId, placement.center, placement.rotation).forEach((cell) => {
        owners.set(cellKey(cell), pieceId);
      });
    });
    return owners;
  }

  function getBlockedCells() {
    return new Set([
      ...currentMap.fixedBlocks.map(cellKey),
      ...getPlacedCellOwners().keys(),
    ]);
  }

  function analyzeBoard() {
    const blockedCells = getBlockedCells();
    const exits = getBoundaryExits();
    const exitKeys = new Set(exits.map((exit) => cellKey(exit.cell)));
    const routes = exits.map((exit) => ({
      ...exit,
      path: findPath(
        dogPosition,
        exit.cell,
        blockedCells,
        currentMap.size,
        exitKeys,
      ),
    }));
    const targetRoute = routes.find((route) => route.type === "target");
    const dangerRoutes = routes.filter((route) => route.type === "danger");
    const reachableDangerRoutes = dangerRoutes.filter((route) => route.path);
    const reachableRoutes = routes.filter((route) => route.path);
    const previewRoute =
      [...reachableDangerRoutes].sort(
        (first, second) => first.path.length - second.path.length,
      )[0] || (targetRoute.path ? targetRoute : null);

    return {
      exits,
      targetRoute,
      dangerRoutes,
      reachableDangerRoutes,
      reachableRoutes,
      previewRoute,
    };
  }

  function setFeedback(message = "", type = "") {
    gameFeedback.textContent = message;
    gameFeedback.className = `game-feedback ${type ? `is-${type}` : ""}`.trim();
  }

  function updateBoardStatus(analysis, announce = true) {
    exitCount.textContent = `${analysis.reachableDangerRoutes.length}`;
    fenceCount.textContent = `${currentMap.pieces.length - placedPieces.size}`;

    if (!announce) return;
    if (!analysis.targetRoute.path && analysis.reachableDangerRoutes.length === 0) {
      setFeedback(gameData.feedback.blocked, "error");
      return;
    }
    if (analysis.reachableDangerRoutes.length === 0 && analysis.targetRoute.path) {
      setFeedback(gameData.feedback.ready, "success");
      return;
    }
    setFeedback(
      gameData.feedback.open.replace(
        "{count}",
        analysis.reachableDangerRoutes.length,
      ),
      "warning",
    );
  }

  function createIcon(className) {
    const icon = document.createElement("i");
    icon.className = `fa-solid ${className}`;
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function createCourtCell(row, column, analysis, owners) {
    const position = [row, column];
    const key = cellKey(position);
    const fixed = currentMap.fixedBlocks.some((cell) => cellsEqual(cell, position));
    const noDeploy = isNoDeployCell(position);
    const ownerId = owners.get(key);
    const isDog = cellsEqual(position, dogPosition);
    const exit = analysis.exits.find((item) => cellsEqual(item.cell, position));
    const onPreviewRoute = analysis.previewRoute?.path?.some((cell) =>
      cellsEqual(cell, position),
    );
    const interactive = !isBoundaryCell(position);
    const cell = document.createElement(interactive ? "button" : "div");

    cell.className = "court-cell";
    cell.dataset.cell = key;
    cell.setAttribute("role", "gridcell");
    if (interactive) {
      cell.type = "button";
      cell.classList.add("is-placement-zone");
      cell.disabled = !gameActive;
      if (ownerId) {
        cell.classList.add("is-occupied");
        cell.setAttribute("aria-label", `收回${getPiece(ownerId).name}`);
      } else {
        cell.setAttribute(
          "aria-label",
          `以第 ${row + 1} 列第 ${column + 1} 格為中心放置隊形`,
        );
      }
      cell.addEventListener("click", () => {
        if (ownerId) removePiece(ownerId);
        else placeSelectedPiece(position);
      });
    }
    if (fixed) {
      cell.classList.add("is-fixed");
      cell.title = "固定路障";
    }
    if (noDeploy) {
      cell.classList.add("is-no-deploy");
      cell.title = "小狗警戒範圍，不能部署人牆";
    }
    if (onPreviewRoute) cell.classList.add("is-route");
    if (isDog) cell.classList.add("has-dog");

    if (exit) {
      cell.classList.add(`is-${exit.type}-exit`, `exit-${exit.side}`);
      cell.title = exit.label;
      const exitMarker = document.createElement("span");
      exitMarker.className = "exit-marker";
      exitMarker.append(
        createIcon(exit.type === "target" ? "fa-people-arrows" : "fa-person-running"),
      );
      if (exit.type === "target") {
        const exitLabel = document.createElement("span");
        exitLabel.textContent = "集合";
        exitMarker.append(exitLabel);
      }
      cell.append(exitMarker);
    }

    if (fixed) {
      const blocker = document.createElement("span");
      blocker.className = "fixed-blocker";
      blocker.append(createIcon("fa-road-barrier"));
      cell.append(blocker);
    }

    if (noDeploy && !isDog) {
      const marker = document.createElement("span");
      marker.className = "no-deploy-marker";
      marker.append(createIcon("fa-eye"));
      cell.append(marker);
    }

    if (ownerId) {
      const fence = document.createElement("span");
      fence.className = "player-fence";
      fence.append(createIcon("fa-person"));
      cell.append(fence);
    }

    if (onPreviewRoute && !isDog) {
      const paw = document.createElement("span");
      paw.className = "route-paw";
      paw.append(createIcon("fa-paw"));
      cell.append(paw);
    }

    if (isDog) {
      const dog = document.createElement("span");
      dog.className = "dog-token";
      dog.append(createIcon("fa-dog"));
      cell.append(dog);
    }

    return cell;
  }

  function canPlacePiece(pieceId, center) {
    const owners = getPlacedCellOwners();
    return getPieceCells(pieceId, center).every((cell) => {
      const key = cellKey(cell);
      return (
        cell[0] > 0 &&
        cell[1] > 0 &&
        cell[0] < currentMap.size - 1 &&
        cell[1] < currentMap.size - 1 &&
        !cellsEqual(cell, dogPosition) &&
        !currentMap.fixedBlocks.some((fixed) => cellsEqual(fixed, cell)) &&
        !isNoDeployCell(cell) &&
        !owners.has(key)
      );
    });
  }

  function clearPlacementPreview(board) {
    board
      .querySelectorAll(".is-piece-preview, .is-piece-preview-invalid")
      .forEach((cell) =>
        cell.classList.remove("is-piece-preview", "is-piece-preview-invalid"),
      );
  }

  function showPlacementPreview(board, center) {
    clearPlacementPreview(board);
    if (!selectedPieceId || placedPieces.has(selectedPieceId)) return;
    const valid = canPlacePiece(selectedPieceId, center);
    getPieceCells(selectedPieceId, center).forEach((cell) => {
      const previewCell = board.querySelector(`[data-cell="${cellKey(cell)}"]`);
      previewCell?.classList.add(
        valid ? "is-piece-preview" : "is-piece-preview-invalid",
      );
    });
  }

  function createPieceMiniature(piece) {
    const shape = rotateShape(piece.shape, pieceRotations.get(piece.id) || 0);
    const rows = Math.max(...shape.map((cell) => cell[0])) + 1;
    const columns = Math.max(...shape.map((cell) => cell[1])) + 1;
    const miniature = document.createElement("span");
    miniature.className = "piece-miniature";
    miniature.style.setProperty("--piece-rows", rows);
    miniature.style.setProperty("--piece-columns", columns);
    shape.forEach(([row, column]) => {
      const member = document.createElement("span");
      member.style.gridRow = `${row + 1}`;
      member.style.gridColumn = `${column + 1}`;
      member.append(createIcon("fa-person"));
      miniature.append(member);
    });
    return miniature;
  }

  function bindPieceDrag(button, piece, placed) {
    if (placed) return;

    button.addEventListener("pointerdown", (event) => {
      const usesCompactLayout = window.matchMedia(
        "(max-width: 760px), (max-aspect-ratio: 4 / 5)",
      ).matches;
      if (!usesCompactLayout || !gameActive || event.button > 0) return;

      const board = gameBoard.querySelector(".court-board");
      if (!board) return;

      selectedPieceId = piece.id;
      gameBoard.querySelectorAll(".piece-card").forEach((card) => {
        card.classList.toggle("is-selected", card === button);
        card.setAttribute("aria-pressed", card === button ? "true" : "false");
      });

      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      let ghost = null;
      let targetCell = null;

      const updateTarget = (clientX, clientY) => {
        const hit = document.elementFromPoint(clientX, clientY);
        targetCell = hit?.closest(".court-cell.is-placement-zone") || null;
        clearPlacementPreview(board);
        if (targetCell?.dataset.cell) {
          showPlacementPreview(
            board,
            targetCell.dataset.cell.split(",").map(Number),
          );
        }
      };

      const moveGhost = (clientX, clientY) => {
        if (!ghost) {
          ghost = document.createElement("div");
          ghost.className = "piece-drag-ghost";
          ghost.append(createPieceMiniature(piece));
          document.body.append(ghost);
        }
        ghost.style.left = `${clientX}px`;
        ghost.style.top = `${clientY}px`;
      };

      const onPointerMove = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const distance = Math.hypot(
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
        );
        if (!moved && distance < 8) return;

        moved = true;
        moveEvent.preventDefault();
        moveGhost(moveEvent.clientX, moveEvent.clientY);
        updateTarget(moveEvent.clientX, moveEvent.clientY);
      };

      const finishDrag = (endEvent, cancelled = false) => {
        if (endEvent.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
        ghost?.remove();
        clearPlacementPreview(board);

        if (!moved) return;
        button.dataset.suppressClick = "true";
        endEvent.preventDefault();

        if (!cancelled && targetCell?.dataset.cell) {
          placeSelectedPiece(targetCell.dataset.cell.split(",").map(Number));
        } else if (!cancelled) {
          setFeedback(gameData.feedback.invalid, "error");
        }
      };

      const onPointerUp = (endEvent) => finishDrag(endEvent);
      const onPointerCancel = (endEvent) => finishDrag(endEvent, true);
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerCancel);
    });
  }

  function createPieceTray() {
    const section = document.createElement("section");
    section.className = "piece-section";
    const heading = document.createElement("div");
    heading.className = "piece-section__heading";
    const title = document.createElement("h5");
    title.textContent = "人牆隊形";
    const note = document.createElement("span");
    note.textContent = "選取後放入場內";
    heading.append(title, note);

    const tray = document.createElement("div");
    tray.className = "piece-tray";
    currentMap.pieces.forEach((piece) => {
      const placed = placedPieces.has(piece.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "piece-card";
      if (piece.id === selectedPieceId && !placed) button.classList.add("is-selected");
      if (placed) button.classList.add("is-placed");
      button.disabled = !gameActive;
      button.setAttribute("aria-pressed", piece.id === selectedPieceId ? "true" : "false");
      button.setAttribute(
        "aria-label",
        placed ? `收回${piece.name}` : `選擇${piece.name}`,
      );
      button.append(createPieceMiniature(piece));
      const label = document.createElement("span");
      label.className = "piece-card__label";
      label.textContent = piece.name;
      const state = document.createElement("span");
      state.className = "piece-card__state";
      state.textContent = placed ? "已上場" : "可使用";
      button.append(label, state);
      button.addEventListener("click", () => {
        if (button.dataset.suppressClick === "true") {
          delete button.dataset.suppressClick;
          return;
        }
        if (placed) removePiece(piece.id);
        else {
          selectedPieceId = piece.id;
          renderGameBoard(false);
          setFeedback(`已選擇「${piece.name}」，可旋轉後放入場內。`);
        }
      });
      bindPieceDrag(button, piece, placed);
      tray.append(button);
    });
    section.append(heading, tray);
    return section;
  }

  function createRouteSummary(analysis) {
    const summary = document.createElement("div");
    summary.className = "route-summary";
    const target = document.createElement("div");
    target.className = `route-summary__target ${
      analysis.targetRoute.path ? "is-open" : "is-closed"
    }`;
    target.append(
      createIcon(analysis.targetRoute.path ? "fa-circle-check" : "fa-lock"),
    );
    const targetText = document.createElement("span");
    targetText.textContent = currentMap.targetExit.label;
    const targetState = document.createElement("strong");
    targetState.textContent = analysis.targetRoute.path ? "可達" : "被封鎖";
    target.append(targetText, targetState);
    summary.append(target);

    const sideNames = {
      top: "北側",
      right: "東側",
      bottom: "南側",
      left: "西側",
    };
    const sideList = document.createElement("div");
    sideList.className = "side-counts";
    Object.entries(sideNames).forEach(([side, label]) => {
      const total = analysis.dangerRoutes.filter((route) => route.side === side).length;
      const open = analysis.reachableDangerRoutes.filter(
        (route) => route.side === side,
      ).length;
      const item = document.createElement("span");
      if (open === 0) item.classList.add("is-closed");
      const sideLabel = document.createElement("strong");
      sideLabel.textContent = label;
      const sideValue = document.createElement("span");
      sideValue.textContent = `${open} / ${total}`;
      item.append(sideLabel, sideValue);
      sideList.append(item);
    });
    summary.append(sideList);
    return summary;
  }

  function createBoardLegend() {
    const legend = document.createElement("div");
    legend.className = "board-legend";
    [
      ["fa-road-barrier", "固定路障"],
      ["fa-eye", "小狗警戒範圍不可部署"],
    ].forEach(([iconName, label]) => {
      const item = document.createElement("span");
      item.append(createIcon(iconName), document.createTextNode(label));
      legend.append(item);
    });
    return legend;
  }

  function makeActionButton(label, icon, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `rescue-button ${className}`.trim();
    button.append(createIcon(icon), document.createTextNode(label));
    button.disabled = !gameActive;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderGameBoard(announce = true) {
    const analysis = analyzeBoard();
    const owners = getPlacedCellOwners();
    const layout = document.createElement("div");
    layout.className = "pursuit-layout";

    const boardFrame = document.createElement("div");
    boardFrame.className = "court-frame";
    const board = document.createElement("div");
    board.className = "court-board";
    board.style.setProperty("--court-size", currentMap.size);
    board.setAttribute("role", "grid");
    board.setAttribute("aria-label", `${currentMap.name}圍捕路線圖`);
    for (let row = 0; row < currentMap.size; row += 1) {
      for (let column = 0; column < currentMap.size; column += 1) {
        board.append(createCourtCell(row, column, analysis, owners));
      }
    }
    board.addEventListener("pointerover", (event) => {
      const cell = event.target.closest(".court-cell");
      if (!cell?.dataset.cell) return;
      showPlacementPreview(board, cell.dataset.cell.split(",").map(Number));
    });
    board.addEventListener("pointerleave", () => clearPlacementPreview(board));
    board.addEventListener("focusin", (event) => {
      const cell = event.target.closest(".court-cell");
      if (!cell?.dataset.cell) return;
      showPlacementPreview(board, cell.dataset.cell.split(",").map(Number));
    });
    boardFrame.append(board);

    const routePanel = document.createElement("aside");
    routePanel.className = "route-panel";
    const mapLabel = document.createElement("p");
    mapLabel.className = "route-panel__label";
    const mapName = document.createElement("h4");
    mapName.textContent = currentMap.name;
    const briefing = document.createElement("p");
    briefing.className = "route-panel__briefing";
    briefing.textContent = currentMap.briefing;
    const routeHint = document.createElement("p");
    routeHint.className = "route-panel__hint";
    routeHint.append(createIcon("fa-paw"));
    routeHint.append(
      document.createTextNode(
        analysis.previewRoute
          ? `目前預測：${analysis.previewRoute.label}`
          : "目前沒有可通行的出口",
      ),
    );
    const desktopPieceTray = createPieceTray();
    const mobilePieceTray = createPieceTray();
    mobilePieceTray.classList.add("mobile-piece-dock");
    routePanel.append(
      mapLabel,
      mapName,
      briefing,
      createBoardLegend(),
      createRouteSummary(analysis),
      desktopPieceTray,
      routeHint,
    );

    const actions = document.createElement("div");
    actions.className = "puzzle-actions";
    const rotateButton = makeActionButton("旋轉", "fa-rotate-right", "", rotateSelectedPiece);
    rotateButton.disabled = !gameActive || !selectedPieceId || placedPieces.has(selectedPieceId);
    const resetButton = makeActionButton("重設", "fa-broom", "", resetBoard);
    resetButton.disabled = !gameActive || placedPieces.size === 0;
    const releaseButton = makeActionButton(
      "開始圍捕",
      "fa-flag-checkered",
      "rescue-button--primary",
      releaseDog,
    );
    actions.append(rotateButton, resetButton, releaseButton);

    layout.append(boardFrame, mobilePieceTray, routePanel, actions);
    gameBoard.replaceChildren(layout);
    updateBoardStatus(analysis, announce);
  }

  function selectNextUnusedPiece() {
    selectedPieceId =
      currentMap.pieces.find((piece) => !placedPieces.has(piece.id))?.id || null;
  }

  function placeSelectedPiece(center) {
    if (!gameActive) return;
    if (!selectedPieceId || placedPieces.has(selectedPieceId)) {
      setFeedback(gameData.feedback.select, "warning");
      return;
    }
    if (!canPlacePiece(selectedPieceId, center)) {
      setFeedback(gameData.feedback.invalid, "error");
      return;
    }
    placedPieces.set(selectedPieceId, {
      center: [...center],
      rotation: pieceRotations.get(selectedPieceId) || 0,
    });
    selectNextUnusedPiece();
    renderGameBoard();
  }

  function removePiece(pieceId) {
    if (!gameActive || !placedPieces.has(pieceId)) return;
    placedPieces.delete(pieceId);
    selectedPieceId = pieceId;
    renderGameBoard();
  }

  function rotateSelectedPiece() {
    if (!gameActive || !selectedPieceId || placedPieces.has(selectedPieceId)) return;
    pieceRotations.set(selectedPieceId, ((pieceRotations.get(selectedPieceId) || 0) + 1) % 4);
    renderGameBoard(false);
    setFeedback(`已旋轉「${getPiece(selectedPieceId).name}」。`);
  }

  function resetBoard() {
    if (!gameActive) return;
    placedPieces.clear();
    pieceRotations = new Map(currentMap.pieces.map((piece) => [piece.id, 0]));
    selectedPieceId = currentMap.pieces[0]?.id || null;
    dogPosition = [...currentMap.dog];
    renderGameBoard();
  }

  function wait(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  async function animateDog(path, outcome) {
    gameActive = false;
    const token = ++animationToken;
    setFeedback(
      outcome === "success"
        ? "路線成立！大家收緊包圍，小狗正往集合口跑。"
        : "外圈還有缺口！小狗立刻往沒有人守住的方向跑去。",
      outcome === "success" ? "success" : "error",
    );
    renderGameBoard(false);

    for (let index = 1; index < path.length; index += 1) {
      await wait(220);
      if (token !== animationToken) return;
      dogPosition = [...path[index]];
      renderGameBoard(false);
    }
    await wait(420);
    if (token === animationToken) showEndingDialogue(outcome);
  }

  function releaseDog() {
    if (!gameActive) return;
    const analysis = analyzeBoard();

    if (!analysis.targetRoute.path && analysis.reachableDangerRoutes.length === 0) {
      setFeedback(gameData.feedback.blocked, "error");
      return;
    }
    if (analysis.reachableDangerRoutes.length > 0) {
      const escapeRoute = [...analysis.reachableDangerRoutes].sort(
        (first, second) => first.path.length - second.path.length,
      )[0];
      animateDog(escapeRoute.path, "escape");
      return;
    }
    if (analysis.targetRoute.path) animateDog(analysis.targetRoute.path, "success");
  }

  function chooseRandomMap() {
    const lastMapId = sessionStorage.getItem(lastMapStorageKey);
    const alternatives = gameData.maps.filter((map) => map.id !== lastMapId);
    const pool = alternatives.length > 0 ? alternatives : gameData.maps;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    sessionStorage.setItem(lastMapStorageKey, selected.id);
    return selected;
  }

  function markPlaygroundCompleted() {
    const completedGames = JSON.parse(localStorage.getItem("completedGames")) || [];
    if (!completedGames.includes("playground")) {
      completedGames.push("playground");
      localStorage.setItem("completedGames", JSON.stringify(completedGames));
    }
  }

  function showStartModal() {
    gameActive = false;
    animationToken += 1;
    playgroundRescue.classList.add("hidden");
    gameIntroTitle.textContent = gameData.intro.title;
    gameIntroText.textContent = gameData.intro.text;
    gameIntroModal.classList.remove("hidden");
  }

  function renderGame() {
    gameActive = true;
    gameIntroModal.classList.add("hidden");
    playgroundRescue.classList.remove("hidden");
    gameTitle.textContent = gameData.title;
    renderGameBoard();
  }

  function showEndingDialogue(outcome) {
    gameActive = false;
    animationToken += 1;
    playgroundRescue.classList.add("hidden");
    gameIntroModal.classList.add("hidden");

    if (outcome === "success") {
      localStorage.setItem("ymsh:playgroundCompleted", "true");
      markPlaygroundCompleted();
      window.YMSHAchievements?.earn("playground-dog");
    }

    if (typeof DialogueCore !== "function") {
      if (outcome === "success") window.location.href = "map.html";
      else showStartModal();
      return;
    }

    endingDialogue.replaceChildren();
    endingDialogue.style.display = "block";
    const dataPath =
      outcome === "success"
        ? "data/playground-capture.json"
        : "data/playground-escape.json";
    const dialogue = new DialogueCore({
      container: "#game",
      data: dataPath,
      role: localStorage.getItem("playerRole") || "default",
      onFinish: () => {
        if (outcome === "success") window.location.href = "map.html";
      },
      onAction: (action) => {
        if (action === "playground:retry") {
          endingDialogue.style.display = "none";
          startGame();
        }
        if (action === "navigate:map") window.location.href = "map.html";
      },
    });
    dialogue.init().catch((error) => {
      console.error("Playground ending dialogue failed:", error);
      if (outcome === "success") window.location.href = "map.html";
      else showStartModal();
    });
  }

  function startGame() {
    animationToken += 1;
    currentMap = chooseRandomMap();
    dogPosition = [...currentMap.dog];
    placedPieces = new Map();
    pieceRotations = new Map(currentMap.pieces.map((piece) => [piece.id, 0]));
    selectedPieceId = currentMap.pieces[0]?.id || null;
    renderGame();
  }

  function startIntroDialogue() {
    if (
      localStorage.getItem(introStorageKey) === "true" ||
      typeof DialogueCore !== "function"
    ) {
      showStartModal();
      return;
    }

    endingDialogue.style.display = "block";
    const dialogue = new DialogueCore({
      container: "#game",
      data: "data/intro_playground.json",
      role: localStorage.getItem("playerRole") || "default",
      onFinish: () => {
        localStorage.setItem(introStorageKey, "true");
        endingDialogue.style.display = "none";
        showStartModal();
      },
    });
    dialogue.init().catch((error) => {
      console.error("Playground intro dialogue failed:", error);
      endingDialogue.style.display = "none";
      showStartModal();
    });
  }

  function handleKeyboard(event) {
    if (!gameActive || event.repeat) return;
    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      rotateSelectedPiece();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      resetBoard();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      releaseDog();
    }
  }

  startGameButton.addEventListener("click", startGame);

  async function loadGame() {
    try {
      const response = await fetch("data/playground.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      gameData = await response.json();
      gameTitle.textContent = gameData.title;
      exitCount.textContent = `${gameData.maps[0].size * 4 - 5}`;
      fenceCount.textContent = `${gameData.maps[0].pieces.length}`;
      document.addEventListener("keydown", handleKeyboard);
      document.addEventListener("pointerdown", startAmbience);
      document.addEventListener("keydown", startAmbience);
      window.bgm?.setTemporaryVolumeMultiplier(0.5);
      window.addEventListener("ymsh:settings-changed", (event) => {
        if (event.detail?.key === "bgmVolume") updateAmbienceVolume();
      });
      window.addEventListener("pagehide", () => {
        animationToken += 1;
        ambience.pause();
        window.bgm?.setTemporaryVolumeMultiplier(1);
      });
      window.addEventListener("pageshow", (event) => {
        if (!event.persisted) return;
        window.bgm?.setTemporaryVolumeMultiplier(0.5);
        startAmbience();
      });
      startIntroDialogue();
    } catch (error) {
      console.error("Playground game could not be loaded:", error);
      gameIntroText.textContent = "遊戲資料暫時無法讀取，請重新整理頁面再試一次。";
      gameIntroModal.classList.remove("hidden");
    }
  }

  loadGame();
});
