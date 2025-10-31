# Mokuro Enhanced

A self-hosted manga reading platform that combines the power of [Mokuro](https://github.com/kha-white/mokuro) OCR with cloud syncing and multi-device support.

## What is this?

Mokuro Enhanced is a web-based manga reader that automatically processes your manga with OCR (Optical Character Recognition), making it easy to look up Japanese text with tools like Yomitan. Upload your manga files through a simple web interface, and the system automatically processes them for you. Your reading progress syncs across all your devices - whether you're reading on your phone during your commute, on your tablet at home, or on your PC.

The reader comes as an Electron desktop application with integrated Yomitan support for Japanese language learning, making it seamless to look up words as you read.

## Motivation

This project was born from a few frustrations:

- **Simplicity**: I didn't want to mess with the Mokuro command-line tool every time I wanted to read a new manga. I just wanted to upload files and have them processed automatically.

- **Syncing**: I wanted my reading progress synced in one place so I could seamlessly switch between devices - my phone, PC, and tablet - without losing my place.

- **Mobile Experience**: While I tried solutions like Suwayomi + Mangatan, I found they didn't work as well as Mokuro on mobile. So I decided to build my own solution that brings the Mokuro reading experience to all devices with proper syncing.

## Features

- 📤 **Simple Upload**: Web interface for uploading manga - no command-line required
- 🔄 **Automatic Processing**: Manga is automatically processed with Mokuro OCR
- 📱 **Multi-Device Support**: Access your library from phone, tablet, or PC
- 🔁 **Progress Syncing**: Your reading progress stays synced across all devices
- 📚 **Yomitan Integration**: Built-in Yomitan support in the Electron reader for Japanese learning
- 🐳 **Easy Deployment**: Docker Compose setup for simple self-hosting

## Architecture

- **Server** (NestJS): REST API for managing library, users, and progress
- **Worker** (Python): Background processing using Mokuro for OCR
- **Reader** (Electron + React): Desktop application with Yomitan integration

## Acknowledgements

This project wouldn't exist without these amazing projects:

- [**Mokuro**](https://github.com/kha-white/mokuro) - The core OCR engine that makes selectable text in manga possible
- [**Mokuro Reader**](https://github.com/ZXY101/mokuro-reader) - Inspiration for the reading interface
- [**Suwayomi**](https://github.com/Suwayomi/Suwayomi-Server) - Inspiration for the manga server architecture
- [**Mangatan**](https://github.com/yourusername/mangatan) - Explored for mobile manga reading
- [**GameSentenceMiner**](https://github.com/mathewthe2/Game-Sentence-Miner) - Specifically the overlay implementation, which inspired the integrated Yomitan functionality in the Electron app

## License

This project is provided as-is for personal use. Please respect the licenses of the acknowledged projects above.

