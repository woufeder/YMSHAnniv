let dialogue = [];
let current = 0;
let typingInterval = null;

const bg = document.querySelector('#bg');
const nameBox = document.querySelector('#name');
const dialogueHeader = document.querySelector('.dialogue-header');
const textBox = document.querySelector('#text');
const nextBtn = document.querySelector('#nextBtn');
const scene = document.querySelector('.scene-container');

async function init() {
  await loadDialogue('data/whoAreYou.json');
  nextBtn?.addEventListener('click', nextLine);
}

async function loadDialogue(path) {
  try {
    const res = await fetch(path);
    const data = await res.json();
    dialogue = Array.isArray(data) ? data : (data.default || data.warning || []);
    current = 0;
    showLine();
  } catch (error) {
    console.error(`❌ 劇情載入失敗：${path}`, error);
  }
}

function showLine() {
  const line = dialogue[current];
  if (!line) return;

  clearInterval(typingInterval);
  scene?.classList.remove('shake', 'shakeStrong', 'flash');

  if (line.bg && bg && line.bg !== bg.src) {
    bg.src = line.bg;
  }

  if (line.name) {
    nameBox.textContent = line.name;
    dialogueHeader.style.display = 'block';
  } else {
    nameBox.textContent = '';
    dialogueHeader.style.display = 'none';
  }

  if (line.effect) {
    triggerEffect(line.effect);
  }

  typeText(line.text || '');
}

function typeText(text) {
  textBox.textContent = '';
  let index = 0;
  let pauseUntil = 0;

  typingInterval = setInterval(() => {
    if (Date.now() < pauseUntil) {
      return;
    }

    const remaining = text.slice(index);

    if (remaining.startsWith('<wait')) {
      const match = remaining.match(/^<wait=?(\d*)>/);
      const delay = match && match[1] ? parseInt(match[1], 10) : 300;
      pauseUntil = Date.now() + delay;
      index += match[0].length;
      return;
    }

    if (remaining[0] === '|') {
      pauseUntil = Date.now() + 500;
      index++;
      return;
    }

    textBox.textContent += text[index];
    index++;

    if (index >= text.length) {
      clearInterval(typingInterval);
    }
  }, 50);
}

function getDisplayedTextLength(text) {
  return text
    .replace(/<wait=?\d*>/g, '')
    .replace(/\|/g, '')
    .length;
}

function nextLine() {
  clearInterval(typingInterval);
  const line = dialogue[current];
  const fullText = line?.text || '';

  if (textBox.textContent.length < getDisplayedTextLength(fullText)) {
    textBox.textContent = fullText
      .replace(/<wait=?\d*>/g, '')
      .replace(/\|/g, '');
    return;
  }

  current++;
  if (current < dialogue.length) {
    showLine();
  } else {
    fadeTo('index.html');
  }
}

init();