> [!IMPORTANT]
> This codebase was written entirely by AI.

<p align="right">
  <a href="README.md"><kbd>English</kbd></a>
  <a href="README.zh-CN.md"><kbd>简体中文</kbd></a>
</p>

# ArchiveDesk

<!-- [![banner](_docs/img/banner.svg)](https://github.com/YOUR_USERNAME/ArchiveDesk) -->

[![Release](https://img.shields.io/github/release/MoShuYG/ArchiveDesk.svg)](https://github.com/MoShuYG/ArchiveDesk/releases)
[![Download](https://img.shields.io/github/downloads/MoShuYG/ArchiveDesk/total.svg)](https://github.com/MoShuYG/ArchiveDesk/releases)
[![License](https://img.shields.io/github/license/MoShuYG/ArchiveDesk.svg)](https://github.com/MoShuYG/ArchiveDesk/master/LICENSE)
[![Windows](https://img.shields.io/badge/platform-Windows-blue?logo=windows)](https://github.com/MoShuYG/ArchiveDesk/releases)


## 🚀 Overview

ArchiveDesk is a digital archive management tool designed for local use. Built with `React` + `Express` + `SQLite`, it primarily targets Windows desktop environments. It is suitable for organizing and searching local images, videos, audio files, documents, and other files over the long term, and it supports offline workflows.

### ✨ Features

- 📁 Create and manage local libraries
- 🔍 Scan and index folders
- 🏷️ Search by keyword
- 📋 Browse resources and view file details
- 🚀 Open files with external applications
- 🔒 Run locally with offline support

## ⬇️ Download

<table>
  <tbody>
    <tr>
      <td>🪟 Windows</td>
      <td><code>ZIP</code></td>
      <td>amd64</td>
      <td><a href="https://github.com/MoShuYG/ArchiveDesk/releases">📥</a></td>
    </tr>
  </tbody>
</table>

Download the official archive from [GitHub Releases](https://github.com/MoShuYG/ArchiveDesk/releases), extract it to a local folder, and follow the included instructions to start the application.

To run ArchiveDesk from source, see the [Development](#-development) section below.

<!-- ## 🖼️ Interface Preview -->

<!-- ![](_docs/img/ui-demo.png) -->

## 🎯 Use Cases

- Centrally process and search images, videos, audio files, and documents in selected folders
- Build a personal library, creative asset collection, or digital archive
- Use locally

## 🗂️ Supported File Formats

ArchiveDesk scans and indexes files in selected folders. The following formats can be previewed directly in the application:

| Category | Formats |
|----------|---------|
| Images | JPG / JPEG / PNG / GIF / WebP / BMP / AVIF |
| Videos | MP4 / MOV / WebM |
| Audio | MP3 / WAV / FLAC / M4A / AAC / OGG |
| Text | TXT / MD / JSON / CSV |
| Documents | DOCX |

Audio and video playback depends on the browser's codec support. Other formats can be opened with their default Windows applications.

## 👨‍💻 Development

### 🌍 Requirements

1. Windows 10 / 11
2. Node.js 22.x
3. npm (included with Node.js)

### 📋 Clone

```bash
git clone https://github.com/MoShuYG/ArchiveDesk.git
cd ArchiveDesk
```

### 📦 Install Dependencies

Run the following commands from the project root:

```bash
npm install
npm --prefix frontend install
```

Before the first run, copy the environment variable template in PowerShell:

```powershell
Copy-Item .env.example .env
```

### 🚀 Start the Development Environment

Open two terminals and run:

```bash
# Backend: http://localhost:3000
npm run dev

# Frontend: http://localhost:5173
npm --prefix frontend run dev
```

To try the local production mode, where the backend serves the built frontend, run:

```powershell
.\start-dev.bat
```

The script cleans and rebuilds both the backend and frontend before starting the application at `http://localhost:3000`.

### ⚙️ Configuration

See `.env.example` in the project root. Common settings include:

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port |
| `DB_PATH` | Database path |
| `JWT_ACCESS_SECRET` | JWT access token secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `CORS_ORIGIN` | Allowed CORS origins |

### 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + TypeScript + Vite 7 |
| UI and state | Tailwind CSS 3 + React Router 7 + Zustand 5 |
| Backend | Express 4 + TypeScript |
| Database | SQLite + better-sqlite3 |
| Document preview | PDF.js + Mammoth |
| Image and media metadata | Sharp + ffprobe |
| Authentication and security | JWT + Argon2 + Helmet |

### 📋 Common Commands

```bash
npm run dev            # Start the backend development server
npm run build          # Build the backend
npm run build:frontend # Build the frontend
npm run build:all      # Build both the backend and frontend
npm test               # Run tests
npm run lint           # Run backend type checking
npm run lint:frontend  # Run frontend linting
npm run release:check  # Run the complete release check
```

## 🤝 Contributing

Found a bug or have an idea that could improve ArchiveDesk? Open an Issue and tell us about it. Pull Requests are also welcome if you would like to help directly. Bug fixes, documentation improvements, interface polish, and additional coverage for scanning, search, and preview behavior are all valuable contributions.

Before starting a larger change, please open an Issue to discuss the approach. This helps confirm the direction early and avoids duplicated effort. See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## 📄 License

[MIT](LICENSE)
