// map-config.js - 地圖尺寸、建築熱區、鍵盤觸發區與返回出生點
(function () {
  "use strict";

  // name is the map label. build_name is used only by the confirmation modal.
  // namePosition accepts CSS values and is positioned relative to clickArea.
  // triggerArea can be one object or an array of entrance objects.
  // Each trigger area supports clipPath with circle(), ellipse(), or polygon().
  const locations = [
    {
      id: "art",
      name: "藝術大樓",
      build_name: "　",
      namePosition: { left: "77%", bottom: "75%" },
      url: "art.html",
      returnPages: ["art.html", "artroom.html", "music.html"],
      clickArea: { x: 30, y: 28, width: 355, height: 412 },
      triggerArea: { x: 300, y: 390, width: 55, height: 20 },
      spawn: { x: 335, y: 470, direction: "front" },
    },
    {
      id: "classroom",
      name: "教室",
      build_name: "卓陽樓",
      namePosition: { left: "50%", bottom: "55%" },
      event: "快問快答",
      url: "games/classroom.html",
      returnPages: ["classroom.html"],
      clickArea: { x: 424, y: 30, width: 477, height: 245 },
      triggerArea: [
        { x: 435, y: 240, width: 50, height: 40 },
        { x: 837, y: 240, width: 50, height: 40 },
      ],
      spawn: { x: 460, y: 330, direction: "front" },
    },
    {
      id: "garden",
      name: "花圃",
      build_name: "　",
      namePosition: { left: "50%", bottom: "25%" },
      event: "花園急救站",
      url: "games/garden.html",
      returnPages: ["garden.html"],
      clickArea: {
        x: 530,
        y: 315,
        width: 322,
        height: 322,
        clipPath: "circle(50% at 50% 50%)",
      },
      triggerArea: [
        {
          x: 550,
          y: 470,
          width: 270,
          height: 180,
          clipPath: "ellipse(50% 30% at 50% 50%)",
        },
        {
          x: 800,
          y: 400,
          width: 50,
          height: 50,
        },
      ],
      spawn: { x: 500, y: 570, direction: "left" },
    },
    {
      id: "lab",
      name: "實驗室",
      build_name: "軒德樓",
      namePosition: { left: "50%", bottom: "70%" },
      event: "記憶翻牌",
      url: "games/lab.html",
      returnPages: ["lab.html"],
      clickArea: { x: 395, y: 665, width: 480, height: 225 },
      triggerArea: [
        { x: 700, y: 865, width: 100, height: 20 },
        { x: 410, y: 660, width: 55, height: 20 },
      ],
      spawn: { x: 750, y: 920, direction: "front" },
    },
    {
      id: "principal",
      name: "校長室",
      build_name: "行政樓",
      namePosition: { left: "50%", bottom: "75%" },
      url: "principal.html",
      returnPages: ["principal.html"],
      clickArea: { x: 655, y: 946, width: 550, height: 230 },
      triggerArea: { x: 988, y: 946, width: 102, height: 20 },
      spawn: { x: 1040, y: 925, direction: "back" },
    },
    {
      id: "hall",
      name: "穿堂",
      build_name: "逸心樓",
      namePosition: { left: "50%", bottom: "70%" },
      url: "hall.html",
      returnPages: ["hall.html"],
      clickArea: { x: 955, y: 375, width: 177, height: 526 },
      triggerArea: [
        { x: 1100, y: 750, width: 50, height: 60 },
        { x: 935, y: 500, width: 40, height: 50 },
      ],
      spawn: { x: 1180, y: 780, direction: "right" },
    },
    {
      id: "playground",
      name: "操場",
      build_name: "　",
      namePosition: { left: "51.5%", bottom: "43%" },
      url: "playground.html",
      returnPages: ["playground.html"],
      clickArea: {
        x: 1180,
        y: 322,
        width: 609,
        height: 313,
        clipPath:
          "polygon(93% 13%, 96% 24%, 99% 36%, 100% 48%, 100% 59%, 98% 72%, 94% 87%, 88% 96%, 81% 87%, 80% 87%, 79% 86%, 64% 100%, 19% 100%, 12% 96%, 8% 89%, 4% 80%, 1% 67%, 0% 56%, 0% 45%, 2% 29%, 6% 17%, 12% 6%, 20% 0%, 79% 0%, 88% 5%)",
      },
      triggerArea: {
        x: 1210,
        y: 337,
        width: 548 + 8,
        height: 282 + 8,
        clipPath:
          "polygon(93% 13%, 96% 24%, 99% 36%, 100% 48%, 100% 59%, 98% 72%, 94% 87%, 88% 96%, 81% 87%, 80% 87%, 79% 86%, 64% 100%, 19% 100%, 12% 96%, 8% 89%, 4% 80%, 1% 67%, 0% 56%, 0% 45%, 2% 29%, 6% 17%, 12% 6%, 20% 0%, 79% 0%, 88% 5%)",
      },
      spawn: { x: 1290, y: 660, direction: "front" },
    },
    {
      id: "index",
      name: "校門口",
      build_name: "　",
      modalType: "exit",
      namePosition: { left: "10000%", bottom: "10000%" },
      url: "index.html",
      returnPages: ["index.html", "whoAreYou.html"],
      clickArea: {
        x: 1230,
        y: 995,
        width: 0,
        height: 0,
        clipPath: "polygon(0% 100%, 100% -34%, 100% 104%)",
      },
      triggerArea: {
        x: 1352,
        y: 1102,
        width: 150,
        height: 80,
        clipPath: "polygon(95% 0, 110% 0%, 15% 100%, 0% 100%)",
      },
      spawn: { x: 1400, y: 1110, direction: "right" },
    },
  ];

  // Easter eggs are keyboard/touch-movement triggers only. They never create
  // clickable map hotspots. Coordinates use the original 1867 x 1280 map.
  const easterEggs = [
    {
      id: "pool",
      name: "游泳池",
      enabled: true,
      area: { x: 1525, y: 240, width: 175, height: 20 },
      dialoguePath: "data/map_easter_eggs.json",
      dialogueKey: "pool",
      once: false,
    },
    {
      id: "flyer",
      name: "傳單",
      enabled: true,
      area: { x: 383, y: 50, width: 40, height: 40 },
      dialoguePath: "data/map_easter_eggs.json",
      dialogueKey: "flyer",
      once: false,
    },
    {
      id: "dorm",
      name: "宿舍",
      enabled: true,
      area: { x: 525, y: 970, width: 30, height: 250 },
      dialoguePath: "data/map_easter_eggs.json",
      dialogueKey: "dorm",
      once: false,
    },
    {
      id: "library",
      name: "圖書館",
      enabled: true,
      area: { x: 270, y: 760, width: 30, height: 65 },
      dialoguePath: "data/map_easter_eggs.json",
      dialogueKey: "library",
      once: false,
    },
  ];

  window.YMSHMapConfig = Object.freeze({
    width: 1867,
    height: 1280,
    returnLocationKey: "ymsh:mapReturnLocation",
    defaultSpawn: { x: 1400, y: 1110, direction: "back" },
    locations: Object.freeze(locations),
    easterEggs: Object.freeze(easterEggs),
  });
})();
