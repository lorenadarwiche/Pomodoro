/*
  Minimal Pomodoro timer with work/short/long cycles and basic settings.
  Persists settings in localStorage and uses Notification API when enabled.
*/

const storageKey = {
  settings: "pomodoro:settings:v1",
};

const defaultSettings = {
  workMinutes: 25,
  shortMinutes: 5,
  longMinutes: 15,
  cyclesPerRound: 4,
  notifications: false,
  theme: "violet",
  ambientIntensity: 0.12,
  ambientSpeed: 1,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(storageKey.settings);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  localStorage.setItem(storageKey.settings, JSON.stringify(settings));
}

const Mode = Object.freeze({
  Work: "Work",
  Short: "Short Break",
  Long: "Long Break",
});

class PomodoroTimer {
  constructor(settings) {
    this.settings = settings;
    this.mode = Mode.Work;
    this.cycleInRound = 1;
    this.round = 1;
    this.isRunning = false;
    this.startedAt = null; // epoch ms when started or resumed
    this.remainingMs = this._modeToMs(this.mode);
    this._intervalId = null;
    this._lastTick = null;
  }

  setSettings(nextSettings) {
    const preservedRunning = this.isRunning;
    this.pause();
    this.settings = nextSettings;
    // Re-initialize current mode duration but keep progress only if running was paused? Simpler: reset time for clarity
    this.remainingMs = this._modeToMs(this.mode);
    if (preservedRunning) this.start();
  }

  _modeToMs(mode) {
    const m = mode === Mode.Work
      ? this.settings.workMinutes
      : mode === Mode.Short
        ? this.settings.shortMinutes
        : this.settings.longMinutes;
    return m * 60 * 1000;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const now = Date.now();
    this.startedAt = now;
    this._lastTick = now;
    this._ensureTicker();
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  reset() {
    this.pause();
    this.remainingMs = this._modeToMs(this.mode);
  }

  skip() {
    this._advanceMode();
  }

  _ensureTicker() {
    if (this._intervalId !== null) return;
    this._intervalId = setInterval(() => {
      if (!this.isRunning) return;
      const now = Date.now();
      const delta = Math.max(0, now - this._lastTick);
      this._lastTick = now;
      this.remainingMs = Math.max(0, this.remainingMs - delta);
      if (this.remainingMs === 0) {
        this._onComplete();
        return;
      }
      this._emit();
    }, 250);
  }

  _onComplete() {
    this.pause();
    beep();
    notify(`${this.mode} completed`, "Time to switch!");
    this._advanceMode();
  }

  _advanceMode() {
    // Advance cycle/mode order: Work -> (Short or Long) -> Work ...
    if (this.mode === Mode.Work) {
      const isEndOfRound = this.cycleInRound >= this.settings.cyclesPerRound;
      this.mode = isEndOfRound ? Mode.Long : Mode.Short;
      if (isEndOfRound) {
        this.cycleInRound = 1;
        this.round += 1;
      } else {
        this.cycleInRound += 1;
      }
    } else {
      this.mode = Mode.Work;
    }
    this.remainingMs = this._modeToMs(this.mode);
    this._emit(true);
  }

  onChange(listener) {
    this._listener = listener;
  }

  _emit(modeChanged = false) {
    if (this._listener) this._listener({
      mode: this.mode,
      remainingMs: this.remainingMs,
      cycleInRound: this.cycleInRound,
      round: this.round,
      totalMs: this._modeToMs(this.mode),
      isRunning: this.isRunning,
      modeChanged,
    });
  }
}

// --- Simple beep using Web Audio (no assets needed) ---
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {}
}

async function notify(title, body) {
  try {
    if (!currentSettings.notifications) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
      return;
    }
    if (Notification.permission !== "denied") {
      const res = await Notification.requestPermission();
      if (res === "granted") new Notification(title, { body });
    }
  } catch {}
}

