async function initMapIntro() {
  const introSeenKey = 'ymsh:mapIntroSeen';

  function showMap() {
    sessionStorage.setItem(introSeenKey, 'true');
    document.getElementById('mapIntro')?.remove();
    document.getElementById('mapContent')?.classList.remove('is-hidden');
    window.dispatchEvent(new Event('ymsh:map-revealed'));
  }

  if (sessionStorage.getItem(introSeenKey) === 'true') {
    showMap();
    return;
  }

  const name = localStorage.getItem('playerName');
  const role = localStorage.getItem('playerRole') || 'default';
  const className = localStorage.getItem('playerClass');
  const dialogue = new DialogueCore({
    container: '#mapIntro',
    data: 'data/map_intro.json',
    role,
    playerInfo: { name, className, role },
    reuseExistingLayout: true,
    onFinish: showMap
  });

  try {
    await dialogue.init();
  } catch (error) {
    console.error('Map intro failed:', error);
    showMap();
  }
}

initMapIntro();
