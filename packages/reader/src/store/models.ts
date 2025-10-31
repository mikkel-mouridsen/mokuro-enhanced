// Redux State Models

export interface MangaPage {
  id: string;
  path: string;
  index: number;
  textBlocks?: TextBlock[];
  imgWidth?: number;
  imgHeight?: number;
  imgPath?: string;
}

export interface TextBlock {
  id?: string;
  text?: string;
  box: [number, number, number, number]; // [x1, y1, x2, y2]
  vertical: boolean;
  fontSize: number;
  lines: string[];
}

export interface Manga {
  id: string;
  title: string;
  folderPath: string;
  pages: MangaPage[];
  currentPageIndex: number;
  totalPages: number;
}

export interface YomitanStatus {
  isInstalled: boolean;
  isEnabled: boolean;
  version?: string;
}

export interface ReaderSettings {
  // Display settings
  darkMode: boolean;
  pageLayout: 'single' | 'double';
  readingDirection: 'ltr' | 'rtl';
  backgroundColor: string;
  zoom: number;
  autoFullscreen: boolean;
  
  // OCR settings (mokuro-inspired)
  displayOCR: boolean;
  textBoxBorders: boolean;
  editableText: boolean;
  toggleOCRTextBoxes: boolean;
  fontSize: string | number; // 'auto' or specific pixel size
  
  // Reading settings
  hasCover: boolean; // first page is cover
  defaultZoomMode: 'fit-to-screen' | 'fit-to-width' | 'original' | 'keep-level';
  eInkMode: boolean;
  ctrlToPan: boolean;
}

export interface AppState {
  reader: ReaderState;
  yomitan: YomitanState;
  settings: SettingsState;
  ui: UIState;
}

export interface ReaderState {
  currentManga: Manga | null;
  recentMangas: Manga[];
  loading: boolean;
  error: string | null;
}

export interface YomitanState {
  status: YomitanStatus;
  installing: boolean;
  error: string | null;
}

export enum DeviceProfile {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
}

export interface SettingsState {
  settings: ReaderSettings;
  currentProfile: DeviceProfile;
  desktopSettings: ReaderSettings;
  mobileSettings: ReaderSettings;
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  sidebarOpen: boolean;
  settingsDialogOpen: boolean;
  fullscreen: boolean;
}

