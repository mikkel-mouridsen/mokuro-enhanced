# Quick Start Guide - Mokuro Enhanced Reader

## Getting Started

### 1. Install Dependencies

```bash
cd packages/reader
npm install
```

This will install all required dependencies including:
- Electron
- React and Material-UI
- Redux Toolkit
- TypeScript
- Vite and build tools

### 2. Development Mode

```bash
npm run dev
```

This command will:
- Start the Vite development server (http://localhost:5173)
- Launch the Electron app with hot reload
- Open DevTools automatically

### 3. Using the Application

#### Opening a Manga

1. Click the folder icon in the top bar
2. Select a folder containing manga images (JPG, PNG, WebP)
3. The first page will load automatically

#### Navigation

- **Next Page**: Click right arrow or press `→`
- **Previous Page**: Click left arrow or press `←`
- **Zoom In/Out**: Use zoom controls at bottom right
- **Fullscreen**: Click fullscreen icon or press `Ctrl+F`
- **Sidebar**: Click menu icon to open page list

#### Settings

Click the settings icon to configure:
- Dark/Light mode
- Page layout (single/double)
- Reading direction (RTL for manga, LTR for comics)
- Default zoom level
- Auto-fullscreen

#### Yomitan (Japanese Text Lookup)

*Note: Yomitan integration is implemented but requires further configuration*

1. Open Yomitan dialog from the menu
2. Click "Install Yomitan" if not installed
3. Enable/disable as needed

## Project Structure Overview

```
packages/reader/
├── electron/          # Electron main process
├── src/
│   ├── api/          # API client (ready for backend)
│   ├── components/   # React components
│   │   ├── pure/     # UI components
│   │   └── connected/# Redux-connected components
│   ├── services/     # Business logic
│   ├── store/        # Redux state management
│   └── theme/        # MUI theme
└── ...
```

## Development Tips

### Hot Reload

The app supports hot reload for React components. Changes to:
- React components → Instant refresh
- TypeScript files → Automatic recompile
- Electron main process → Requires app restart

### TypeScript

Run type checking:
```bash
npm run type-check
```

### Linting

Check code quality:
```bash
npm run lint
```

## Building for Production

### Build React App

```bash
npm run build:react
```

Output: `dist/renderer/`

### Build Electron Distributable

```bash
npm run build
```

This creates platform-specific packages in `release/`:
- Windows: `.exe` installer
- macOS: `.dmg` image
- Linux: `.AppImage`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` | Next page |
| `←` | Previous page |
| `Ctrl+F` | Toggle fullscreen |
| `Esc` | Exit fullscreen |

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. Check the console output for the actual port.

### Electron Window Not Opening

1. Check if the Vite dev server is running
2. Wait for "vite v5.x.x dev server running" message
3. Electron window should open automatically

### Images Not Loading

1. Ensure the folder contains valid image files
2. Supported formats: JPG, JPEG, PNG, WebP
3. Check file permissions

### TypeScript Errors

Run type checking to see detailed errors:
```bash
npm run type-check
```

## Next Steps

### Backend Integration

When the backend is ready:

1. Update `REACT_APP_API_BASE_URL` in environment variables
2. Run API codegen: `npm run generate:api` (to be added)
3. Update thunks to use real API calls

### Adding Features

The architecture makes it easy to add new features:

1. **New UI Components**: Add to `src/components/pure/`
2. **New State**: Add slice in `src/store/`
3. **New API Calls**: Add to `src/api/api.client.ts`
4. **New Services**: Add to `src/services/`

## Architecture

For detailed architecture documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete architecture guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details

## Key Concepts

### Pure Components

Components that only take props and emit events:
```tsx
<MangaViewer
  imagePath={path}
  currentPage={5}
  totalPages={100}
  onNextPage={() => dispatch(nextPage())}
/>
```

### Connected Components

Components that connect to Redux:
```tsx
const currentManga = useAppSelector(state => state.reader.currentManga);
dispatch(openMangaFolder());
```

### Redux Thunks

Async operations with Redux:
```tsx
export const openMangaFolder = createAsyncThunk(
  'reader/openMangaFolder',
  async (_, { dispatch }) => {
    // Async logic here
  }
);
```

## Support

For issues or questions:
1. Check the [ARCHITECTURE.md](./ARCHITECTURE.md) documentation
2. Review the [README.md](./README.md) for features
3. Check the implementation in source files

## License

MIT License - See LICENSE file for details

