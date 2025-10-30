
# 📚 Mokuro Reader – Self-Hosted Manga Reader with OCR + Yomitan Integration

A self-hosted manga reader built with **Electron + NestJS**, powered by **Mokuro OCR** for selectable text and **Yomitan** for instant dictionary lookup.

Upload your legally purchased manga, let the backend automatically OCR and process them, and enjoy reading in an immersive desktop reader — complete with built-in Japanese dictionary lookup.

---

## ✨ Features

- 🖥️ **Electron Reader**
  - Built-in **Yomitan** (Chrome extension) integration  
  - Clean reading UI with RTL/LTR support  
  - Reading progress sync + offline cache  

- ⚙️ **NestJS Backend**
  - JWT-based authentication  
  - File uploads to local/S3 storage  
  - Event-driven architecture using **EventEmitter2**  
  - Emits events like `volume.uploaded`, `volume.ocr.completed`, etc.  

- 🐍 **Python OCR Worker**
  - Listens for OCR jobs via simple HTTP interface  
  - Runs **Mokuro** on uploaded CBZ archives  
  - Uploads OCR output + manifest to S3/MinIO  
  - Sends completion callbacks to NestJS  

---

## 🧱 Architecture Overview

```

Electron App
│
▼
NestJS API (Auth + Library)
│
├─ Emits event: "volume.uploaded"
│
├─ Event listener calls → Python OCR Worker (HTTP)
│
▼
Python Worker (FastAPI)
│
├─ Downloads CBZ from S3/MinIO
├─ Runs Mokuro OCR
├─ Uploads images + HTML overlays + manifest
└─ POST /ocr/callback → NestJS

```

All events flow internally through Nest’s event bus (`EventEmitter2`), making the system modular and testable.

---

## 🧩 Project Structure

```

.
├── packages/
│   ├── reader/          # Electron + React/Vite frontend
│   ├── server/          # NestJS backend (API + event bus)
│   └── worker/          # Python OCR worker (FastAPI)
├── docker-compose.yml   # Local dev environment
└── README.md

````

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js ≥ 20  
- Python ≥ 3.10  
- Docker & Docker Compose  
- Mokuro installed and accessible inside worker  

### 2. Clone & Install

```bash
git clone https://github.com/yourname/mokuro-reader.git
cd mokuro-reader
npm install
````

### 3. Start Dev Stack

```bash
docker compose up -d
```

Starts:

* **Postgres** (user + library data)
* **Redis** (for cache/pubsub if needed)
* **MinIO** (S3 compatible storage)
* **Python Worker** (FastAPI OCR service)

---

## ⚙️ Environment Variables

`packages/server/.env`

```env
PORT=3000
JWT_SECRET=supersecret
DATABASE_URL=postgres://nest:nest@postgres:5432/manga
S3_ENDPOINT=http://minio:9000
S3_BUCKET=manga
S3_ACCESS_KEY=admin
S3_SECRET_KEY=admin123
WORKER_URL=http://worker:8000
```

---

## 🧠 Event-Driven Flow

### 📤 Upload event

1. Electron uploads `.cbz` → `POST /volumes/upload`
2. Nest stores metadata, emits `volume.uploaded`
3. `VolumeUploadedListener` reacts:

```ts
@OnEvent('volume.uploaded')
async handleUpload(event: VolumeUploadedEvent) {
  await this.http.post(`${this.config.workerUrl}/process`, {
    volume_id: event.volume.id,
    file_url: event.fileUrl,
    callback_url: `${this.config.apiUrl}/ocr/callback`,
  });
}
```

### 📥 OCR completion

Python worker finishes processing and POSTs back:

```http
POST /ocr/callback
{
  "volume_id": "123",
  "status": "success",
  "page_count": 212,
  "manifest_url": "https://cdn.local/vol_123/manifest.json"
}
```

Nest receives it → emits `volume.ocr.completed` → updates DB + notifies client via WebSocket if connected.

---

## 🐍 Python Worker Overview

**Endpoint:** `POST /process`

* Downloads file from S3/MinIO
* Extracts pages
* Runs `mokuro`
* Uploads per-page images and HTML overlays
* Creates manifest JSON
* Sends callback → NestJS

**Tech:** FastAPI, boto3, requests, Mokuro

---

## 🧩 Event Map

| Event                  | Trigger                 | Handled By                   |
| ---------------------- | ----------------------- | ---------------------------- |
| `volume.uploaded`      | After upload endpoint   | OCR job dispatcher           |
| `volume.ocr.started`   | When worker begins OCR  | Logger / UI feedback         |
| `volume.ocr.completed` | On OCR success callback | DB update / notifications    |
| `volume.ocr.failed`    | On OCR failure callback | Error handling / retry queue |

---

## 🧰 Commands

| Command                      | Description                    |
| ---------------------------- | ------------------------------ |
| `docker compose up`          | Start local services           |
| `npm run start:dev` (server) | Run NestJS backend             |
| `npm run worker` (server)    | Run worker separately if local |
| `npm run dev` (reader)       | Launch Electron app            |

---

## 📄 Example Manifest

```json
{
  "volumeId": "vol_123",
  "title": "Dandadan 01",
  "pageCount": 212,
  "pages": [
    {
      "index": 0,
      "imageUrl": "https://cdn.local/vol_123/0001.jpg",
      "overlayHtmlUrl": "https://cdn.local/vol_123/0001.html"
    }
  ],
  "direction": "rtl"
}
```

---

## 🧠 Design Goals

* Modular, event-driven backend (easy to extend)
* Keep heavy OCR logic in Python (no PyTorch in Node)
* Use the same event flow locally or in cloud
* Decouple frontend, API, and OCR for future scaling
* Fully offline-friendly self-host setup

---

## 🧩 Stack

| Layer       | Tech                        |
| ----------- | --------------------------- |
| Reader      | Electron + React + Tailwind |
| Backend     | NestJS + EventEmitter2      |
| OCR Worker  | Python + FastAPI + Mokuro   |
| Storage     | S3/MinIO                    |
| DB          | Postgres                    |
| Queue/Event | EventEmitter2 (in-memory)   |

---

## 🧭 Roadmap

* [ ] WebSocket live updates on OCR progress
* [ ] Configurable parallel OCR jobs
* [ ] Multi-user permissions
* [ ] Library filters + search
* [ ] AniList sync integration

---

## ⚖️ Legal Notice

This project is for **personal and educational purposes** only.
Only upload and process manga that you **legally own**.
The maintainers take no responsibility for misuse or copyrighted content.

---

## 🧑‍💻 Author

**Mikkel Mouridsen**
Software Engineer @ LEGO
Building cool things in C++, TypeScript, and Japanese.

---

## 🪄 License

MIT © 2025 Mikkel Mouridsen