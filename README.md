# Pomodoro Timer

A beautiful, modern Pomodoro web app with theme-based UI, customizable alarm sounds, calming ambient backgrounds, and an integrated lo-fi music player for focused work sessions.

## Features

### ⏱️ Timer Functionality
- **Pomodoro workflow**: Work sessions, Short Breaks, and Long Breaks with configurable cycles
- **Full controls**: Start, Pause, Reset, and Skip buttons
- **Live updates**: Animated progress bar and real-time document title
- **Auto-start option**: Automatically begin the next session when one completes
- **Session tracking**: Visual cycle and round counters

### 🎨 Themes & Appearance
- **8 stunning themes**: Violet (default), Tomato, Ocean, Light, Forest, Sunset, Rose, Midnight
- **Theme-matched UI**: Timer boxes, settings dialog, and YouTube player adapt to your chosen theme
- **Calming ambient animations**: Configurable intensity and speed for background motion effects
- **Dark mode optimized**: All themes designed for comfortable extended use
- **Respects reduced motion**: Automatically disables animations if user prefers reduced motion

### 🔔 Sound & Notifications
- **6 alarm sound options**:
  - Bell - Pleasant harmonics
  - Chime - Soft musical tones (C-E-G chord)
  - Digital - Classic digital alarm
  - Soft Alarm - Gentle rising tone
  - Nature - Bird-like chirps
  - Simple Beep - Minimal single tone
- **Volume control**: Adjustable alarm volume with live preview
- **Desktop notifications**: Browser notifications when timer completes (requires permission)
- **No external audio files**: All sounds generated with Web Audio API

### ⚙️ Settings
Modern sidebar navigation with organized tabs:
- **General**: Theme selection, ambient controls, notifications, auto-start
- **Timers**: Pomodoro, Short Break, and Long Break durations, Cycles per round
- **Sounds**: Alarm sound selection and volume control with instant preview
- **Reset to defaults**: One-click restore of all original settings

All settings are **automatically saved** to localStorage and persist across sessions.

## Usage

### Getting Started
1. **Start a session**: Click the "Start" button to begin your Pomodoro
2. **Pause/Resume**: Click the button again to pause or resume
3. **Reset**: Reset the current timer to its starting duration
4. **Skip**: Jump to the next session (Work → Break or Break → Work)

### Customizing Settings
1. Click the **⚙️ gear icon** in the top-right to open settings
2. Navigate between **General**, **Timers**, and **Sounds** tabs
3. Adjust your preferences:
   - Set custom work and break durations
   - Choose your favorite theme and alarm sound
   - Enable auto-start for continuous sessions
   - Fine-tune ambient animations
4. Click **"Save changes"** to apply
5. Use **"Reset to defaults"** to instantly restore all original settings

### Timer Display
- **Mode indicator**: Shows current mode (Work, Short Break, or Long Break)
- **Large countdown**: Displays remaining time in MM:SS format
- **Progress bar**: Visual indicator of session progress
- **Session info**: Current cycle number and round tracking

## 🎵 YouTube Music Dock
A mini lo-fi music player is docked at the bottom-right corner for ambient study music:
- **Pre-loaded stream**: Lofi hip hop radio - beats to relax/study to
- **Simple controls**: Play/Pause button (no seeking to avoid interruptions)
- **Theme-matched design**: Player styling adapts to your selected theme
- **Autoplay disabled**: Click Play to start (complies with browser policies)
- **Responsive**: Adjusts size on mobile devices

**Troubleshooting audio**:
- Serve over `http://` (local server), not `file://`
- Click Play button to satisfy browser autoplay policies
- Check system/tab volume and browser permissions

## 📱 Mobile Responsive
- **Tablet mode**: Settings tabs move to horizontal top navigation
- **Phone mode**: Full-screen settings dialog, stacked timer inputs
- **Touch-optimized**: Larger buttons and controls for easy tapping
- **Safe areas**: Respects device notches and insets
- **Smooth scrolling**: Optimized performance on mobile browsers

## 🛠️ Tech Stack
- **Pure HTML, CSS, JavaScript** - No frameworks or dependencies
- **Web Audio API** - Dynamic alarm sound generation
- **LocalStorage API** - Settings persistence
- **Notification API** - Desktop notifications support
- **YouTube IFrame API** - Embedded music player
- **CSS Grid & Flexbox** - Modern, responsive layouts
- **CSS Custom Properties** - Dynamic theming system

## 💻 Browser Compatibility
- **Chrome/Edge** (recommended): Full feature support
- **Firefox**: Full feature support
- **Safari**: Full support (iOS Safari includes mobile optimizations)
- **Notifications**: Requires user permission on first use
- **Audio**: Requires user interaction (click) before playing

## 📁 Development
```
pomodoro/
├── index.html        # Main HTML structure
├── app.js           # Timer logic, settings, and audio
├── styles.css       # All styles including themes
└── README.md
```

**Key Architecture**:
- `PomodoroTimer` class handles timer state and mode transitions
- Settings organized into tabs: General, Timers, Sounds
- Theme system uses CSS custom properties with `data-theme` attributes
- All alarm sounds generated programmatically (no audio files needed)

## ✨ Highlights
- **No build step**: Open `index.html` directly or serve with any static server
- **Lightweight**: ~15KB CSS, ~14KB JS (unminified)
- **Privacy-focused**: All data stored locally, no external tracking
- **Offline-ready**: Works without internet (except YouTube player)
- **Accessible**: Proper ARIA labels, keyboard navigation, screen reader support

## 🎯 Use Cases
- **Students**: Study sessions with break reminders
- **Developers**: Focused coding sprints
- **Designers**: Creative work sessions
- **Remote workers**: Time-boxed tasks with ambient music
- **Anyone**: Who wants to improve focus and productivity

## 🙏 Credits
Inspired by aesthetic Pomodoro timers and modern productivity tools. Built with attention to UX, accessibility, and visual design.

## 📄 License
MIT - Feel free to use, modify, and distribute