// --- DOM wiring ---
const modeLabel = document.getElementById("mode-label");
const timeDisplay = document.getElementById("time-display");
const startPauseBtn = document.getElementById("start-pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const progressEl = document.getElementById("progress");
const cycleCountEl = document.getElementById("cycle-count");
const cyclesPerRoundEl = document.getElementById("cycles-per-round");
const roundCountEl = document.getElementById("round-count");
const openSettingsBtn = document.getElementById("open-settings");
const settingsDialog = document.getElementById("settings-dialog");
const settingWork = document.getElementById("setting-work");
const settingShort = document.getElementById("setting-short");
const settingLong = document.getElementById("setting-long");
const settingCycles = document.getElementById("setting-cycles");
const settingNotify = document.getElementById("setting-notify");
const settingTheme = document.getElementById("setting-theme");
const settingAmbientIntensity = document.getElementById("setting-ambient-intensity");
const settingAmbientSpeed = document.getElementById("setting-ambient-speed");
const saveSettingsBtn = document.getElementById("save-settings");
const ytPlayPauseBtn = document.getElementById("yt-play-pause");
const ytPlayerContainer = document.getElementById("yt-player");

let currentSettings = loadSettings();
cyclesPerRoundEl.textContent = String(currentSettings.cyclesPerRound);

// Initialize inputs
settingWork.value = String(currentSettings.workMinutes);
settingShort.value = String(currentSettings.shortMinutes);
settingLong.value = String(currentSettings.longMinutes);
settingCycles.value = String(currentSettings.cyclesPerRound);
settingNotify.checked = Boolean(currentSettings.notifications);
settingTheme.value = String(currentSettings.theme || "violet");
settingAmbientIntensity.value = String(currentSettings.ambientIntensity ?? defaultSettings.ambientIntensity);
settingAmbientSpeed.value = String(currentSettings.ambientSpeed ?? defaultSettings.ambientSpeed);

function applyTheme(theme) {
  const allowed = new Set(["violet", "tomato", "ocean", "light", "forest", "sunset", "rose", "midnight"]);
  const t = allowed.has(theme) ? theme : "violet";
  document.body.setAttribute("data-theme", t);
}

function applyAmbient(intensity, speed) {
  const clampedIntensity = Math.max(0, Math.min(1, Number(intensity)));
  const clampedSpeed = Math.max(0.5, Math.min(3, Number(speed)));
  document.documentElement.style.setProperty("--ambient-intensity", String(clampedIntensity));
  document.documentElement.style.setProperty("--ambient-speed", String(clampedSpeed));
}

// Apply theme on load
applyTheme(currentSettings.theme);
applyAmbient(currentSettings.ambientIntensity, currentSettings.ambientSpeed);

const timer = new PomodoroTimer(currentSettings);

function formatMs(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function render(state) {
  modeLabel.textContent = state.mode;
  timeDisplay.textContent = formatMs(state.remainingMs);
  startPauseBtn.textContent = state.isRunning ? "Pause" : "Start";
  cycleCountEl.textContent = String(state.cycleInRound);
  roundCountEl.textContent = String(state.round);
  cyclesPerRoundEl.textContent = String(currentSettings.cyclesPerRound);

  const pct = 1 - state.remainingMs / state.totalMs;
  progressEl.style.setProperty("--pct", String(pct));
  // Animate bar by updating transform on the ::after rule via CSS variable
  const progress = Math.max(0, Math.min(1, pct));
  progressEl.style.setProperty("--progress", `${progress}`);
  // Keep DOM writes minimal to reduce chance of layout issues across browsers
  progressEl.style.setProperty("position", "relative");
  progressEl.style.setProperty("overflow", "hidden");

  // Update document title
  if (state.modeChanged) document.title = `${state.mode} — ${formatMs(state.remainingMs)}`;
  else document.title = `${formatMs(state.remainingMs)} • Pomodoro`;
}

// Simple CSS-driven progress animation via style injection
const style = document.createElement('style');
style.textContent = `
.timer__progress::after {
  transform: translateX(calc(-100% + (var(--progress, 0) * 100%)));
  transition: transform 0.2s linear;
}
`;
document.head.appendChild(style);

// Initial paint
timer.onChange(render);
timer._emit(true);

// --- YouTube mini player integration ---
let ytPlayer = null;
let ytReady = false;
let ytUserInteracted = false;

function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) { onYouTubeIframeAPIReady(); return; }
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function() {
  ytReady = true;
  ytPlayer = new YT.Player(ytPlayerContainer, {
    width: '100%',
    height: '100%',
    videoId: 'jfKfPfyJRdk', // lofi stream
    playerVars: {
      autoplay: 0,
      mute: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      iv_load_policy: 3,
    },
    events: {
      onReady: onYTReady,
      onStateChange: onYTStateChange,
    }
  });
};

function onYTReady() {
  // Start in paused state; user click will start playback with audio
  ytPlayPauseBtn.textContent = 'Play';
}

function onYTStateChange(e) {
  // Keep button label in sync
  if (e.data === YT.PlayerState.PLAYING) ytPlayPauseBtn.textContent = 'Pause';
  if (e.data === YT.PlayerState.PAUSED) ytPlayPauseBtn.textContent = 'Play';
  // If we've had a user gesture and audio is muted, force unmute
  try {
    if (ytUserInteracted && typeof ytPlayer.isMuted === 'function' && ytPlayer.isMuted()) {
      ytPlayer.unMute();
      ytPlayer.setVolume(60);
    }
  } catch {}
}

// Note: We don't enforce anti-seek polling for live/video to avoid loops.

if (ytPlayPauseBtn) {
  ytPlayPauseBtn.addEventListener('click', () => {
    if (!ytPlayer || !ytReady) return;
    try {
      const state = ytPlayer.getPlayerState();
      // User gesture ensures audio can play
      ytUserInteracted = true;
      try { ytPlayer.unMute(); ytPlayer.setVolume(70); } catch {}
      if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED || state === YT.PlayerState.CUED) {
        ytPlayer.playVideo();
        ytPlayPauseBtn.textContent = 'Pause';
      } else {
        ytPlayer.pauseVideo();
        ytPlayPauseBtn.textContent = 'Play';
      }
    } catch {}
  });
}

// Kick off API load
loadYouTubeAPI();

startPauseBtn.addEventListener("click", () => {
  if (timer.isRunning) timer.pause(); else timer.start();
  timer._emit();
});

resetBtn.addEventListener("click", () => {
  timer.reset();
  timer._emit();
});

skipBtn.addEventListener("click", () => {
  timer.skip();
});

openSettingsBtn.addEventListener("click", () => settingsDialog.showModal());

saveSettingsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const next = {
    workMinutes: clampInt(settingWork.value, 1, 180, defaultSettings.workMinutes),
    shortMinutes: clampInt(settingShort.value, 1, 60, defaultSettings.shortMinutes),
    longMinutes: clampInt(settingLong.value, 1, 60, defaultSettings.longMinutes),
    cyclesPerRound: clampInt(settingCycles.value, 1, 12, defaultSettings.cyclesPerRound),
    notifications: Boolean(settingNotify.checked),
    theme: String(settingTheme.value || "violet"),
    ambientIntensity: Number(settingAmbientIntensity.value ?? defaultSettings.ambientIntensity),
    ambientSpeed: Number(settingAmbientSpeed.value ?? defaultSettings.ambientSpeed),
  };
  currentSettings = next;
  saveSettings(next);
  applyTheme(next.theme);
  applyAmbient(next.ambientIntensity, next.ambientSpeed);
  timer.setSettings(next);
  settingsDialog.close();
});

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
