import { LibraryManga, MangaVolume } from '../store/library.model';
import { libraryApi } from '../api/library.api';

// Mock data for fallback
const MOCK_MANGAS: LibraryManga[] = [
  {
    id: '1',
    title: 'One Piece',
    coverUrl: 'https://via.placeholder.com/300x450/1976D2/ffffff?text=One+Piece',
    author: 'Eiichiro Oda',
    status: 'ongoing',
    volumeCount: 105,
    unreadCount: 15,
    lastRead: new Date('2024-10-15'),
  },
  {
    id: '2',
    title: 'Naruto',
    coverUrl: 'https://via.placeholder.com/300x450/FF9800/ffffff?text=Naruto',
    author: 'Masashi Kishimoto',
    status: 'completed',
    volumeCount: 72,
    unreadCount: 0,
    lastRead: new Date('2024-10-20'),
  },
  {
    id: '3',
    title: 'Attack on Titan',
    coverUrl: 'https://via.placeholder.com/300x450/F44336/ffffff?text=Attack+on+Titan',
    author: 'Hajime Isayama',
    status: 'completed',
    volumeCount: 34,
    unreadCount: 5,
    lastRead: new Date('2024-10-10'),
  },
  {
    id: '4',
    title: 'My Hero Academia',
    coverUrl: 'https://via.placeholder.com/300x450/4CAF50/ffffff?text=My+Hero+Academia',
    author: 'Kohei Horikoshi',
    status: 'ongoing',
    volumeCount: 38,
    unreadCount: 8,
    lastRead: new Date('2024-10-18'),
  },
  {
    id: '5',
    title: 'Demon Slayer',
    coverUrl: 'https://via.placeholder.com/300x450/9C27B0/ffffff?text=Demon+Slayer',
    author: 'Koyoharu Gotouge',
    status: 'completed',
    volumeCount: 23,
    unreadCount: 0,
    lastRead: new Date('2024-10-25'),
  },
  {
    id: '6',
    title: 'Jujutsu Kaisen',
    coverUrl: 'https://via.placeholder.com/300x450/00BCD4/ffffff?text=Jujutsu+Kaisen',
    author: 'Gege Akutami',
    status: 'ongoing',
    volumeCount: 24,
    unreadCount: 12,
    lastRead: new Date('2024-10-12'),
  },
  {
    id: '7',
    title: 'Tokyo Ghoul',
    coverUrl: 'https://via.placeholder.com/300x450/607D8B/ffffff?text=Tokyo+Ghoul',
    author: 'Sui Ishida',
    status: 'completed',
    volumeCount: 14,
    unreadCount: 0,
    lastRead: new Date('2024-09-30'),
  },
  {
    id: '8',
    title: 'Chainsaw Man',
    coverUrl: 'https://via.placeholder.com/300x450/E91E63/ffffff?text=Chainsaw+Man',
    author: 'Tatsuki Fujimoto',
    status: 'hiatus',
    volumeCount: 13,
    unreadCount: 3,
    lastRead: new Date('2024-10-08'),
  },
];

const generateMockVolumes = (mangaId: string, count: number): MangaVolume[] => {
  const manga = MOCK_MANGAS.find((m) => m.id === mangaId);
  if (!manga) return [];

  return Array.from({ length: count }, (_, i) => {
    const volumeNumber = i + 1;
    const chapterCount = Math.floor(Math.random() * 6) + 5; // 5-10 chapters per volume
    const progress = volumeNumber <= count - manga.unreadCount ? 100 : Math.floor(Math.random() * 80);
    const isRead = progress === 100;

    return {
      id: `${mangaId}-vol-${volumeNumber}`,
      mangaId,
      volumeNumber,
      title: `Volume ${volumeNumber}`,
      coverUrl: `https://via.placeholder.com/300x450/1976D2/ffffff?text=${encodeURIComponent(
        manga.title
      )}+Vol+${volumeNumber}`,
      chapters: Array.from({ length: chapterCount }, (_, j) => ({
        id: `${mangaId}-vol-${volumeNumber}-ch-${j + 1}`,
        volumeId: `${mangaId}-vol-${volumeNumber}`,
        chapterNumber: j + 1,
        title: `Chapter ${j + 1}`,
        pageCount: Math.floor(Math.random() * 20) + 20, // 20-40 pages
        isRead: isRead || Math.random() > 0.5,
      })),
      isRead,
      progress,
    };
  });
};

