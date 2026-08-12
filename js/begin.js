
async function init() {
  const dialogue = new DialogueCore({
    container: '.scene-container',
    data: 'data/precede.json',
    dialogueKey: 'warning',
    reuseExistingLayout: true,
    onFinish: () => fadeTo('gate.html')
  });

  await dialogue.init();
}


init();
