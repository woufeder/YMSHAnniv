// map.js - 地圖互動與進度管理
document.addEventListener('DOMContentLoaded', function() {
    const progressChecklist = document.getElementById('progress-checklist');
    const campusMap = document.getElementById('campusMap');
    const markers = document.querySelector('.location-markers');
    const MAP_WIDTH = 5959;
    const MAP_HEIGHT = 4092;
    const locations = [
        { id: 'art', name: '藝術大樓', mapX: 950, mapY: 1200, url: 'art.html' },
        { id: 'classroom', name: '教室', event:"快問快答", mapX: 565, mapY: 3000, url: 'games/classroom.html' },
        { id: 'garden', name: '花圃', event:"花園急救站", mapX: 2600, mapY: 1055, url: 'games/garden.html' },
        { id: 'lab', name: '實驗室', event:"記憶翻牌", mapX: 2550, mapY: 2600, url: 'games/lab.html' },
        { id: 'principal', name: '校長室', mapX: 3500, mapY: 3200, url: 'principal.html' },
        { id: 'hall', name: '穿堂', mapX: 3600, mapY: 2600, url: 'hall.html' },
        { id: 'playground', name: '操場', mapX: 4850, mapY: 1600, url: 'playground.html' },
        // { id: 'extras', name: '彩蛋區', mapX: 5200, mapY: 470, url: 'games/extras.html' }
    ];
    
    // 初始化進度
    let completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];
    updateProgress();

    // 建立地點標記
    createLocationMarkers();
    positionLocationMarkers();
    window.addEventListener('resize', positionLocationMarkers);
    window.addEventListener('ymsh:map-revealed', positionLocationMarkers);
    campusMap?.addEventListener('load', positionLocationMarkers);

    function createLocationMarkers() {
        if (!markers) return;

        locations.forEach(location => {
            const marker = document.createElement('button');
            marker.className = 'location-marker';
            marker.type = 'button';
            marker.dataset.mapX = location.mapX;
            marker.dataset.mapY = location.mapY;
            marker.setAttribute('aria-label', `前往${location.name}`);
            marker.innerHTML = `
                <span class="location-pin" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
                <span class="location-label">${location.name}</span>
            `;
            
            // 檢查是否已完成
            if (completedGames.includes(location.id)) {
                marker.classList.add('completed');
            }

            marker.addEventListener('click', () => {
                window.location.href = location.url;
            });

            markers.appendChild(marker);
        });
    }

    function positionLocationMarkers() {
        if (!markers) return;

        const rect = markers.getBoundingClientRect();
        const scale = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
        const renderedWidth = MAP_WIDTH * scale;
        const renderedHeight = MAP_HEIGHT * scale;
        const offsetX = (rect.width - renderedWidth) / 2;
        const offsetY = (rect.height - renderedHeight) / 2;

        markers.querySelectorAll('.location-marker').forEach(marker => {
            const mapX = Number(marker.dataset.mapX);
            const mapY = Number(marker.dataset.mapY);
            marker.style.left = `${offsetX + mapX * scale}px`;
            marker.style.top = `${offsetY + mapY * scale}px`;
        });
    }

    function updateProgress() {
        if (!progressChecklist) return;

        const achievements = window.YMSHAchievements?.all || [];
        const achievementItems = achievements.map(achievement => {
            const earned = window.YMSHAchievements.has(achievement.id);
            const item = document.createElement('div');
            item.className = `progress-achievement${earned ? ' is-earned' : ''}`;
            item.innerHTML = `<i class="fa-solid ${earned ? 'fa-star' : 'fa-question'}" aria-hidden="true"></i>`;

            const name = document.createElement('span');
            name.textContent = earned ? `達成成就：${achievement.title}` : '？？？？？';
            item.append(name);
            return item;
        });

        progressChecklist.replaceChildren(...achievementItems);
    }
});
