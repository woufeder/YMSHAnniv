function muteMusicClassroomBgm() {
  window.bgm?.setTemporaryMute(true);
}

muteMusicClassroomBgm();
window.addEventListener("pageshow", muteMusicClassroomBgm);
window.addEventListener("pagehide", () => window.bgm?.setTemporaryMute(false));

document.addEventListener("DOMContentLoaded", () => {
  const NOTES = [
    { note: "C4", key: "Q", frequency: 261.63 },
    { note: "D4", key: "W", frequency: 293.66 },
    { note: "E4", key: "E", frequency: 329.63 },
    { note: "F4", key: "R", frequency: 349.23 },
    { note: "G4", key: "T", frequency: 392.0 },
    { note: "A4", key: "Y", frequency: 440.0 },
    { note: "B4", key: "U", frequency: 493.88 },
    { note: "C5", key: "I", frequency: 523.25 },
    { note: "D5", key: "O", frequency: 587.33 },
    { note: "E5", key: "P", frequency: 659.25 },
    { note: "F5", key: "[", frequency: 698.46 },
    { note: "G5", key: "]", frequency: 783.99 },
  ];

  // Original score is in B-flat major. This melody has been transposed up a whole step to C major.
  const SCHOOL_SONG_C_MAJOR = [
    [
      { note: "D5", lyric: "智" },
      { note: "G4", lyric: "美" },
      { note: "A4", lyric: "" },
      { note: "D5", lyric: "成" },
      { note: "D5", lyric: "器" },
    ],
    [
      { note: "E5", lyric: "仁" },
      { note: "D5", lyric: "善" },
      { note: "C5", lyric: "為" },
      { note: "G4", lyric: "民" },
    ],
    [
      { note: "F4", lyric: "誠" },
      { note: "D4", lyric: "和" },
      { note: "E4", lyric: "" },
      { note: "D4", lyric: "律" },
      { note: "G4", lyric: "己" },
    ],
    [
      { note: "D4", lyric: "立" },
      { note: "E4", lyric: "軒" },
      { note: "D4", lyric: "德" },
    ],
    [
      { note: "G4", lyric: "惜" },
      { note: "E4", lyric: "人" },
      { note: "G4", lyric: "" },
      { note: "C5", lyric: "愛" },
      { note: "C5", lyric: "物" },
    ],
    [
      { note: "G5", lyric: "尊" },
      { note: "E5", lyric: "親" },
      { note: "D5", lyric: "友" },
      { note: "C5", lyric: "" },
      { note: "G4", lyric: "鄉" },
    ],
    [
      { note: "E4", lyric: "齊" },
      { note: "G4", lyric: "家" },
      { note: "E4", lyric: "修" },
      { note: "D4", lyric: "身" },
      { note: "E4", lyric: "平" },
    ],
    [{ note: "C4", lyric: "心" }],
    [
      { note: "A4", lyric: "作" },
      { note: "A4", lyric: "育" },
      { note: "C5", lyric: "" },
      { note: "D5", lyric: "英" },
      { note: "A4", lyric: "才" },
    ],
    [
      { note: "G4", lyric: "開" },
      { note: "D4", lyric: "先" },
      { note: "E4", lyric: "河" },
    ],
    [
      { note: "E4", lyric: "況" },
      { note: "D4", lyric: "水" },
      { note: "C4", lyric: "杏" },
      { note: "D4", lyric: "壇" },
    ],
    [
      { note: "G4", lyric: "流" },
      { note: "E4", lyric: "百" },
      { note: "D4", lyric: "" },
      { note: "E4", lyric: "年" },
    ],
    [
      { note: "A4", lyric: "願" },
      { note: "C5", lyric: "我" },
      { note: "A4", lyric: "" },
      { note: "D5", lyric: "聖" },
      { note: "G5", lyric: "堂" },
    ],
    [
      { note: "E5", lyric: "存" },
      { note: "G5", lyric: "眞" },
      { note: "E5", lyric: "理" },
    ],
    [
      { note: "D5", lyric: "智" },
      { note: "E5", lyric: "慧" },
      { note: "D5", lyric: "照" },
      { note: "C5", lyric: "永" },
    ],
    [{ note: "C5", lyric: "明" }],
  ];

  const sheetMusic = document.getElementById("sheetMusic");
  const measureProgress = document.getElementById("measureProgress");
  const piano = document.getElementById("piano");
  const musicMessage = document.getElementById("musicMessage");
  const restartButton = document.getElementById("restartScore");
  const mapButton = document.getElementById("backToMap");
  const backButton = document.getElementById("backToArt");
  const notesByName = new Map(NOTES.map((item) => [item.note, item]));
  const score = SCHOOL_SONG_C_MAJOR.flatMap((measure, measureIndex) =>
    measure.map((item) => ({ ...item, measureIndex })),
  );
  // Change this value to adjust how long each piano note rings, in seconds.
  const NOTE_DURATION_SECONDS = 1.0;

  let progress = 0;
  let audioContext = null;

  function buildPiano() {
    piano.innerHTML = "";

    NOTES.forEach((item) => {
      const key = document.createElement("button");
      key.type = "button";
      key.className = `piano-key${item.note.endsWith("5") ? " is-high-octave" : ""}`;
      key.dataset.note = item.note;
      key.setAttribute("aria-label", `${item.note} 音，鍵盤 ${item.key}`);
      key.innerHTML = `<strong>${item.note}</strong><kbd>${item.key}</kbd>`;
      key.addEventListener("click", () => playNote(item.note));
      piano.appendChild(key);
    });
  }

  function renderSheetMusic() {
    const currentMeasure =
      score[Math.min(progress, score.length - 1)]?.measureIndex ?? 0;
    const firstMeasure = Math.floor(currentMeasure / 4) * 4;
    const visibleMeasures = SCHOOL_SONG_C_MAJOR.slice(
      firstMeasure,
      firstMeasure + 4,
    );

    measureProgress.textContent = `第 ${currentMeasure + 1} / ${SCHOOL_SONG_C_MAJOR.length} 小節`;
    sheetMusic.innerHTML = visibleMeasures
      .map((measure, offset) => {
        const measureIndex = firstMeasure + offset;
        const measureStart = score.findIndex(
          (entry) => entry.measureIndex === measureIndex,
        );
        const notes = measure
          .map((item, noteIndex) => {
            const scoreIndex = measureStart + noteIndex;
            const isPlayed = scoreIndex < progress;
            const isCurrent = scoreIndex === progress;
            return `<span class="score-note${isPlayed ? " is-played" : ""}${isCurrent ? " is-current" : ""}"><strong>${item.note}</strong><small>${item.lyric || "&nbsp;"}</small></span>`;
          })
          .join("");

        return `<section class="score-measure" aria-label="第 ${measureIndex + 1} 小節"><span class="measure-number">${measureIndex + 1}</span><div class="measure-notes">${notes}</div></section>`;
      })
      .join("");
  }

  function playTone(note) {
    const item = notesByName.get(note);
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!item || !AudioContextClass) return;

    audioContext ??= new AudioContextClass();
    audioContext.resume?.();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = item.frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.2,
      audioContext.currentTime + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + Math.max(NOTE_DURATION_SECONDS - 0.03, 0.01),
    );
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + NOTE_DURATION_SECONDS);
  }

  function flashKey(note, result) {
    const key = piano.querySelector(`[data-note="${note}"]`);
    if (!key) return;

    key.classList.remove("is-right", "is-wrong");
    void key.offsetWidth;
    key.classList.add(result === "right" ? "is-right" : "is-wrong");
  }

  function playNote(note) {
    const expected = score[progress];
    if (!expected) return;

    playTone(note);
    if (note === expected.note) {
      flashKey(note, "right");
      progress += 1;

      if (progress === score.length) {
        window.YMSHAchievements?.earn("school-song");
        musicMessage.textContent = "太棒啦！你演奏完整首校歌了！";
      } else {
        musicMessage.textContent = "真棒！繼續下一個音吧。";
      }
    } else {
      flashKey(note, "wrong");
      musicMessage.textContent = "這個音不太對唷！再試一次吧。";
    }

    renderSheetMusic();
  }

  function restartScore() {
    progress = 0;
    musicMessage.textContent = "跟著樂譜指示彈奏校歌吧！節奏不限，依序彈對每個音即可。";
    renderSheetMusic();
  }

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const item = NOTES.find(
      (note) => note.key.toLowerCase() === event.key.toLowerCase(),
    );
    if (!item) return;

    event.preventDefault();
    playNote(item.note);
  });

  restartButton.addEventListener("click", restartScore);
  mapButton.addEventListener("click", () => {
    window.location.href = "../map.html";
  });
  backButton.addEventListener("click", () => {
    window.location.href = "../art.html";
  });

  buildPiano();
  restartScore();
});
