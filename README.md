# Pomodoro Timer

A lightweight, modern Pomodoro web app with customizable themes, calming ambient backgrounds, and an optional mini YouTube dock for focus music.

## Features
- Pomodoro workflow: Work, Short Break, Long Break, configurable cycles per round
- Start, Pause, Reset, and Skip controls
- Live progress bar and document title updates
- Settings persisted in localStorage
- Theme system with multiple presets: Violet, Tomato, Ocean, Light, Forest, Sunset, Rose, Midnight
- Calming motion backgrounds with adjustable intensity and speed (respects reduced motion)
- Optional mini YouTube dock (play/pause only)


## Usage
1. Click Start to begin a session. The button toggles between Start/Pause.
2. Use Reset to reset the current timer, or Skip to move to the next mode.
3. Open Settings (gear icon) to customize:
   - Work/Short/Long durations
   - Cycles per round
   - Desktop notifications
   - Theme (color palette and background)
   - Ambient Intensity and Speed (background motion)

## YouTube Dock
- A mini player is docked at the bottom-right.
- Loads the lo-fi stream: `https://www.youtube.com/watch?v=jfKfPfyJRdk`
- Play/Pause is supported; seeking is not enforced to avoid playback issues.
- Autoplay is disabled by default to comply with browser policies—click Play to start audio.

If you don’t hear sound:
- Ensure you’re running over `http://` (e.g., local server), not `file://`.
- Click the Play button once to satisfy autoplay policies.
- Check system/tab volume and any OS focus modes.

## Tech Stack
- HTML, CSS, JavaScript (no frameworks)
- LocalStorage for persistence
- YouTube IFrame API for the optional music dock

## Development
- Main entry: `index.html`
- App logic: `app.js`
- Styles: `styles.css`

Linting is minimal; please match existing formatting and style conventions.

## License
MIT


