# Reader Data Flow - Backend Integration

## Confirmed: Data is Fetched from Backend Database

The reader implementation correctly fetches all data from the backend database, **NOT** from local files.

## Data Flow

### 1. Upload & Storage (Backend)
```
User uploads mokuro zip → Backend extracts → Saves to database
```

**Location**: `packages/server/src/library/library.service.ts`

The backend:
1. Extracts the mokuro zip file
2. Reads the `.mokuro` JSON file containing OCR data
3. Saves each page to the database with OCR blocks:

```typescript
// Line 225-236 in library.service.ts
const page = this.pageRepository.create({
  volumeId: volume.id,
  pageNumber,
  imagePath: imageDestPath,
  imageUrl: this.storageService.getFileUrl(imageDestPath),
  textBlocks: {
    blocks: pageData.blocks,        // OCR text blocks
    img_width: pageData.img_width,   // Original image width
    img_height: pageData.img_height, // Original image height
    version: pageData.version,       // Mokuro version
  },
});
```

### 2. Database Storage
**Entity**: `Page` entity in `packages/server/src/library/entities/page.entity.ts`

```typescript
@Column({ type: 'jsonb', nullable: true })
textBlocks: any; // OCR text blocks from mokuro stored as JSONB
```

The `textBlocks` column stores the complete mokuro OCR data structure in PostgreSQL as JSONB.

### 3. API Endpoint
**Endpoint**: `GET /library/volumes/:volumeId/pages`

**Controller**: `packages/server/src/library/library.controller.ts` (Line 102-106)

```typescript
@Get('volumes/:volumeId/pages')
async getPagesByVolumeId(@Param('volumeId', ParseUUIDPipe) volumeId: string) {
  return this.libraryService.findPagesByVolumeId(volumeId);
}
```

This returns an array of Page objects with all OCR data from the database.

### 4. Frontend API Client
**Location**: `packages/reader/src/api/library.api.ts`

```typescript
async getVolumePages(volumeId: string) {
  // Fetch pages from backend API
  const pages = await this.getPagesByVolumeId(volumeId);
  
  // Transform backend response to reader format
  return pages.map((page, index) => ({
    id: page.id,
    path: page.imageUrl,                                    // Image URL from backend
    index,
    imgPath: page.imagePath,
    imgWidth: (page.textBlocks as any)?.img_width,          // From database
    imgHeight: (page.textBlocks as any)?.img_height,        // From database
    textBlocks: Array.isArray((page.textBlocks as any)?.blocks) 
      ? (page.textBlocks as any).blocks.map((block: any) => ({
          box: block.box,                                   // Text coordinates
          vertical: block.vertical || false,
          fontSize: block.font_size || 16,
          lines: block.lines || [],                         // OCR text
        }))
      : [],
  }));
}
```

### 5. Redux Thunk
**Location**: `packages/reader/src/store/reader.thunks.ts`

```typescript
export const loadVolumeFromLibrary = createAsyncThunk(
  'reader/loadVolumeFromLibrary',
  async ({ mangaId, volumeId }, { dispatch }) => {
    // Fetch volume metadata
    const volume = await libraryApi.getVolumeById(volumeId);
    
    // Fetch pages with OCR data from backend
    const pages = await libraryApi.getVolumePages(volumeId);
    
    // Create manga object for reader
    const readerManga: Manga = {
      id: volumeId,
      title: `${manga.title} - Volume ${volume.volumeNumber}`,
      pages,  // Pages with OCR data from database
      currentPageIndex: 0,
      totalPages: pages.length,
    };
    
    dispatch(setCurrentManga(readerManga));
  }
);
```

### 6. Reader Component
**Location**: `packages/reader/src/components/pure/ReaderView.tsx`

The ReaderView component receives pages with OCR data and:
1. Displays the image from `page.path` (which is `imageUrl` from backend)
2. Renders OCR text blocks on hover using coordinates from the database
3. Allows text selection for dictionary lookup

## Data Structure in Database

The `textBlocks` JSONB column stores:

```json
{
  "blocks": [
    {
      "box": [x1, y1, x2, y2],
      "vertical": false,
      "font_size": 32,
      "lines": ["テキスト行1", "テキスト行2"]
    }
  ],
  "img_width": 981,
  "img_height": 1542,
  "version": "0.1.6"
}
```

## Summary

✅ **All data comes from the backend database**
- Images are served via backend storage service
- OCR data is stored in PostgreSQL JSONB column
- Reader makes API calls to backend to fetch everything
- No local file access in the reader

The only local file operation is during the **upload process** on the backend, where the mokuro zip is temporarily extracted, processed, and then the data is saved to the database. After that, everything is served from the database.

