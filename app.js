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
  alarmSound: "bell",
  alarmVolume: 0.5,
  autoStart: false,
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
    this.endAt = null; // epoch ms when the current session should end (when running)
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
    // Ensure UI reflects new settings immediately even when paused
    this._emit(true);
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
    // If resuming, remainingMs holds the correct remaining. Compute absolute end time.
    this.endAt = now + this.remainingMs;
    this._lastTick = now;
    this._ensureTicker();
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    // On pause, lock in the remaining time based on endAt
    if (this.endAt !== null) {
      const now = Date.now();
      this.remainingMs = Math.max(0, this.endAt - now);
    }
    this.endAt = null;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  reset() {
    this.pause();
    this.remainingMs = this._modeToMs(this.mode);
    this.startedAt = null;
    this.endAt = null;
  }

  skip() {
    this._advanceMode();
  }

  _ensureTicker() {
    if (this._intervalId !== null) return;
    this._intervalId = setInterval(() => {
      if (!this.isRunning) return;
      const now = Date.now();
      this._lastTick = now;
      // When running, compute remaining from absolute end time for accuracy
      if (this.endAt !== null) {
        this.remainingMs = Math.max(0, this.endAt - now);
      }
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
    
    // Auto-start next session if enabled
    const shouldAutoStart = this.settings.autoStart;
    if (shouldAutoStart) {
      const now = Date.now();
      this.isRunning = true;
      this.startedAt = now;
      this.endAt = now + this.remainingMs;
      this._ensureTicker();
    } else {
      this.isRunning = false;
      this.startedAt = null;
      this.endAt = null;
    }
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

// --- Enhanced alarm sounds using Web Audio (no assets needed) ---
function playAlarmSound(soundType = "bell", volume = 0.5) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);

    if (soundType === "bell") {
      // Pleasant bell sound with harmonics
      const times = [0, 0.15, 0.3];
      const freqs = [880, 1320, 1760];
      times.forEach((time, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freqs[i];
        o.type = "sine";
        o.connect(g);
        g.connect(masterGain);
        g.gain.setValueAtTime(0, ctx.currentTime + time);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.8);
        o.start(ctx.currentTime + time);
        o.stop(ctx.currentTime + time + 0.85);
      });
    } else if (soundType === "chime") {
      // Soft chime with multiple tones
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = "sine";
        o.connect(g);
        g.connect(masterGain);
        const startTime = ctx.currentTime + (i * 0.1);
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
        o.start(startTime);
        o.stop(startTime + 1.3);
      });
    } else if (soundType === "digital") {
      // Digital alarm sound
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 800;
        o.type = "square";
        o.connect(g);
        g.connect(masterGain);
        const startTime = ctx.currentTime + (i * 0.25);
        g.gain.setValueAtTime(0.15, startTime);
        g.gain.setValueAtTime(0, startTime + 0.15);
        o.start(startTime);
        o.stop(startTime + 0.15);
      }
    } else if (soundType === "soft") {
      // Gentle rising tone
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
      o.connect(g);
      g.connect(masterGain);
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.start();
      o.stop(ctx.currentTime + 0.85);
    } else if (soundType === "nature") {
      // Bird-like chirp
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(2000, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.05);
      o.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.15);
      o.connect(g);
      g.connect(masterGain);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start();
      o.stop(ctx.currentTime + 0.35);
      // Second chirp
      setTimeout(() => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = "sine";
        o2.frequency.setValueAtTime(2200, ctx.currentTime);
        o2.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.05);
        o2.connect(g2);
        g2.connect(masterGain);
        g2.gain.setValueAtTime(0.2, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        o2.start();
        o2.stop(ctx.currentTime + 0.3);
      }, 200);
    } else { // beep
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      o.connect(g);
      g.connect(masterGain);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

function beep() {
  playAlarmSound(currentSettings.alarmSound, currentSettings.alarmVolume);
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
const timeDisplay = document.getElementById("time-display");
const modeButtons = document.querySelectorAll('.timer__mode-btn');
const startPauseBtn = document.getElementById("start-pause");
const resetBtn = document.getElementById("reset");
const skipBtn = document.getElementById("skip");
const progressEl = document.getElementById("progress");
const cycleCountEl = document.getElementById("cycle-count");
const cyclesPerRoundEl = document.getElementById("cycles-per-round");
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
const settingAlarmSound = document.getElementById("setting-alarm-sound");
const settingAlarmVolume = document.getElementById("setting-alarm-volume");
const volumeDisplay = document.getElementById("volume-display");
const settingAutoStart = document.getElementById("setting-auto-start");
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
settingAlarmSound.value = String(currentSettings.alarmSound || "bell");
settingAlarmVolume.value = String(currentSettings.alarmVolume ?? 0.5);
volumeDisplay.textContent = Math.round((currentSettings.alarmVolume ?? 0.5) * 100) + "%";
settingAutoStart.checked = Boolean(currentSettings.autoStart);

// Update volume display on slider change
settingAlarmVolume.addEventListener("input", (e) => {
  const vol = Number(e.target.value);
  volumeDisplay.textContent = Math.round(vol * 100) + "%";
});

// Preview alarm sound on selection change
settingAlarmSound.addEventListener("change", (e) => {
  playAlarmSound(e.target.value, Number(settingAlarmVolume.value));
});

function applyTheme(theme) {
  const allowed = new Set(["violet", "tomato", "ocean", "light", "forest", "sunset", "rose", "midnight"]);
  const t = allowed.has(theme) ? theme : "violet";
  
  // Remove old theme attribute
  document.body.removeAttribute("data-theme");
  
  // Force reflow to ensure styles are recalculated (critical for mobile)
  void document.body.offsetHeight;
  
  // Apply new theme
  document.body.setAttribute("data-theme", t);
  
  // Force one more reflow to ensure mobile browsers apply the new styles
  void document.body.offsetHeight;
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
  timeDisplay.textContent = formatMs(state.remainingMs);
  startPauseBtn.textContent = state.isRunning ? "Pause" : "Start";
  cycleCountEl.textContent = String(state.cycleInRound);
  cyclesPerRoundEl.textContent = String(currentSettings.cyclesPerRound);

  // Update active mode button
  modeButtons.forEach(btn => {
    const btnMode = btn.getAttribute('data-mode');
    if (btnMode === state.mode) {
      btn.classList.add('timer__mode-btn--active');
    } else {
      btn.classList.remove('timer__mode-btn--active');
    }
  });

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

// Mode button click handlers
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetMode = btn.getAttribute('data-mode');
    
    // Stop the timer if running
    if (timer.isRunning) {
      timer.pause();
    }
    
    // Switch to the selected mode
    timer.mode = targetMode;
    timer.remainingMs = timer._modeToMs(targetMode);
    timer.startedAt = null;
    timer.endAt = null;
    
    // Update UI
    timer._emit(true);
  });
});

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

