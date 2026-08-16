async function initPlayground() {
  const name = localStorage.getItem('playerName');
  const role = localStorage.getItem('playerRole') || 'default';
  const className = localStorage.getItem('playerClass');
  const dialogue = new DialogueCore({
    container: '.scene-container',
    data: 'data/map_intro.json',
    role,
    playerInfo: { name, className, role },
    reuseExistingLayout: true,
    onFinish: () => {
      localStorage.setItem('ymsh:playgroundEgg', 'true');
      sessionStorage.setItem('ymsh:mapIntroSeen', 'true');
      fadeTo('map.html');
    }
  });

  try {
    await dialogue.init();
  } catch (error) {
    console.error('Playground dialogue failed:', error);
    window.location.href = 'map.html';
  }
}

initPlayground();
