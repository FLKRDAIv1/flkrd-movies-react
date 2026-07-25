// flkrd-subtitle-extension/content.js
// Content script that runs inside player iframe contexts to detect HTML5 <video> elements
// and inject active Kurdish WebVTT subtitle tracks directly into the player.

(function () {
  console.log("[FLKRD EXTENSION] Initialized in frame context:", window.location.href);

  function injectSubtitleTrack(videoEl, subUrl) {
    if (!videoEl || !subUrl) return;

    // Check if track already exists
    let existingTrack = videoEl.querySelector('track[label="Kurdish Sorani (Plugin)"]');
    if (existingTrack) {
      existingTrack.src = subUrl;
      return;
    }

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'Kurdish Sorani (Plugin)';
    track.srclang = 'ku';
    track.src = subUrl;
    track.default = true;

    videoEl.appendChild(track);
    if (videoEl.textTracks && videoEl.textTracks.length > 0) {
      for (let i = 0; i < videoEl.textTracks.length; i++) {
        const t = videoEl.textTracks[i];
        if (t.label.includes('Kurdish')) {
          t.mode = 'showing';
        }
      }
    }
    console.log("[FLKRD EXTENSION] Successfully injected Kurdish track into <video>:", subUrl);
  }

  // Extract subtitle URL from frame URL query params
  function checkUrlParamsAndInject() {
    const urlParams = new URLSearchParams(window.location.search);
    const subUrl = urlParams.get('sub') || urlParams.get('sub_file') || urlParams.get('subtitles');

    if (subUrl) {
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => injectSubtitleTrack(v, subUrl));
    }
  }

  // Observe DOM for dynamic video element creation
  const observer = new MutationObserver(() => {
    checkUrlParamsAndInject();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  checkUrlParamsAndInject();
})();
