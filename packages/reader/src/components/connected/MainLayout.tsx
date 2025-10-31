import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../pure/TopBar';
import Sidebar from '../pure/Sidebar';
import ReaderView from '../pure/ReaderView';
import SettingsDialog from '../pure/SettingsDialog';
import YomitanDialog from '../pure/YomitanDialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nextPage, previousPage, setCurrentPage } from '../../store/reader.slice';
import {
  toggleSidebar,
  toggleSettingsDialog,
  toggleFullscreen,
  setSidebarOpen,
  setSettingsDialogOpen,
} from '../../store/ui.slice';
import { updateSettings, switchProfile, loadSettings, saveSettings } from '../../store/settings.slice';
import { toggleYomitan } from '../../store/yomitan.slice';
import { openMangaFolder, loadVolumeFromLibrary } from '../../store/reader.thunks';
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

  const [yomitanDialogOpen, setYomitanDialogOpen] = React.useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = React.useState(false);

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

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    if (!authToken || !hasLoadedSettings) return;

    const timeoutId = setTimeout(() => {
      dispatch(saveSettings({
        token: authToken,
        profile: currentProfile,
        settings,
      }));
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [settings, currentProfile, authToken, hasLoadedSettings, dispatch]);

  // Load volume from URL parameters
  useEffect(() => {
    if (mangaId && volumeId) {
      dispatch(loadVolumeFromLibrary({ mangaId, volumeId }));
    }
  }, [mangaId, volumeId, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        dispatch(nextPage());
      } else if (e.key === 'ArrowLeft') {
        dispatch(previousPage());
      } else if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        dispatch(toggleFullscreen());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  // Handlers
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

  const handleNextPage = () => {
    dispatch(nextPage());
  };

  const handlePreviousPage = () => {
    dispatch(previousPage());
  };

  const handlePageSelect = (pageIndex: number) => {
    dispatch(setCurrentPage(pageIndex));
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
        onClose={handleSettingsClose}
        onSettingsChange={(newSettings) => dispatch(updateSettings(newSettings))}
        onProfileChange={(profile) => dispatch(switchProfile(profile))}
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

