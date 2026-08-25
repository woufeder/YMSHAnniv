// hall.js - Google Sheet 留言板串接
function initHall() {
    const userNameInput = document.getElementById('userNameInput');
    const messageInput = document.getElementById('messageInput');
    const submitBtn = document.getElementById('submitMessage');
    const messagesList = document.getElementById('messagesList');
    const backBtn = document.getElementById('backToMap');
    const openModalBtn = document.getElementById('openModalBtn');
    const messageCharacterCount = document.getElementById('messageCharacterCount');

    // 初始化 Bootstrap Modal
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    const messageDetailModalElement = document.getElementById('messageDetailModal');
    const messageDetailModal = new bootstrap.Modal(messageDetailModalElement);
    const messageDetailTitle = document.getElementById('messageDetailTitle');
    const messageDetailTime = document.getElementById('messageDetailTime');
    const messageDetailContent = document.getElementById('messageDetailContent');

    // Google Apps Script Web App URL
    const SHEET_URL = "https://script.google.com/macros/s/AKfycbyt1y70Lve-DHZ8dpXGPOl3u02ZnCXpNnsxnEztrDWHgsbL-uTRbKJdunXykinjHNw62Q/exec";

    let messages = [];

    // 根據 ID 產生固定且隨機的樣式
    function generateStickyNoteStyle(id) {
        let seed = 0;
        for (let i = 0; i < id.length; i++) {
            seed += id.charCodeAt(i);
        }

        const pseudoRandom = (max, offset = 0) => {
            const x = Math.sin(seed + offset) * 10000;
            return (x - Math.floor(x)) * max;
        };

        const colors = ['#fff9c4', '#fedfea', '#e1f5fe', '#f0f4c3', '#ffe0b2'];
        const color = colors[Math.floor(pseudoRandom(colors.length))];

        // 優化位置：預留邊距，確保便條紙不會超出螢幕
        const top = 5 + pseudoRandom(75); // 5% ~ 80%
        const left = 5 + pseudoRandom(75); // 5% ~ 80%
        const rotation = -8 + pseudoRandom(16);

        return {
            '--note-top': `${top}%`,
            '--note-left': `${left}%`,
            '--note-color': color,
            '--note-rotation': `${rotation}deg`
        };
    }

    function createRandomStickyNoteLayouts(items) {
        const isCompact = window.matchMedia('(max-width: 576px)').matches;
        const noteWidth = isCompact ? 142 : 150;
        const noteHeight = isCompact ? 160 : 168;
        const padding = 22;
        const gap = 16;
        const canvasWidth = Math.max(messagesList.clientWidth, noteWidth + padding * 2);
        const columns = Math.max(1, Math.floor((canvasWidth - padding * 2 + gap) / (noteWidth + gap)));
        const requiredRows = Math.ceil(items.length / columns);
        const minimumHeight = padding * 2 + requiredRows * noteHeight + Math.max(0, requiredRows - 1) * gap;
        const canvasHeight = Math.max(messagesList.clientHeight, minimumHeight);
        const maxLeft = Math.max(padding, canvasWidth - noteWidth - padding);
        const maxTop = Math.max(padding, canvasHeight - noteHeight - padding);
        const placed = [];

        messagesList.style.setProperty('--notes-content-height', `${minimumHeight}px`);

        return items.map((message, index) => {
            const id = String(message.id || message.timestamp || index);
            let seed = index * 97;
            for (let characterIndex = 0; characterIndex < id.length; characterIndex++) {
                seed += id.charCodeAt(characterIndex);
            }

            let selected;
            let lowestPenalty = Number.POSITIVE_INFINITY;

            for (let attempt = 0; attempt < 80; attempt++) {
                const randomLeft = Math.sin(seed + attempt * 11 + 1) * 10000;
                const randomTop = Math.sin(seed + attempt * 11 + 2) * 10000;
                const left = padding + (randomLeft - Math.floor(randomLeft)) * (maxLeft - padding);
                const top = padding + (randomTop - Math.floor(randomTop)) * (maxTop - padding);
                const candidate = { left, top };
                let penalty = 0;

                placed.forEach((existing) => {
                    const overlapWidth = Math.max(0, Math.min(left + noteWidth + gap, existing.left + noteWidth + gap) - Math.max(left - gap, existing.left - gap));
                    const overlapHeight = Math.max(0, Math.min(top + noteHeight + gap, existing.top + noteHeight + gap) - Math.max(top - gap, existing.top - gap));
                    penalty += overlapWidth * overlapHeight;
                });

                if (penalty === 0) {
                    selected = candidate;
                    break;
                }

                if (penalty < lowestPenalty) {
                    lowestPenalty = penalty;
                    selected = candidate;
                }
            }

            placed.push(selected);
            return {
                top: `${selected.top.toFixed(1)}px`,
                left: `${selected.left.toFixed(1)}px`,
                rotation: `${(Math.sin(seed + 3) * 2.5).toFixed(2)}deg`
            };
        });
    }

    function updateCharacterCount() {
        messageCharacterCount.textContent = `${messageInput.value.length} / 500`;
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) return '';

        return new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    }

    async function loadMessages() {
        try {
            const response = await fetch(SHEET_URL, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            messages = data.map(item => ({
                id: item['ID'],
                name: item['姓名'],
                message: item['訊息'],
                timestamp: item['時間戳記']
            }));

            displayMessages();
        } catch (error) {
            console.error('載入留言失敗:', error);
        }
    }

    function displayMessages() {
        messagesList.innerHTML = '';
        const layouts = createRandomStickyNoteLayouts(messages);

        messages.forEach((msg, index) => {
            const note = document.createElement('button');
            note.type = 'button';
            note.className = 'sticky-note';
            const style = generateStickyNoteStyle(msg.id || msg.timestamp);
            const layout = layouts[index];
            style['--note-top'] = layout.top;
            style['--note-left'] = layout.left;
            style['--note-rotation'] = layout.rotation;
            Object.entries(style).forEach(([property, value]) => {
                note.style.setProperty(property, value);
            });

            const author = document.createElement('strong');
            author.className = 'sticky-note__author';
            author.textContent = msg.name || '匿名';
            const content = document.createElement('div');
            content.className = 'sticky-note__content';
            content.textContent = msg.message || '';
            note.setAttribute('aria-label', `閱讀 ${author.textContent} 的完整留言`);
            note.append(author, content);
            note.addEventListener('click', () => showMessageDetail(msg, style['--note-color']));
            messagesList.appendChild(note);
        });
    }

    function showMessageDetail(msg, noteColor) {
        messageDetailModalElement.style.setProperty('--message-note-color', noteColor || '#ffffff');
        messageDetailTitle.textContent = msg.name || '匿名';
        messageDetailTime.textContent = formatTimestamp(msg.timestamp);
        messageDetailContent.textContent = msg.message || '';
        messageDetailModal.show();
    }

    async function submitMessage() {
        const name = userNameInput.value.trim();
        const messageText = messageInput.value;

        if (!name) {
            showBootstrapAlert('請輸入您的姓名', 'warning');
            return;
        }
        if (!messageText.trim()) {
            showBootstrapAlert('請輸入留言內容', 'warning');
            return;
        }
        if (messageText.length > 500) {
            showBootstrapAlert('留言最多 500 字', 'warning');
            return;
        }

        const messageData = {
            name: name,
            message: messageText
        };

        try {
            await fetch(SHEET_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
            });

            showBootstrapAlert('留言成功！請重整網頁後稍待', 'success');
            messageInput.value = '';
            updateCharacterCount();
            messageModal.hide();
            setTimeout(loadMessages, 1500);

        } catch (error) {
            console.error('送出留言時發生錯誤:', error);
            showBootstrapAlert('留言送出失敗，請稍後再試', 'danger');
        }
    }

    openModalBtn.addEventListener('click', () => {
        updateCharacterCount();
        messageModal.show();
    });
    messageInput.addEventListener('input', updateCharacterCount);
    submitBtn.addEventListener('click', submitMessage);

    backBtn.addEventListener('click', () => window.location.href = 'map.html');

    let resizeTimer;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(displayMessages, 120);
    });

    updateCharacterCount();
    loadMessages();
    setInterval(loadMessages, 60000);
}

window.initHall = initHall;
