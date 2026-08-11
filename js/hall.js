// hall.js - Google Sheet 留言板串接
document.addEventListener('DOMContentLoaded', function() {
    const userNameInput = document.getElementById('userNameInput');
    const messageInput = document.getElementById('messageInput');
    const submitBtn = document.getElementById('submitMessage');
    const messagesList = document.getElementById('messagesList');
    const backBtn = document.getElementById('backToMap');
    const openModalBtn = document.getElementById('openModalBtn');

    // 初始化 Bootstrap Modal
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));

    // Google Apps Script Web App URL
    const SHEET_URL = "https://script.google.com/macros/s/AKfycbyt1y70Lve-DHZ8dpXGPOl3u02ZnCXpNnsxnEztrDWHgsbL-uTRbKJdunXykinjHNw62Q/exec";

    if (localStorage.getItem('userName')) {
        userNameInput.value = localStorage.getItem('userName');
    }

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

        const colors = ['#fff9c4', '#f8bbd0', '#e1f5fe', '#f0f4c3', '#ffe0b2'];
        const color = colors[Math.floor(pseudoRandom(colors.length))];

        // 優化位置：預留邊距，確保便條紙不會超出螢幕
        const top = 5 + pseudoRandom(75); // 5% ~ 80%
        const left = 5 + pseudoRandom(75); // 5% ~ 80%
        const rotation = -8 + pseudoRandom(16);

        return {
            position: 'absolute',
            top: `${top}%`,
            left: `${left}%`,
            backgroundColor: color,
            transform: `rotate(${rotation}deg)`,
            width: '160px',
            minHeight: '160px',
            padding: '15px',
            boxShadow: '2px 4px 10px rgba(0,0,0,0.2)',
            borderRadius: '2px',
            zIndex: Math.floor(pseudoRandom(100))
        };
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

        messages.forEach(msg => {
            const note = document.createElement('div');
            note.className = 'sticky-note';
            const style = generateStickyNoteStyle(msg.id || msg.timestamp);
            Object.assign(note.style, style);

            note.innerHTML = `
                <div class="note-header">
                    <span class="note-author">${msg.name}</span>
                    <span class="note-time">${msg.timestamp}</span>
                </div>
                <div class="note-content">${msg.message}</div>
            `;
            messagesList.appendChild(note);
        });
    }

    async function submitMessage() {
        const name = userNameInput.value.trim();
        const messageText = messageInput.value.trim();

        if (!name) {
            alert('請輸入您的姓名');
            return;
        }
        if (!messageText) {
            alert('請輸入留言內容');
            return;
        }

        localStorage.setItem('userName', name);

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

            alert('留言成功！感謝您的祝福 ❤️');
            messageInput.value = '';
            messageModal.hide();
            setTimeout(loadMessages, 1500);

        } catch (error) {
            console.error('送出留言時發生錯誤:', error);
            alert('留言送出失敗，請稍後再試');
        }
    }

    openModalBtn.addEventListener('click', () => messageModal.show());
    submitBtn.addEventListener('click', submitMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitMessage();
        }
    });

    backBtn.addEventListener('click', () => window.location.href = 'map.html');

    loadMessages();
    setInterval(loadMessages, 60000);
});
