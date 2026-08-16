function startLocationIntro({ data, storageKey, contentSelector, onReady }) {
  const game = document.getElementById('game');
  const content = document.querySelector(contentSelector);
  let hasStarted = false;

  function revealContent() {
    if (hasStarted) return;
    hasStarted = true;
    if (game) game.style.display = 'none';
    content?.classList.remove('is-hidden');
    onReady?.();
  }

  if (!game || !content || typeof DialogueCore !== 'function') {
    revealContent();
    return;
  }

  if (localStorage.getItem(storageKey) === 'true') {
    revealContent();
    return;
  }

  const intro = new DialogueCore({
    container: '#game',
    data,
    onFinish: () => {
      localStorage.setItem(storageKey, 'true');
      revealContent();
    }
  });

  intro.init().catch((error) => {
    console.error('Location intro failed:', error);
    revealContent();
  });
}
