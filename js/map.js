// map.js - 地圖互動與進度管理
document.addEventListener('DOMContentLoaded', function() {
    const progressChecklist = document.getElementById('progress-checklist');
    const campusMap = document.getElementById('campusMap');
    const markers = document.querySelector('.location-markers');
    const MAP_WIDTH = 5959;
    const MAP_HEIGHT = 4092;
    const locations = [
        { id: 'art', name: '藝術大樓', event: '藝術大樓', mapX: 950, mapY: 1000, url: 'art.html' },
        { id: 'classroom', name: '教室', event:"快問快答", mapX: 565, mapY: 3000, url: 'games/classroom.html' },
        { id: 'garden', name: '花圃', event:"花園急救站", mapX: 2000, mapY: 1025, url: 'games/garden.html' },
        { id: 'lab', name: '實驗室', event:"記憶翻牌", mapX: 2550, mapY: 2600, url: 'games/lab.html' },
        { id: 'principal', name: '校長室', mapX: 3500, mapY: 3200, url: 'principal.html' },
        { id: 'hall', name: '穿堂', mapX: 3360, mapY: 2600, url: 'hall.html' },
        { id: 'playground', name: '操場', mapX: 4850, mapY: 1600, url: 'playground.html' },
        // { id: 'extras', name: '彩蛋區', mapX: 5200, mapY: 470, url: 'games/extras.html' }
    ];
    const mainGameIds = ['classroom', 'garden', 'lab'];
    const specialEggs = [
        { storageKey: 'ymsh:playgroundEgg', label: '特殊彩蛋：操場' },
        { storageKey: 'ymsh:musicClassroomEgg', label: '特殊彩蛋：校歌' }
    ];
    
    // 初始化進度
    let completedGames = JSON.parse(localStorage.getItem('completedGames')) || [];
    updateProgress();

    // 建立地點標記
    createLocationMarkers();
    positionLocationMarkers();
    window.addEventListener('resize', positionLocationMarkers);
    campusMap?.addEventListener('load', positionLocationMarkers);

    function createLocationMarkers() {
        if (!markers) return;

        locations.forEach(location => {
            const marker = document.createElement('div');
            marker.className = 'location-marker';
            marker.dataset.mapX = location.mapX;
            marker.dataset.mapY = location.mapY;
            marker.textContent = location.name;
            
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

        const mainGames = locations.filter(location => mainGameIds.includes(location.id));
        const progressItems = mainGames.map(location => {
            const item = document.createElement('label');
            item.className = 'progress-check-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = completedGames.includes(location.id);
            checkbox.disabled = true;
            checkbox.setAttribute('aria-label', `${location.name}${checkbox.checked ? '已完成' : '未完成'}`);

            const name = document.createElement('span');
            name.textContent = location.event;

            item.append(checkbox, name);
            return item;
        });

        specialEggs.forEach(egg => {
            if (localStorage.getItem(egg.storageKey) !== 'true') return;

            const item = document.createElement('div');
            item.className = 'progress-special-egg';
            item.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';

            const name = document.createElement('span');
            name.textContent = egg.label;
            item.append(name);
            progressItems.push(item);
        });

        progressChecklist.replaceChildren(...progressItems);
    }
});
