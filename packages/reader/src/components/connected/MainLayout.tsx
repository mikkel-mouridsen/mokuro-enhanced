import React, { useEffect, useCallback } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../pure/TopBar';
import Sidebar from '../pure/Sidebar';
import ReaderView from '../pure/ReaderView';
import SettingsDialog from '../pure/SettingsDialog';
import YomitanDialog from '../pure/YomitanDialog';
import ServerManagement from './ServerManagement';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nextPage, previousPage, setCurrentPage, setCurrentManga } from '../../store/reader.slice';
import {
  toggleSidebar,
  toggleSettingsDialog,
  toggleFullscreen,
  setSidebarOpen,
  setSettingsDialogOpen,
} from '../../store/ui.slice';
import { updateSettings, switchProfile, loadSettings, saveSettings } from '../../store/settings.slice';
import { updateAppSettings } from '../../store/app-settings.slice';
import { updateApiBaseUrl } from '../../api/api-client';
import { toggleYomitan } from '../../store/yomitan.slice';
import { openMangaFolder, loadVolumeFromLibrary, markPageAsReadThunk } from '../../store/reader.thunks';
import { checkYomitanStatus, installYomitan } from '../../store/yomitan.thunks';
import { DeviceProfile } from '../../store/models';

const MainLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mangaId, volumeId } = useParams<{ mangaId?: string; volumeId?: string }>();

  // Selectors
  const currentManga = useAppSelector((state) => state.reader.currentManga);
  const recentMangas = useAppSelector((state) => state.reader.recentMangas);
  const loading = useAppSelector((state) => state.reader.loading);
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const settingsDialogOpen = useAppSelector((state) => state.ui.settingsDialogOpen);
  const fullscreen = useAppSelector((state) => state.ui.fullscreen);
  const settings = useAppSelector((state) => state.settings.settings);
  const currentProfile = useAppSelector((state) => state.settings.currentProfile);
  const authToken = useAppSelector((state) => state.auth.token);
  const yomitanStatus = useAppSelector((state) => state.yomitan.status);
  const yomitanInstalling = useAppSelector((state) => state.yomitan.installing);
  const yomitanError = useAppSelector((state) => state.yomitan.error);
  const appSettings = useAppSelector((state) => state.appSettings.settings);

  const [yomitanDialogOpen, setYomitanDialogOpen] = React.useState(false);
  const [serverDialogOpen, setServerDialogOpen] = React.useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = React.useState(false);
  const [isInitialSettingsLoad, setIsInitialSettingsLoad] = React.useState(true);
  
  // Use ref to track last saved settings to prevent infinite loops
  const lastSavedSettingsRef = React.useRef<string | null>(null);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize Yomitan status check
  useEffect(() => {
    dispatch(checkYomitanStatus());
  }, [dispatch]);

  // Load settings on startup
  useEffect(() => {
    if (authToken && !hasLoadedSettings) {
      dispatch(loadSettings(authToken));
      setHasLoadedSettings(true);
    }
  }, [authToken, hasLoadedSettings, dispatch]);

  // Initialize the lastSavedSettingsRef after settings are loaded (only once)
  useEffect(() => {
    if (hasLoadedSettings && isInitialSettingsLoad) {
      // Give a small delay to ensure Redux state is updated with loaded settings
      const timeoutId = setTimeout(() => {
        lastSavedSettingsRef.current = JSON.stringify(settings);
        setIsInitialSettingsLoad(false);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [hasLoadedSettings, isInitialSettingsLoad, settings]);

  // Auto-save settings when they change (debounced with change detection)
  useEffect(() => {
    // Only auto-save if:
    // 1. User is authenticated
    // 2. Settings have been loaded at least once
    // 3. We're not in the initial load phase
    // 4. Settings have actually changed from last saved state
    if (!authToken || !hasLoadedSettings || isInitialSettingsLoad) {
      return;
    }

    const currentSettingsString = JSON.stringify(settings);
    
    // Check if settings actually changed
    if (lastSavedSettingsRef.current === currentSettingsString) {
      return;
    }

    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      console.log('Auto-saving settings...');
      
      // Update the last saved reference before dispatching
      lastSavedSettingsRef.current = currentSettingsString;
      
      dispatch(saveSettings({
        token: authToken,
        profile: currentProfile,
        settings,
      })).catch((error) => {
        console.error('Failed to auto-save settings:', error);
        // Reset the ref so it will retry on next change
        lastSavedSettingsRef.current = null;
      });
    }, 1500); // 1.5 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings, currentProfile, authToken, hasLoadedSettings, isInitialSettingsLoad, dispatch]);

  // Load volume from URL parameters
  useEffect(() => {
    if (mangaId && volumeId) {
      dispatch(loadVolumeFromLibrary({ mangaId, volumeId }));
    }
  }, [mangaId, volumeId, dispatch]);

  // Cleanup reader state when component unmounts (navigating away from reader)
  useEffect(() => {
    return () => {
      // Clear the current manga when leaving the reader
      // This ensures a fresh state when returning to the reader
      dispatch(setCurrentManga(null));
    };
  }, [dispatch]);

  // Handlers - defined before useEffect to avoid hoisting issues
  const handlePageSelect = useCallback((pageIndex: number) => {
    // Check if this is a library volume (not a local folder)
    if (currentManga && mangaId && volumeId) {
      // This is a library volume - mark page as read
      const page = currentManga.pages[pageIndex];
      if (page && page.id) {
        dispatch(markPageAsReadThunk({ pageId: page.id, pageIndex }));
      } else {
        // Fallback if page data is incomplete
        dispatch(setCurrentPage(pageIndex));
      }
    } else {
      // This is a local folder - just change page without tracking
      dispatch(setCurrentPage(pageIndex));
    }
  }, [currentManga, mangaId, volumeId, dispatch]);

  const handleNextPage = useCallback(() => {
    if (currentManga && mangaId && volumeId) {
      // Library volume - use handlePageSelect to mark as read
      const nextIndex = Math.min(currentManga.currentPageIndex + 1, currentManga.totalPages - 1);
      if (nextIndex !== currentManga.currentPageIndex) {
        handlePageSelect(nextIndex);
      }
    } else {
      // Local folder - just navigate
      dispatch(nextPage());
    }
  }, [currentManga, mangaId, volumeId, handlePageSelect, dispatch]);

  const handlePreviousPage = useCallback(() => {
    if (currentManga && mangaId && volumeId) {
      // Library volume - use handlePageSelect to mark as read
      const prevIndex = Math.max(currentManga.currentPageIndex - 1, 0);
      if (prevIndex !== currentManga.currentPageIndex) {
        handlePageSelect(prevIndex);
      }
    } else {
      // Local folder - just navigate
      dispatch(previousPage());
    }
  }, [currentManga, mangaId, volumeId, handlePageSelect, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePreviousPage();
      } else if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        dispatch(toggleFullscreen());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, handleNextPage, handlePreviousPage]);

  // Other handlers
  const handleOpenFolder = () => {
    dispatch(openMangaFolder());
  };

  const handleMenuClick = () => {
    dispatch(toggleSidebar());
  };

  const handleSettingsClick = () => {
    dispatch(toggleSettingsDialog());
  };

  const handleToggleFullscreen = () => {
    dispatch(toggleFullscreen());
  };

  const handleZoomIn = () => {
    dispatch(updateSettings({ zoom: Math.min(settings.zoom + 10, 200) }));
  };

  const handleZoomOut = () => {
    dispatch(updateSettings({ zoom: Math.max(settings.zoom - 10, 50) }));
  };

  const handleSidebarClose = () => {
    dispatch(setSidebarOpen(false));
  };

  const handleSettingsClose = () => {
    dispatch(setSettingsDialogOpen(false));
  };

  const handleYomitanDialogClose = () => {
    setYomitanDialogOpen(false);
  };

  const handleInstallYomitan = () => {
    dispatch(installYomitan());
  };

  const handleToggleYomitan = () => {
    dispatch(toggleYomitan());
  };

  const handleBackToLibrary = () => {
    navigate('/library');
  };

  const handleAppSettingsChange = (newSettings: Partial<typeof appSettings>) => {
    dispatch(updateAppSettings(newSettings));
    
    // If backend endpoint changed, update the API client
    if (newSettings.backendEndpoint) {
      updateApiBaseUrl(newSettings.backendEndpoint);
    }
  };

  const currentPage = currentManga?.currentPageIndex ?? 0;
  const totalPages = currentManga?.totalPages ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Use ReaderView if we have pages, otherwise show TopBar and Sidebar */}
      {currentManga && currentManga.pages.length > 0 ? (
        <ReaderView
          pages={currentManga.pages}
          currentPageIndex={currentPage}
          onPageChange={handlePageSelect}
          loading={loading}
          title={currentManga.title}
          onBackToLibrary={handleBackToLibrary}
          onSettingsClick={handleSettingsClick}
          settings={settings}
        />
      ) : (
        <>
          {/* Top Bar */}
          <TopBar
            title="Mokuro Enhanced Reader"
            fullscreen={fullscreen}
            onMenuClick={handleMenuClick}
            onOpenFolder={handleOpenFolder}
            onSettingsClick={handleSettingsClick}
            onToggleFullscreen={handleToggleFullscreen}
            onBackToLibrary={handleBackToLibrary}
          />

          {/* Main Content */}
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Sidebar */}
            <Sidebar
              open={sidebarOpen}
              currentPage={currentPage}
              totalPages={totalPages}
              pages={currentManga?.pages ?? []}
              recentMangas={recentMangas}
              onClose={handleSidebarClose}
              onPageSelect={handlePageSelect}
              onRecentMangaSelect={(mangaId) => {
                console.log('Select manga:', mangaId);
                // TODO: Implement manga selection from recent mangas
              }}
            />
          </Box>
        </>
      )}

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        settings={settings}
        currentProfile={currentProfile}
        appSettings={appSettings}
        onClose={handleSettingsClose}
        onSettingsChange={(newSettings) => dispatch(updateSettings(newSettings))}
        onProfileChange={(profile) => dispatch(switchProfile(profile))}
        onAppSettingsChange={handleAppSettingsChange}
        onSaveSettings={() => {
          if (authToken) {
            dispatch(saveSettings({
              token: authToken,
              profile: currentProfile,
              settings,
            }));
          }
        }}
      />

      {/* Yomitan Dialog */}
      <YomitanDialog
        open={yomitanDialogOpen}
        isInstalled={yomitanStatus.isInstalled}
        isEnabled={yomitanStatus.isEnabled}
        installing={yomitanInstalling}
        error={yomitanError}
        onClose={handleYomitanDialogClose}
        onInstall={handleInstallYomitan}
        onToggle={handleToggleYomitan}
      />
    </Box>
  );
};

export default MainLayout;

