# Mokuro Enhanced - Setup Guide

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- PostgreSQL
- Docker & Docker Compose (recommended)

### 1. Start Database Services

Start PostgreSQL, Redis, and MinIO using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO on port 9000 (console on 9001)

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd packages/server
npm install

# Install frontend dependencies
cd ../reader
npm install
```

### 3. Configure Environment

Create `.env` file in `packages/server`:

```bash
cp packages/server/.env.example packages/server/.env
```

The default configuration works with the Docker Compose services.

### 4. Start the Backend

```bash
cd packages/server
npm run start:dev
```

The API will be available at `http://localhost:3000`
API documentation at `http://localhost:3000/api`

### 5. Start the Frontend

```bash
cd packages/reader
npm run dev
```

The Electron app will start automatically.

## 📚 Using the Library Feature

### Uploading Pre-Processed Manga

1. **Prepare Your Zip File**
   - Your zip should contain:
     - `cover.jpg` (optional)
     - `[Volume-Name]/` folder with numbered images (001.jpg, 002.jpg, etc.)
     - `[Volume-Name].mokuro` JSON file with OCR data

   Example structure:
   ```
   Dandadan-01.zip
   ├── cover.jpg
   ├── Dandadan-01/
   │   ├── 001.jpg
   │   ├── 002.jpg
   │   └── ...
   └── Dandadan-01.mokuro
   ```

2. **Upload via UI**
   - Click "Upload Volume" button in the library
   - Select your zip file
   - Optionally specify manga title and volume number (auto-detected if not provided)
   - Click "Upload"

3. **View Your Manga**
   - The manga will appear in your library after processing
   - Click on the manga to see volumes
   - Click on a volume to start reading

### Testing with Example Data

We have example pre-processed data in `example_data/pre_processed_mokuro/`:

1. **Create a zip file** (PowerShell):
   ```powershell
   cd example_data/pre_processed_mokuro
   Compress-Archive -Path * -DestinationPath ../../Dandadan-01.zip
   ```

2. **Upload** the zip file through the UI

## 🏗️ Architecture

```
┌─────────────────┐
│  Electron App   │
│  (React + Vite) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   NestJS API    │
│  (Port 3000)    │
└────────┬────────┘
         │
         ├──► PostgreSQL (Library metadata)
         ├──► Local Storage (Manga files)
         └──► EventEmitter (Event-driven)
```

## 📁 File Structure

```
mokuro-enhanced/
├── packages/
│   ├── reader/          # Electron + React frontend
│   │   ├── src/
│   │   │   ├── api/     # API clients
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── store/   # Redux state
│   │   └── package.json
│   │
│   └── server/          # NestJS backend
│       ├── src/
│       │   ├── library/ # Library feature module
│       │   ├── storage/ # File storage service
│       │   └── files/   # File serving
│       └── package.json
│
├── docker-compose.dev.yml
└── example_data/
    └── pre_processed_mokuro/
```

## 🎯 Event-Driven Architecture

The backend uses EventEmitter2 for event-driven processing:

### Events

| Event | Description |
|-------|-------------|
| `volume.uploaded` | Emitted after a volume is uploaded |
| `volume.processed` | Emitted after processing completes |

### Adding Event Listeners

Create a listener in your module:

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { VolumeUploadedEvent } from './events/volume-uploaded.event';

@Injectable()
export class MyListener {
  @OnEvent('volume.uploaded')
  async handleVolumeUploaded(event: VolumeUploadedEvent) {
    // Do something with the uploaded volume
    console.log('Volume uploaded:', event.volume.id);
  }
}
```

## 🔧 API Endpoints

### Library

- `GET /library/manga` - Get all manga
- `GET /library/manga/:id` - Get manga by ID
- `POST /library/manga` - Create manga
- `GET /library/manga/:mangaId/volumes` - Get volumes for manga
- `GET /library/volumes/:id` - Get volume by ID
- `POST /library/volumes/upload` - Upload pre-processed volume
- `GET /library/volumes/:volumeId/pages` - Get pages for volume
- `POST /library/pages/:pageId/mark-read` - Mark page as read

### Files

- `GET /files/**` - Serve uploaded files (images, covers, etc.)

Full API documentation: http://localhost:3000/api

## 🐛 Troubleshooting

### Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check connection settings in `packages/server/.env`

### Upload Fails

1. Check backend logs
2. Verify zip file structure matches expected format
3. Check disk space in `packages/server/uploads/`

### Frontend Can't Connect to Backend

1. Verify backend is running on port 3000
2. Check CORS settings in `packages/server/src/main.ts`
3. Update `VITE_API_URL` if using different port

## 🔐 Production Deployment

For production:

1. **Set Environment Variables**:
   ```bash
   NODE_ENV=production
   DATABASE_URL=your-production-db
   JWT_SECRET=your-secret-key
   ```

2. **Disable Auto-Sync**:
   Set `synchronize: false` in TypeORM config

3. **Use S3 Storage**:
   ```bash
   STORAGE_TYPE=s3
   S3_ENDPOINT=your-s3-endpoint
   S3_BUCKET=manga
   S3_ACCESS_KEY=your-key
   S3_SECRET_KEY=your-secret
   ```

4. **Build**:
   ```bash
   cd packages/server && npm run build
   cd ../reader && npm run build
   ```

## 📝 Next Steps

- [ ] Add Python OCR worker for processing raw manga
- [ ] Add WebSocket support for real-time progress
- [ ] Implement user authentication
- [ ] Add reading progress sync across devices
- [ ] Add manga metadata editing
- [ ] Implement backup/restore functionality

## 📚 Resources

- [NestJS Documentation](https://nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Mokuro Project](https://github.com/kha-white/mokuro)
- [React Documentation](https://react.dev/)


