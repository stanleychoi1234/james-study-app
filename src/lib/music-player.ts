/**
 * MP3 music player for Pomodoro and Breathe pages.
 * Uses HTML5 Audio with crossfade looping and fade in/out.
 */

export interface MusicTrack {
  name: string;
  emoji: string;
  file: string; // path relative to /public
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    name: "Spring Canopy",
    emoji: "\u{1F33F}",
    file: "/music/Beneath_the_Spring_Canopy.mp3",
  },
  {
    name: "Morning Mist",
    emoji: "\u{1F32B}\u{FE0F}",
    file: "/music/Morning_Mist_Over_the_Stream.mp3",
  },
  {
    name: "Bamboo Mist",
    emoji: "\u{1F38D}",
    file: "/music/bamboo_in_the_mist.mp3",
  },
];

const FADE_DURATION = 2000; // 2 seconds fade in/out
const CROSSFADE_BEFORE_END = 3000; // Start crossfade 3s before track ends

/**
 * Creates a music player instance that handles:
 * - Fade in on start
 * - Endless seamless looping with crossfade
 * - Fade out on stop
 * - Volume control
 */
export function createMusicPlayer() {
  let currentAudio: HTMLAudioElement | null = null;
  let nextAudio: HTMLAudioElement | null = null;
  let fadeInterval: ReturnType<typeof setInterval> | null = null;
  let loopTimeout: ReturnType<typeof setTimeout> | null = null;
  let targetVolume = 0.5;
  let isPlaying = false;
  let currentTrackFile = "";

  function clearTimers() {
    if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
    if (loopTimeout) { clearTimeout(loopTimeout); loopTimeout = null; }
  }

  function fadeIn(audio: HTMLAudioElement, duration: number, toVolume: number) {
    audio.volume = 0;
    const steps = 40;
    const stepTime = duration / steps;
    const stepVolume = toVolume / steps;
    let step = 0;

    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      step++;
      audio.volume = Math.min(toVolume, stepVolume * step);
      if (step >= steps) {
        audio.volume = toVolume;
        if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
      }
    }, stepTime);
  }

  function fadeOut(audio: HTMLAudioElement, duration: number, onComplete?: () => void) {
    const startVolume = audio.volume;
    if (startVolume <= 0) {
      onComplete?.();
      return;
    }
    const steps = 40;
    const stepTime = duration / steps;
    const stepVolume = startVolume / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVolume - stepVolume * step);
      if (step >= steps) {
        audio.volume = 0;
        clearInterval(interval);
        audio.pause();
        onComplete?.();
      }
    }, stepTime);
  }

  function setupLoop(audio: HTMLAudioElement, trackFile: string) {
    // When the track is near the end, start a crossfade to a new instance
    function checkLoop() {
      if (!isPlaying || !audio || audio.paused) return;

      const remaining = (audio.duration - audio.currentTime) * 1000;

      if (remaining < CROSSFADE_BEFORE_END && remaining > 0 && !nextAudio) {
        // Start crossfade: create a new audio element for the same track
        nextAudio = new Audio(trackFile);
        nextAudio.volume = 0;
        nextAudio.play().then(() => {
          fadeIn(nextAudio!, FADE_DURATION, targetVolume);
          fadeOut(audio, FADE_DURATION, () => {
            // Swap: the new audio becomes current
            currentAudio = nextAudio;
            nextAudio = null;
            // Setup loop check on the new audio
            if (currentAudio) setupLoop(currentAudio, trackFile);
          });
        }).catch(() => {
          // Fallback: just loop the current audio
          nextAudio = null;
          audio.currentTime = 0;
        });
      }

      if (isPlaying) {
        loopTimeout = setTimeout(checkLoop, 500);
      }
    }

    // Also handle the 'ended' event as a fallback
    audio.onended = () => {
      if (!isPlaying) return;
      if (!nextAudio) {
        // Simple restart if crossfade didn't trigger
        audio.currentTime = 0;
        audio.volume = targetVolume;
        audio.play().catch(() => {});
        setupLoop(audio, trackFile);
      }
    };

    // Start checking
    if (loopTimeout) clearTimeout(loopTimeout);
    loopTimeout = setTimeout(checkLoop, 1000);
  }

  return {
    /**
     * Start playing a track with fade-in.
     * If already playing a different track, crossfade to it.
     */
    play(trackFile: string, volume: number = 0.5) {
      targetVolume = volume;

      // If already playing the same track, just adjust volume
      if (isPlaying && currentAudio && currentTrackFile === trackFile) {
        currentAudio.volume = targetVolume;
        return;
      }

      // If playing a different track, fade out the old one
      if (currentAudio && isPlaying) {
        const oldAudio = currentAudio;
        fadeOut(oldAudio, FADE_DURATION, () => {
          oldAudio.src = "";
        });
      }

      clearTimers();

      // Create new audio
      currentAudio = new Audio(trackFile);
      currentTrackFile = trackFile;
      isPlaying = true;

      currentAudio.play().then(() => {
        fadeIn(currentAudio!, FADE_DURATION, targetVolume);
        setupLoop(currentAudio!, trackFile);
      }).catch((err) => {
        console.warn("Music play failed:", err);
        isPlaying = false;
      });
    },

    /**
     * Stop playing with fade-out.
     */
    stop() {
      isPlaying = false;
      clearTimers();

      if (nextAudio) {
        try { nextAudio.pause(); nextAudio.src = ""; } catch {}
        nextAudio = null;
      }

      if (currentAudio) {
        fadeOut(currentAudio, FADE_DURATION, () => {
          if (currentAudio) {
            currentAudio.src = "";
            currentAudio = null;
          }
          currentTrackFile = "";
        });
      }
    },

    /**
     * Set volume (0-1) with smooth transition.
     */
    setVolume(vol: number) {
      targetVolume = Math.max(0, Math.min(1, vol));
      if (currentAudio && isPlaying) {
        currentAudio.volume = targetVolume;
      }
    },

    /**
     * Check if currently playing.
     */
    get playing() {
      return isPlaying;
    },

    /**
     * Force cleanup on unmount.
     */
    destroy() {
      isPlaying = false;
      clearTimers();
      if (nextAudio) { try { nextAudio.pause(); nextAudio.src = ""; } catch {} nextAudio = null; }
      if (currentAudio) { try { currentAudio.pause(); currentAudio.src = ""; } catch {} currentAudio = null; }
      currentTrackFile = "";
    },
  };
}
