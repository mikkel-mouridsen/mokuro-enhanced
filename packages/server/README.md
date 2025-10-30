# Mokuro Enhanced Server

NestJS backend for Mokuro Enhanced manga reader.

## Features

- 📚 Library management (manga, volumes, pages)
- 📤 Pre-processed mokuro zip upload
- 🗄️ PostgreSQL database
- 📁 Local file storage (S3 support planned)
- 🔄 Event-driven architecture
- 📖 OpenAPI/Swagger documentation

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL running on localhost:5432

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

### Run

Development mode with hot reload:

```bash
npm run start:dev
```

Production mode:

```bash
npm run build
npm run start:prod
```

### API Documentation

Visit `http://localhost:3000/api` for interactive API docs.

## Project Structure

```
src/
├── library/              # Library feature module
│   ├── entities/         # Database entities
│   ├── dto/              # Data transfer objects
│   ├── events/           # Event classes
│   ├── library.controller.ts
│   ├── library.service.ts
│   └── library.module.ts
│
├── storage/              # File storage service
│   ├── storage.service.ts
│   └── storage.module.ts
│
├── files/                # File serving
│   ├── files.controller.ts
│   └── files.module.ts
│
├── app.module.ts         # Root module
└── main.ts               # Application entry
```

## Database Schema

### Manga
- id (uuid, primary key)
- title (string)
- author (string, optional)
- coverUrl (string, optional)
- status (enum: ongoing, completed, hiatus, cancelled)
- volumeCount (integer)
- unreadCount (integer)
- lastRead (timestamp)

### Volume
- id (uuid, primary key)
- mangaId (uuid, foreign key)
- volumeNumber (integer)
- title (string)
- coverUrl (string, optional)
- status (enum: uploaded, processing, completed, failed)
- isRead (boolean)
- progress (float, 0-100)
- pageCount (integer)
- storagePath (string)
- metadata (jsonb)

### Page
- id (uuid, primary key)
- volumeId (uuid, foreign key)
- pageNumber (integer)
- imagePath (string)
- imageUrl (string)
- textBlocks (jsonb) - OCR data from mokuro
- isRead (boolean)

## Events

The system emits the following events:

- `volume.uploaded` - After a volume is uploaded
- `volume.processed` - After processing completes

Add listeners in any module:

```typescript
@OnEvent('volume.uploaded')
async handleVolumeUploaded(event: VolumeUploadedEvent) {
  // Your logic here
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm run start:prod
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DATABASE_HOST` | PostgreSQL host | localhost |
| `DATABASE_PORT` | PostgreSQL port | 5432 |
| `DATABASE_USERNAME` | Database user | postgres |
| `DATABASE_PASSWORD` | Database password | postgres |
| `DATABASE_NAME` | Database name | mokuro_enhanced |
| `STORAGE_TYPE` | Storage type (local/s3) | local |
| `STORAGE_PATH` | Local storage path | ./uploads |
| `CORS_ORIGIN` | CORS origin | http://localhost:5173 |

## License

MIT

