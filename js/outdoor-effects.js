(() => {
  const container = document.querySelector('.outdoor-particles');
  if (!container || typeof gsap === 'undefined') return;

  const particleCount = 30;
  for (let index = 0; index < particleCount; index += 1) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = '●';
    container.appendChild(flake);

    const startY = Math.random() * window.innerHeight;
    gsap.set(flake, {
      fontSize: Math.random() + 5,
      x: -40,
      y: startY,
      opacity: Math.random() * 0.6 + 0.1
    });

    gsap.to(flake, {
      x: window.innerWidth + 40,
      y: startY + Math.random() * 700 + 300,
      rotation: Math.random() * 180 - 90,
      duration: Math.random() * 5 + 6,
      delay: Math.random() * 5,
      repeat: -1,
      ease: 'none'
    });

    gsap.to(flake, {
      y: `+=${Math.random() * 200 - 100}`,
      duration: Math.random() * 3 + 2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }
})();
