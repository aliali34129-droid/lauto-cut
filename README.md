# 🎬 AutoTube Studio — AI YouTube Automation & Scene-Sync Video Editor

> **Professional CapCut-style web video editor powered by Gemini AI.** Automatically synchronizes images and visuals scene-by-scene to voiceover cadence, with trending dynamic captions, multi-track magnetic timeline, Ken Burns camera motion, and HD video export.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.8_Flash-orange.svg)](https://aistudio.google.com)

---

## ✨ Key Features

### 🎞️ 1. Multi-Track CapCut-Style Magnetic Timeline
- **Multi-Track Editing**: Dedicated tracks for **Dynamic Captions**, **Video/Images filmstrip**, **Voiceover narration**, and **Background Music (BGM)**.
- **Silky-Smooth 60 FPS Playhead**: Zero-lag scrubbing and synchronized playback needle using high-frequency microsecond events.
- **Frame-Accurate Split (Scissors)**: Split any video clip or image right at the playhead position with automatic scene re-indexing.
- **Drag-to-Trim Handles**: Adjust clip duration smoothly from left or right handles with real-time second badges.

### ⚡ 2. Multi-Clip Selection & Batch Operations
- **Select All Clips (`Ctrl+A` / `Cmd+A`)**: Instant selection of all clips across the entire timeline with one click or shortcut.
- **Multi-Select Toggle (`Shift+Click` / `Ctrl+Click`)**: Select specific multiple clips to batch edit.
- **Floating Batch Action Bar**:
  - **Batch Duration**: Preset buttons (`2.0s`, `3.0s`, `4.0s`, `5.0s`) plus custom duration numeric input with **Set** button.
  - **Batch Camera Motion**: Apply Ken Burns effects (`Zoom In`, `Zoom Out`, `Pan Left`, `Pan Right`, `Float`, `None`) across all selected clips simultaneously.
  - **Batch Duplicate (`Copy`)**: Clone selected clips to extend your video instantly.
  - **Batch Delete (`Delete` / `Backspace`)**: Remove multiple selected clips with safe fallback to prevent empty timeline crashes.
  - **Clear Selection (`Esc`)**: Instantly clear selection.

### 🤖 3. Gemini AI Director & Smart Voiceover Auto-Sync
- **Script-to-Video Breakdown**: Paste your YouTube script, and Gemini 3.8 Flash automatically generates visual prompts, scenes, and narration beats.
- **Intelligent Cadence Matching**: Perfectly aligns visual image durations to match the exact duration of your voiceover audio.
- **Voiceover TTS Generation**: Built-in speech synthesis for instant narration generation.
- **Background Music Engine**: Royalty-free ambient soundtracks with volume slider and ducking.

### ✍️ 4. Trending Dynamic Captions (CapCut / Hormozi Style)
- **Word-by-Word Kinetic Animation**: Active words highlight dynamically with color scaling and glow effects.
- **Style Presets**:
  - **Hormozi Pop**: Bold yellow text with high-contrast black border.
  - **Neon Cyberpunk**: Glowing cyan/magenta typography.
  - **Minimal Box**: Clean dark pill background with crisp white typography.
  - **Classic Subtitle**: Standard YouTube documentary subtitle format.
- **Timeline Caption Editor**: Double-click any caption chunk on the timeline to edit text or timing instantly.

### 🎥 5. Cinematic Motion & Transitions
- **Ken Burns Dynamic Zoom**: Smooth pan and zoom on still images to keep retention high on YouTube.
- **Transitions**: Fade, Wipe, Zoom, and Slide between scene cuts.

### 🖥️ 6. Fullscreen HD Preview & Export
- **Fullscreen Theater Mode**: Preview your final video in full resolution without UI clutter.
- **Client-Side HD Rendering**: Canvas + Web Audio recorder for exporting standard MP4/WebM videos.
- **Project Save & Load**: Export and import your project files in JSON format.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause video preview |
| `Ctrl + A` / `Cmd + A` | **Select All** video clips on timeline |
| `Shift + Click` | Multi-select / toggle clip selection |
| `Delete` / `Backspace` | **Delete** selected clip(s) or caption |
| `Esc` | Deselect all clips |
| `S` | Split clip at current playhead |

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-username/autotube-studio.git
cd autotube-studio
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Add your free Google Gemini API key:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
PORT=3000
```
> 💡 Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). The application also includes intelligent local fallback if an API key is not yet provided.

### 4. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production
```bash
npm run build
npm start
```

---

## 📂 Project Structure

```
├── server.ts                  # Express server + Gemini AI integration endpoints
├── src/
│   ├── App.tsx                # Main editor state and application layout
│   ├── types/
│   │   └── editor.ts          # VideoProject, Scene, Caption, and Audio types
│   ├── services/
│   │   ├── geminiService.ts   # Client-side API calls for script breakdown & sync
│   │   ├── audioEngine.ts    # Web Audio API multi-track mixer & TTS
│   │   └── videoExporter.ts   # Canvas & MediaRecorder video renderer
│   └── components/
│       └── capcut/
│           ├── CapCutHeader.tsx       # Top bar (Export, Auto-Sync, Fullscreen, Demo)
│           ├── CapCutSidebar.tsx      # Tool tabs (Media, Captions, Audio, Transitions)
│           ├── CapCutDrawer.tsx       # Asset drawers, Script AI, caption styles
│           ├── CapCutMonitor.tsx      # Video canvas, Ken Burns motion, dynamic captions
│           ├── CapCutTimeline.tsx     # Multi-track timeline, multi-clip selection & batch bar
│           └── AiDirectorModal.tsx    # Gemini AI Director modal for script & voiceover sync
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion
- **Backend**: Node.js, Express, tsx
- **AI Models**: Google Gemini 3.8 Flash (`@google/genai`)
- **Audio/Video Processing**: HTML5 Canvas, Web Audio API, MediaStream Recording API

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
