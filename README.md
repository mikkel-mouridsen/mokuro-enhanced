<div align="center">

<img src="packages/reader/public/assets/icon/icon-512.png" alt="Mokuro Enhanced Logo" width="200"/>

# Mokuro Enhanced

**Your Personal Manga Reading & Japanese Learning Platform**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/mikkel-mouridsen/mokuro-enhanced/releases)
[![Web](https://img.shields.io/badge/web-supported-green.svg)](https://github.com/mikkel-mouridsen/mokuro-enhanced)

</div>

---

## 📖 What is Mokuro Enhanced?

Mokuro Enhanced is a **self-hosted manga reading platform** that combines powerful OCR (Optical Character Recognition) technology with seamless cloud syncing and integrated Japanese dictionary support. Read your manga collection anywhere, on any device, with your progress automatically synced.

Perfect for Japanese learners who want to read manga with instant dictionary lookups powered by **Yomitan dictionaries** - even on devices where browser extensions aren't available!

<div align="center">

![Screenshot Placeholder](packages/reader/public/assets/images/login-bg.png)

*Beautiful, modern interface optimized for manga reading*

</div>

---

## ✨ Why Mokuro Enhanced?

- 📤 **Simple Upload**: Just drag and drop your manga files - automatic OCR processing handles the rest
- 🔄 **Sync Everywhere**: Your reading progress automatically syncs across all your devices
- 📱 **True Multi-Platform**: Desktop app, web browser, and mobile (coming soon) - use whatever works for you
- 📚 **Built-in Dictionary**: Integrated Yomitan dictionary support on web and desktop readers - no browser extension needed
- 🎯 **Japanese Learning**: Perfect for language learners with instant text lookup and dictionary integration
- 🏠 **Self-Hosted**: Your manga, your server, your privacy - full control over your data
- ⚡ **Modern & Fast**: Beautiful dark mode interface, smooth page transitions, and responsive design

---

## 🏗️ Architecture Overview

Mokuro Enhanced consists of three main components that work together seamlessly:

### 🖥️ **The Server**

The heart of your manga library. The server:
- **Manages your entire manga collection** - uploads, metadata, and organization
- **Processes manga with OCR** - automatically extracts selectable Japanese text from images
- **Stores reading progress** - keeps track of what you've read across all devices
- **Serves manga to all clients** - desktop, web, and mobile apps all connect to your server
- **Handles user authentication** - secure multi-user support for family or friends

The server includes both the backend API and the **web reader interface**, all in one package!

**Technical Details:**
- Built with NestJS (Node.js backend)
- Uses PostgreSQL for data storage
- Python worker with Mokuro for OCR processing
- Redis for background job queue
- Docker-based deployment for easy setup

### 💻 **Desktop Reader**

A native desktop application with advanced features:
- **Bundled Yomitan Dictionary** - complete Yomitan dictionary engine included, hover over Japanese text for instant lookups
- **Offline Reading** - download manga for reading without internet
- **Keyboard Shortcuts** - efficient navigation and controls
- **Beautiful Dark Theme** - optimized for long reading sessions
- **Rich Text Selection** - copy and export text for studying

**Technical Details:**
- Built with Electron + React
- Yomitan dictionary engine bundled with the application
- Available for Windows, macOS, and Linux

### 🌐 **Web Reader**

Access your library from any web browser:
- **No Installation Required** - works on any device with a browser
- **Integrated Dictionary** - built-in Yomitan dictionary support without browser extensions
- **Responsive Design** - optimized for tablets, laptops, and desktop screens
- **Progress Syncing** - seamlessly switch between devices
- **Perfect for Chromebooks & Tablets** - great for devices where extensions aren't available

The web reader is automatically included with the server - just navigate to your server URL!

**Technical Details:**
- Built with React + TypeScript
- Material-UI components with dark theme
- Integrated Yomitan dictionary (no extension needed!)
- Responsive design for all screen sizes

---

## 🚀 Installation

### Step 1: Setup the Server

Host the server on your local machine, home server, or cloud VPS - your choice!

**Requirements:**
- Docker and Docker Compose installed
- 4GB+ RAM recommended
- 20GB+ storage for your manga library

**Setup Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/mikkel-mouridsen/mokuro-enhanced.git
   cd mokuro-enhanced
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (see below)
   ```

3. **Start the services**
   ```bash
   docker compose up -d
   ```

4. **Access your server**
   - Web Reader: `http://localhost:3000/reader` (or `http://your-server-ip:3000/reader`)
   - API Documentation: `http://localhost:3000/api/docs`

**Environment Variables:**
```bash
# Security
JWT_SECRET=your-secret-key-here  # Change this!

# Storage (optional)
STORAGE_TYPE=local              # or 's3' for cloud storage
# For S3:
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=your-bucket

# CORS (if needed)
CORS_ORIGIN=http://localhost:5173  # or your domain
```

**Optional - GPU Acceleration:**
For faster OCR processing, enable GPU support:
```bash
# Requires NVIDIA GPU + nvidia-docker
docker compose up -d
# GPU will be automatically detected and used by the worker
```

---

### Step 2: Connect with Desktop App or Web Browser

#### **Desktop App**

Download and install the desktop application for the best reading experience with bundled Yomitan dictionaries.

1. **Download Mokuro Enhanced Desktop App**
   - Get the latest release for your platform from [Releases](https://github.com/mikkel-mouridsen/mokuro-enhanced/releases)
   - Windows: Download `.exe` installer
   - macOS: Download `.dmg` file
   - Linux: Download `.AppImage` or `.deb` file

2. **Install and Launch**
   - Run the installer and launch the application

3. **Connect to Your Server**
   - On first launch, enter your server URL (e.g., `http://localhost:3000` or `http://your-server:3000`)
   - Login with your credentials or create a new account

#### **Web Browser**

Access from any device with a web browser - no installation needed!

1. Navigate to your server URL (e.g., `http://localhost:3000/reader` or `http://your-server:3000/reader`)
2. Login with your credentials or create a new account
3. (Optional) Bookmark or add to home screen for quick access

---

## 🙏 Acknowledgments

This project wouldn't exist without these amazing projects:

- [**Mokuro**](https://github.com/kha-white/mokuro) - The OCR engine that makes selectable manga text possible
- [**Yomitan**](https://github.com/themoeway/yomitan) - Powerful Japanese dictionary lookup
- [**Mokuro Reader**](https://github.com/ZXY101/mokuro-reader) - Inspiration for the reading interface
- [**Suwayomi**](https://github.com/Suwayomi/Suwayomi-Server) - Inspiration for the server architecture
- [**Game Sentence Miner**](https://github.com/mathewthe2/Game-Sentence-Miner) - Inspiration for the Yomitan integration

---

## 📝 License

This project is provided as-is for personal use. Please respect the licenses of the acknowledged projects above.

---

## 🔗 Links

- [Releases](https://github.com/mikkel-mouridsen/mokuro-enhanced/releases) - Download desktop apps
- [Issues](https://github.com/mikkel-mouridsen/mokuro-enhanced/issues) - Report bugs or request features
- [Discussions](https://github.com/mikkel-mouridsen/mokuro-enhanced/discussions) - Ask questions and share tips

---

<div align="center">

**Made with ❤️ for manga readers and Japanese learners**

[⬆ Back to Top](#mokuro-enhanced)

</div>
