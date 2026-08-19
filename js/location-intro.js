function startLocationIntro({ data, storageKey, contentSelector, onReady }) {
  const game = document.getElementById("game");
  const content = document.querySelector(contentSelector);
  let hasStarted = false;

  function revealContent() {
    if (hasStarted) return;

    hasStarted = true;

    if (game) {
      game.style.display = "none";
    }

    content?.classList.remove("is-hidden");
    onReady?.();
  }

  if (!game || !content || typeof DialogueCore !== "function") {
    revealContent();
    return;
  }

  if (localStorage.getItem(storageKey) === "true") {
    revealContent();
    return;
  }

  // 只補這三行，其他流程維持原設計
  const name = localStorage.getItem("playerName");
  const role = localStorage.getItem("playerRole") || "default";
  const className = localStorage.getItem("playerClass");

  const intro = new DialogueCore({
    container: "#game",
    role,
    playerInfo: {
      name,
      className,
      role,
    },
    data,
    onFinish: () => {
      localStorage.setItem(storageKey, "true");
      revealContent();
    },
  });

  intro.init().catch((error) => {
    console.error("Location intro failed:", error);
    revealContent();
  });
}
