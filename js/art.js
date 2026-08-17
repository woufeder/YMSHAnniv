document.addEventListener('DOMContentLoaded', () => {
  const introStorageKey = 'seen_intro_art';
  const game = document.getElementById('game');
  const building = document.querySelector('.art-building');
  const eggStatus = document.getElementById('musicEggStatus');
  const hasMusicEgg = localStorage.getItem('ymsh:musicClassroomEgg') === 'true';

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

  eggStatus.innerHTML = hasMusicEgg
    ? '<i class="fa-solid fa-star" aria-hidden="true"></i>'
    : '';
  eggStatus.classList.toggle('is-earned', hasMusicEgg);

  playIntro();
});
