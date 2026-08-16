// 初始化
async function init() {
  // 從 localStorage 讀取資料
  const name = localStorage.getItem('playerName');
  const role = localStorage.getItem('playerRole') || 'default';
  const className = localStorage.getItem('playerClass');

  const dialogue = new DialogueCore({
    container: '.scene-container',
    data: 'data/precede.json',
    role,
    playerInfo: { name, className, role },
    reuseExistingLayout: true,
    onFinish: () => {
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage === 'playground.html') {
        localStorage.setItem('ymsh:playgroundEgg', 'true');
      }
      fadeTo('map.html');
    }
  });

  await dialogue.init();
}

init();