/**
 * Library Service - Now using real API
 */
export class LibraryService {
  private static useMockData = false; // Set to true to use mock data

  /**
   * Fetch all manga in the library
   */
  static async getLibraryMangas(): Promise<LibraryManga[]> {
    if (this.useMockData) {
      return [...MOCK_MANGAS];
    }
    try {
      return await libraryApi.getAllManga();
    } catch (error) {
      console.error('Failed to fetch manga from API, using mock data:', error);
      return [...MOCK_MANGAS];
    }
  }

  /**
   * Fetch volumes for a specific manga
   */
  static async getMangaVolumes(mangaId: string): Promise<MangaVolume[]> {
    if (this.useMockData) {
      const manga = MOCK_MANGAS.find((m) => m.id === mangaId);
      if (!manga) {
        throw new Error(`Manga with id ${mangaId} not found`);
      }
      return generateMockVolumes(mangaId, manga.volumeCount);
    }
    try {
      return await libraryApi.getVolumesByMangaId(mangaId);
    } catch (error) {
      console.error('Failed to fetch volumes from API, using mock data:', error);
      const manga = MOCK_MANGAS.find((m) => m.id === mangaId);
      if (!manga) {
        throw new Error(`Manga with id ${mangaId} not found`);
      }
      return generateMockVolumes(mangaId, manga.volumeCount);
    }
  }

  /**
   * Get data for a specific volume (for opening in reader)
   */
  static async getVolumeData(mangaId: string, volumeId: string): Promise<MangaVolume> {
    if (this.useMockData) {
      const volumes = await this.getMangaVolumes(mangaId);
      const volume = volumes.find((v) => v.id === volumeId);
      if (!volume) {
        throw new Error(`Volume with id ${volumeId} not found`);
      }
      return volume;
    }
    try {
      const volume = await libraryApi.getVolumeById(volumeId);
      return {
        id: volume.id,
        mangaId: volume.mangaId,
        volumeNumber: volume.volumeNumber,
        title: volume.title,
        coverUrl: volume.coverUrl || '',
        chapters: [],
        isRead: volume.isRead,
        progress: volume.progress,
      };
    } catch (error) {
      console.error('Failed to fetch volume from API, using mock data:', error);
      const volumes = await this.getMangaVolumes(mangaId);
      const volume = volumes.find((v) => v.id === volumeId);
      if (!volume) {
        throw new Error(`Volume with id ${volumeId} not found`);
      }
      return volume;
    }
  }

  /**
   * Search manga by title
   */
  static async searchMangas(query: string): Promise<LibraryManga[]> {
    if (this.useMockData) {
      const lowerQuery = query.toLowerCase();
      return MOCK_MANGAS.filter((manga) => manga.title.toLowerCase().includes(lowerQuery));
    }
    try {
      return await libraryApi.searchManga(query);
    } catch (error) {
      console.error('Failed to search manga from API, using mock data:', error);
      const lowerQuery = query.toLowerCase();
      return MOCK_MANGAS.filter((manga) => manga.title.toLowerCase().includes(lowerQuery));
    }
  }

  /**
   * Get a single manga by ID
   */
  static async getMangaById(mangaId: string): Promise<LibraryManga | null> {
    if (this.useMockData) {
      return MOCK_MANGAS.find((m) => m.id === mangaId) || null;
    }
    try {
      return await libraryApi.getMangaById(mangaId);
    } catch (error) {
      console.error('Failed to fetch manga by ID from API, using mock data:', error);
      return MOCK_MANGAS.find((m) => m.id === mangaId) || null;
    }
  }

  /**
   * Upload a volume
   */
  static async uploadVolume(
    file: File,
    options?: {
      mangaTitle?: string;
      volumeNumber?: number;
    },
  ): Promise<void> {
    await libraryApi.uploadVolume(file, options);
  }
}

// Export for easy backend integration
export interface ILibraryService {
  getLibraryMangas(): Promise<LibraryManga[]>;
  getMangaVolumes(mangaId: string): Promise<MangaVolume[]>;
  getVolumeData(mangaId: string, volumeId: string): Promise<MangaVolume>;
  searchMangas(query: string): Promise<LibraryManga[]>;
  getMangaById(mangaId: string): Promise<LibraryManga | null>;
}

