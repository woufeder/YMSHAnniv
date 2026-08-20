document.addEventListener('DOMContentLoaded', () => {
  const introStorageKey = 'seen_intro_art';
  const game = document.getElementById('game');
  const building = document.querySelector('.art-building');

  function showBuilding() {
    game.style.display = 'none';
    building.classList.remove('is-hidden');
  }

  async function playIntro() {
    if (localStorage.getItem(introStorageKey) === 'true') {
      showBuilding();
      return;
    }

    try {
      const intro = new DialogueCore({
        container: '#game',
        data: 'data/intro_art.json',
        role: localStorage.getItem('playerRole') || 'default',
        onFinish: () => {
          localStorage.setItem(introStorageKey, 'true');
          showBuilding();
        }
      });
      await intro.init();
    } catch (error) {
      console.error('Art building intro failed:', error);
      showBuilding();
    }
  }

  playIntro();
});
