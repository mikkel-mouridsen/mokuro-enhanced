import apiClient from './api-client';
import { LibraryManga, MangaVolume } from '../store/library.model';

// Response types from backend
interface MangaResponse {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverUrl?: string;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  volumeCount: number;
  unreadCount: number;
  lastRead?: string;
  processingCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface VolumeResponse {
  id: string;
  mangaId: string;
  volumeNumber: number;
  title: string;
  coverUrl?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  isRead: boolean;
  progress: number;
  processingMessage?: string;
  pageCount: number;
  storagePath?: string;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse {
  id: string;
  volumeId: string;
  pageNumber: number;
  imagePath: string;
  imageUrl: string;
  textBlocks?: any;
  isRead: boolean;
  createdAt: string;
}

// Transform backend response to frontend model
function transformManga(manga: MangaResponse): LibraryManga {
  console.log('Transforming manga:', manga.title, 'Cover URL:', manga.coverUrl, 'Processing Count:', manga.processingCount);
  return {
    id: manga.id,
    title: manga.title,
    coverUrl: manga.coverUrl || '',
    author: manga.author,
    status: manga.status,
    volumeCount: manga.volumeCount,
    unreadCount: manga.unreadCount,
    lastRead: manga.lastRead ? new Date(manga.lastRead) : undefined,
    processingCount: manga.processingCount || 0,
  };
}

function transformVolume(volume: VolumeResponse): MangaVolume {
  console.log('Transforming volume:', volume.title, 'Status:', volume.status, 'Progress:', volume.progress, 'Message:', volume.processingMessage);
  return {
    id: volume.id,
    mangaId: volume.mangaId,
    volumeNumber: volume.volumeNumber,
    title: volume.title,
    coverUrl: volume.coverUrl || '',
    chapters: [], // We'll populate this from pages if needed
    isRead: volume.isRead,
    progress: volume.progress,
    status: volume.status,
    processingMessage: volume.processingMessage,
  };
}

export const libraryApi = {
  // Manga endpoints
  async getAllManga(): Promise<LibraryManga[]> {
    const response = await apiClient.get<MangaResponse[]>('/library/manga');
    return response.data.map(transformManga);
  },

  async getMangaById(mangaId: string): Promise<LibraryManga> {
    const response = await apiClient.get<MangaResponse>(`/library/manga/${mangaId}`);
    return transformManga(response.data);
  },

  async createManga(data: {
    title: string;
    author?: string;
    description?: string;
    status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  }): Promise<LibraryManga> {
    const response = await apiClient.post<MangaResponse>('/library/manga', data);
    return transformManga(response.data);
  },

  // Volume endpoints
  async getVolumesByMangaId(mangaId: string): Promise<MangaVolume[]> {
    const response = await apiClient.get<VolumeResponse[]>(`/library/manga/${mangaId}/volumes`);
    return response.data.map(transformVolume);
  },

  async getVolumeById(volumeId: string): Promise<VolumeResponse> {
    const response = await apiClient.get<VolumeResponse>(`/library/volumes/${volumeId}`);
    return response.data;
  },

  async uploadVolume(
    file: File,
    options?: {
      mangaTitle?: string;
      volumeNumber?: number;
    },
  ): Promise<VolumeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.mangaTitle) {
      formData.append('mangaTitle', options.mangaTitle);
    }
    if (options?.volumeNumber) {
      formData.append('volumeNumber', options.volumeNumber.toString());
    }

    const response = await apiClient.post<VolumeResponse>('/library/volumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadCbz(
    file: File,
    options?: {
      mangaTitle?: string;
      volumeNumber?: number;
    },
  ): Promise<VolumeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.mangaTitle) {
      formData.append('mangaTitle', options.mangaTitle);
    }
    if (options?.volumeNumber !== undefined) {
      formData.append('volumeNumber', options.volumeNumber.toString());
    }

    const response = await apiClient.post<VolumeResponse>('/processing/upload-cbz', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getVolumeStatus(volumeId: string): Promise<{
    id: string;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
    progress: number;
    pageCount: number;
  }> {
    const response = await apiClient.get(`/processing/status/${volumeId}`);
    return response.data;
  },

  // Page endpoints
  async getPagesByVolumeId(volumeId: string): Promise<PageResponse[]> {
    const response = await apiClient.get<PageResponse[]>(`/library/volumes/${volumeId}/pages`);
    return response.data;
  },

  async markPageAsRead(pageId: string): Promise<PageResponse> {
    const response = await apiClient.post<PageResponse>(`/library/pages/${pageId}/mark-read`);
    return response.data;
  },

  // Get volume with full page data including OCR for reader
  async getVolumePages(volumeId: string) {
    const pages = await this.getPagesByVolumeId(volumeId);
    
    // Transform to manga reader format
    return pages.map((page, index) => ({
      id: page.id,
      path: page.imageUrl,
      index,
      imgPath: page.imagePath,
      imgWidth: (page.textBlocks as any)?.img_width,
      imgHeight: (page.textBlocks as any)?.img_height,
      textBlocks: Array.isArray((page.textBlocks as any)?.blocks) 
        ? (page.textBlocks as any).blocks.map((block: any, blockIndex: number) => ({
            id: `${page.id}-block-${blockIndex}`,
            box: block.box,
            vertical: block.vertical || false,
            fontSize: block.font_size || block.fontSize || 16,
            lines: block.lines || [],
          }))
        : [],
    }));
  },

  // Search
  async searchManga(query: string): Promise<LibraryManga[]> {
    const allManga = await this.getAllManga();
    const lowerQuery = query.toLowerCase();
    return allManga.filter(
      (manga) =>
        manga.title.toLowerCase().includes(lowerQuery) ||
        manga.author?.toLowerCase().includes(lowerQuery),
    );
  },
};

