async function init() {
  const dialogue = new DialogueCore({
    container: '.scene-container',
    data: 'data/whoAreYou.json',
    reuseExistingLayout: true,
    onFinish: () => fadeTo('index.html')
  });

  await dialogue.init();
}

init();
