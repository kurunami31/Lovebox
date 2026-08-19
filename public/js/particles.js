/* ============================================================
   The Keepsake Box — floating particles for dreamy effect
   ============================================================ */

const Particles = (() => {
  const container = document.getElementById('particles');
  if (!container) return { init() {} };

  const PARTICLE_COUNT = 25;
  const COLORS = [
    'rgba(227, 200, 150, 0.45)',  /* gold */
    'rgba(212, 122, 142, 0.4)',  /* rose */
    'rgba(168, 143, 184, 0.35)',  /* lavender */
    'rgba(243, 227, 230, 0.4)',  /* cream */
    'rgba(201, 161, 94, 0.35)',  /* deep gold */
  ];

  function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 6 + 2;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 20 + 15;
    const delay = Math.random() * 20;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = color;
    particle.style.left = `${left}%`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;
    
    /* Some particles are hearts, some are circles */
    if (Math.random() > 0.7) {
      particle.style.borderRadius = '50% 50% 50% 0';
      particle.style.transform = 'rotate(-45deg)';
    }
    
    container.appendChild(particle);
    
    /* Remove and recreate after animation */
    particle.addEventListener('animationend', () => {
      particle.remove();
      createParticle();
    });
  }

  function init() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      createParticle();
    }
  }

  return { init };
})();
