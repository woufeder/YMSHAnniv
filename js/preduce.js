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
    onFinish: () => fadeTo('map.html')
  });

  await dialogue.init();
}

init();
