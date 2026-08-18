/* ============================================================
   The Keepsake Box — background music player
   ============================================================ */

const Music = (() => {
  let audio = null;
  let isPlaying = false;
  let hasInteracted = false;

  function init() {
    audio = document.getElementById('bg-music');
    const toggle = document.getElementById('music-toggle');
    const label = document.getElementById('music-label');
    
    if (!audio || !toggle) return;
    
    /* Set initial volume */
    audio.volume = 0.3;
    
    /* Toggle play/pause */
    toggle.addEventListener('click', () => {
      if (!hasInteracted) {
        hasInteracted = true;
      }
      
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    });
    
    /* Auto-play on first interaction (browser policy) */
    const autoPlayHandler = () => {
      if (!hasInteracted) {
        hasInteracted = true;
        play();
      }
      document.removeEventListener('click', autoPlayHandler);
      document.removeEventListener('touchstart', autoPlayHandler);
    };
    
    document.addEventListener('click', autoPlayHandler, { once: true });
    document.addEventListener('touchstart', autoPlayHandler, { once: true });
  }

  function play() {
    if (!audio) return;
    
    audio.play().then(() => {
      isPlaying = true;
      updateUI();
    }).catch((err) => {
      console.log('Music autoplay blocked:', err);
      /* User needs to interact first */
    });
  }

  function pause() {
    if (!audio) return;
    audio.pause();
    isPlaying = false;
    updateUI();
  }

  function updateUI() {
    const toggle = document.getElementById('music-toggle');
    const label = document.getElementById('music-label');
    
    if (toggle) {
      toggle.classList.toggle('is-playing', isPlaying);
      toggle.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9835;';
    }
    
    if (label) {
      label.textContent = isPlaying ? 'now playing' : 'tap for music';
    }
  }

  function setVolume(vol) {
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, vol));
    }
  }

  return { init, play, pause, setVolume };
})();