// Tab switching for settings sidebar
const settingsTabs = document.querySelectorAll('.settings__tab');
const settingsPanels = document.querySelectorAll('.settings__panel');

settingsTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetPanel = tab.getAttribute('data-tab');
    
    // Remove active class from all tabs and panels
    settingsTabs.forEach(t => t.classList.remove('settings__tab--active'));
    settingsPanels.forEach(p => p.classList.remove('settings__panel--active'));
    
    // Add active class to clicked tab and corresponding panel
    tab.classList.add('settings__tab--active');
    const activePanel = document.querySelector(`[data-panel="${targetPanel}"]`);
    if (activePanel) {
      activePanel.classList.add('settings__panel--active');
    }
  });
});

// Reset to defaults button
const resetSettingsBtn = document.getElementById("reset-settings");
resetSettingsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  
  // Reset all inputs to default values
  settingWork.value = String(defaultSettings.workMinutes);
  settingShort.value = String(defaultSettings.shortMinutes);
  settingLong.value = String(defaultSettings.longMinutes);
  settingCycles.value = String(defaultSettings.cyclesPerRound);
  settingNotify.checked = Boolean(defaultSettings.notifications);
  settingTheme.value = String(defaultSettings.theme);
  settingAmbientIntensity.value = String(defaultSettings.ambientIntensity);
  settingAmbientSpeed.value = String(defaultSettings.ambientSpeed);
  settingAlarmSound.value = String(defaultSettings.alarmSound);
  settingAlarmVolume.value = String(defaultSettings.alarmVolume);
  volumeDisplay.textContent = Math.round(defaultSettings.alarmVolume * 100) + "%";
  settingAutoStart.checked = Boolean(defaultSettings.autoStart);
  
  // Save and apply defaults
  currentSettings = { ...defaultSettings };
  saveSettings(currentSettings);
  applyTheme(currentSettings.theme);
  applyAmbient(currentSettings.ambientIntensity, currentSettings.ambientSpeed);
  timer.setSettings(currentSettings);
  timer._emit(true);
  
  // Play preview sound with default settings
  playAlarmSound(currentSettings.alarmSound, currentSettings.alarmVolume);
  
  // Close settings dialog
  settingsDialog.close();
});

// Extract save logic into reusable function
function saveSettingsChanges() {
  const next = {
    workMinutes: clampInt(settingWork.value, 1, 180, defaultSettings.workMinutes),
    shortMinutes: clampInt(settingShort.value, 1, 60, defaultSettings.shortMinutes),
    longMinutes: clampInt(settingLong.value, 1, 60, defaultSettings.longMinutes),
    cyclesPerRound: clampInt(settingCycles.value, 1, 12, defaultSettings.cyclesPerRound),
    notifications: Boolean(settingNotify.checked),
    theme: String(settingTheme.value || "violet"),
    ambientIntensity: Number(settingAmbientIntensity.value ?? defaultSettings.ambientIntensity),
    ambientSpeed: Number(settingAmbientSpeed.value ?? defaultSettings.ambientSpeed),
    alarmSound: String(settingAlarmSound.value || "bell"),
    alarmVolume: Number(settingAlarmVolume.value ?? 0.5),
    autoStart: Boolean(settingAutoStart.checked),
  };
  currentSettings = next;
  saveSettings(next);
  applyTheme(next.theme);
  applyAmbient(next.ambientIntensity, next.ambientSpeed);
  timer.setSettings(next);
  // Force an immediate repaint to reflect new durations
  timer._emit(true);
  settingsDialog.close();
}

// Save button click handler
saveSettingsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  saveSettingsChanges();
});

// Form submit handler (triggered by Enter key)
const settingsForm = settingsDialog.querySelector('form');
settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveSettingsChanges();
});

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
