// Library Models

export interface LibraryManga {
  id: string;
  title: string;
  coverUrl: string;
  author?: string;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  volumeCount: number;
  unreadCount: number;
  lastRead?: Date;
}

export interface MangaVolume {
  id: string;
  mangaId: string;
  volumeNumber: number;
  title: string;
  coverUrl: string;
  chapters: VolumeChapter[];
  isRead: boolean;
  progress: number; // 0-100
}

export interface VolumeChapter {
  id: string;
  volumeId: string;
  chapterNumber: number;
  title: string;
  pageCount: number;
  isRead: boolean;
}

export interface LibraryState {
  mangas: LibraryManga[];
  volumes: Record<string, MangaVolume[]>; // mangaId -> volumes
  loading: boolean;
  error: string | null;
  selectedMangaId: string | null;
}

