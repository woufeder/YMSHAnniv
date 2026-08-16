document.addEventListener('DOMContentLoaded', () => {
  const eggStatus = document.getElementById('musicEggStatus');
  const backButton = document.getElementById('backToMap');
  const hasMusicEgg = localStorage.getItem('ymsh:musicClassroomEgg') === 'true';

  eggStatus.innerHTML = hasMusicEgg
    ? '<i class="fa-solid fa-star" aria-hidden="true"></i><span>音樂教室彩蛋已獲得</span>'
    : '<i class="fa-regular fa-star" aria-hidden="true"></i><span>音樂教室彩蛋尚未獲得</span>';
  eggStatus.classList.toggle('is-earned', hasMusicEgg);

  backButton.addEventListener('click', () => {
    window.location.href = 'map.html';
  });
});
