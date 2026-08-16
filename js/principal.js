// principal.js - 紀念卡生成功能
document.addEventListener('DOMContentLoaded', () => {
  const ARTWORK_STORAGE_KEY = 'ymsh:artwork';
  const canvas = document.getElementById('memoryCard');
  const ctx = canvas.getContext('2d');
  const generateButton = document.getElementById('generateCard');
  const downloadButton = document.getElementById('downloadCard');
  const backButton = document.getElementById('backToMap');
  const userName = localStorage.getItem('userName') || '紀念者';
  const completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];

  function drawCoverImage(image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.width - sourceWidth) / 2;
    const sourceY = (image.height - sourceHeight) / 2;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function drawAchievements() {
    const achievements = [
      { name: '記憶大師', icon: 'M', completed: completedGames.includes('classroom') },
      { name: '綠手指', icon: 'G', completed: completedGames.includes('garden') },
      { name: '小愛迪生', icon: 'L', completed: completedGames.includes('lab') },
      { name: '音樂彩蛋', icon: '♪', completed: localStorage.getItem('ymsh:musicClassroomEgg') === 'true' }
    ];

    achievements.forEach((achievement, index) => {
      const y = 156 + index * 34;
      ctx.beginPath();
      ctx.arc(58, y - 5, 13, 0, Math.PI * 2);
      ctx.fillStyle = achievement.completed ? '#4c9a69' : '#d3d8dc';
      ctx.fill();
      ctx.strokeStyle = achievement.completed ? '#2d6746' : '#9ca6ae';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(achievement.icon, 58, y);

      ctx.textAlign = 'left';
      ctx.font = '15px Arial';
      ctx.fillStyle = achievement.completed ? '#2d6746' : '#7a858d';
      ctx.fillText(achievement.name, 82, y);
      ctx.textAlign = 'right';
      ctx.font = '12px Arial';
      ctx.fillStyle = achievement.completed ? '#4c9a69' : '#a3abb1';
      ctx.fillText(achievement.completed ? '已完成' : '未完成', 344, y);
    });
  }

  async function drawArtworkPreview() {
    const x = 60;
    const y = 315;
    const width = 280;
    const height = 165;
    const artwork = localStorage.getItem(ARTWORK_STORAGE_KEY);

    ctx.textAlign = 'center';
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = '#345c7c';
    ctx.fillText('美術教室作品', canvas.width / 2, 296);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, width, height);

    if (!artwork) {
      ctx.strokeStyle = '#a5b8c8';
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
      ctx.fillStyle = '#7e93a3';
      ctx.font = '14px Arial';
      ctx.fillText('尚未留下作品', canvas.width / 2, y + height / 2 + 5);
      return;
    }

    try {
      const image = await loadImage(artwork);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      drawCoverImage(image, x, y, width, height);
      ctx.restore();
      ctx.strokeStyle = '#6e9ab9';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    } catch (error) {
      console.warn('Artwork preview failed:', error);
      ctx.strokeStyle = '#d47b7b';
      ctx.strokeRect(x, y, width, height);
    }
  }

  async function generateCard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#e8f4ff');
    gradient.addColorStop(1, '#cbddec');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#315f8b';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#204d78';
    ctx.font = 'bold 25px Arial';
    ctx.fillText('YMSH 周年紀念卡', canvas.width / 2, 52);
    ctx.font = 'bold 21px Arial';
    ctx.fillStyle = '#315f8b';
    ctx.fillText(userName, canvas.width / 2, 88);

    const totalGames = ['classroom', 'garden', 'lab'];
    const completedCount = completedGames.filter(game => totalGames.includes(game)).length;
    ctx.font = '15px Arial';
    ctx.fillStyle = '#4c5b66';
    ctx.fillText(`主要挑戰完成：${completedCount}/${totalGames.length}`, canvas.width / 2, 118);

    drawAchievements();
    await drawArtworkPreview();

    ctx.font = '13px Arial';
    ctx.fillStyle = '#6f7f8b';
    ctx.fillText(`生成日期：${new Date().toLocaleDateString('zh-TW')}`, canvas.width / 2, 548);
  }

  async function downloadCard() {
    await generateCard();
    const link = document.createElement('a');
    link.download = `YMSH_周年紀念卡_${userName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  generateButton.addEventListener('click', generateCard);
  downloadButton.addEventListener('click', downloadCard);
  backButton.addEventListener('click', () => {
    window.location.href = 'map.html';
  });

  generateCard();
});
