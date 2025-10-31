import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LibraryView from '../pure/LibraryView';
import MangaDetailView from '../pure/MangaDetailView';
import ProfileDialog from '../pure/ProfileDialog';
import MangaManagementDialog from '../pure/MangaManagementDialog';
import VolumeManagementDialog from '../pure/VolumeManagementDialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLibraryMangas, fetchMangaVolumes, openVolume } from '../../store/library.thunks';
import { setSelectedManga, updateVolumeProcessingStatus } from '../../store/library.slice';
import { logoutUser, updateUserProfile, uploadProfilePicture } from '../../store/auth.thunks';
import { useProgressUpdates, ProgressUpdate } from '../../hooks/useProgressUpdates';
import * as LibraryManagementAPI from '../../api/library-management';

const Library: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mangaId } = useParams<{ mangaId: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [managingMangaId, setManagingMangaId] = useState<string | null>(null);
  const [managingVolumeId, setManagingVolumeId] = useState<string | null>(null);

  // Selectors
  const mangas = useAppSelector((state) => state.library.mangas);
  const volumes = useAppSelector((state) => state.library.volumes);
  const loading = useAppSelector((state) => state.library.loading);
  const error = useAppSelector((state) => state.library.error);
  const selectedMangaId = useAppSelector((state) => state.library.selectedMangaId);
  const user = useAppSelector((state) => state.auth.user);
  const authToken = useAppSelector((state) => state.auth.token);
  const authLoading = useAppSelector((state) => state.auth.isLoading);
  const authError = useAppSelector((state) => state.auth.error);

  // Handle progress updates from WebSocket
  const handleProgressUpdate = useCallback((update: ProgressUpdate) => {
    console.log('Processing update received in Library:', update);
    
    // Refresh library and volumes on any progress update
    // This ensures we see the latest status and messages
    dispatch(fetchLibraryMangas());
    
    // If we're viewing a manga detail, refresh its volumes too
    if (selectedMangaId) {
      dispatch(fetchMangaVolumes(selectedMangaId));
    }
  }, [dispatch, selectedMangaId]);

  // Connect to WebSocket for real-time progress updates
  useProgressUpdates({
    onProgressUpdate: handleProgressUpdate,
    autoConnect: true,
  });

  // Load library on mount
  useEffect(() => {
    dispatch(fetchLibraryMangas());
  }, [dispatch]);

  // Handle manga selection from URL
  useEffect(() => {
    if (mangaId && mangaId !== selectedMangaId) {
      dispatch(setSelectedManga(mangaId));
      dispatch(fetchMangaVolumes(mangaId));
    } else if (!mangaId && selectedMangaId) {
      dispatch(setSelectedManga(null));
    }
  }, [mangaId, selectedMangaId, dispatch]);

  // Filter mangas based on search
  const filteredMangas = useMemo(() => {
    if (!searchQuery.trim()) {
      return mangas;
    }
    const query = searchQuery.toLowerCase();
    return mangas.filter((manga) =>
      manga.title.toLowerCase().includes(query) ||
      manga.author?.toLowerCase().includes(query)
    );
  }, [mangas, searchQuery]);

  // Handlers
  const handleMangaClick = (mangaId: string) => {
    navigate(`/library/${mangaId}`);
  };

  const handleVolumeClick = (volumeId: string) => {
    if (!selectedMangaId) return;
    
    // Navigate to reader with manga and volume IDs
    navigate(`/reader/${selectedMangaId}/${volumeId}`);
  };

  const handleBack = () => {
    navigate('/library');
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleUploadComplete = () => {
    // Refresh library after upload
    dispatch(fetchLibraryMangas());
    if (selectedMangaId) {
      dispatch(fetchMangaVolumes(selectedMangaId));
    }
  };

  const handleRetry = () => {
    dispatch(fetchLibraryMangas());
  };

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
  };

  const handleProfileClose = () => {
    setProfileDialogOpen(false);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/auth');
  };

  const handleUpdatePassword = async (newPassword: string) => {
    await dispatch(updateUserProfile({ password: newPassword }));
  };

  const handleUploadProfilePicture = async (file: File) => {
    await dispatch(uploadProfilePicture(file));
  };

  // Management handlers
  const handleMangaManage = (mangaId: string) => {
    setManagingMangaId(mangaId);
  };

  const handleVolumeManage = (volumeId: string) => {
    setManagingVolumeId(volumeId);
  };

  const handleMangaSave = async (mangaId: string, data: Partial<any>) => {
    if (!authToken) return;
    try {
      await LibraryManagementAPI.updateManga(authToken, mangaId, data);
      dispatch(fetchLibraryMangas());
    } catch (error) {
      console.error('Failed to update manga:', error);
    }
  };

  const handleMangaDelete = async (mangaId: string) => {
    if (!authToken) return;
    
    // Close dialog immediately
    setManagingMangaId(null);
    
    try {
      await LibraryManagementAPI.deleteManga(authToken, mangaId);
      dispatch(fetchLibraryMangas());
      navigate('/library');
    } catch (error) {
      console.error('Failed to delete manga:', error);
    }
  };

  const handleVolumeSave = async (volumeId: string, data: Partial<any>) => {
    if (!authToken) return;
    try {
      await LibraryManagementAPI.updateVolume(authToken, volumeId, data);
      if (selectedMangaId) {
        dispatch(fetchMangaVolumes(selectedMangaId));
      }
    } catch (error) {
      console.error('Failed to update volume:', error);
    }
  };

  const handleVolumeDelete = async (volumeId: string) => {
    if (!authToken) return;
    
    // Close dialog immediately to prevent re-render issues
    setManagingVolumeId(null);
    
    try {
      await LibraryManagementAPI.deleteVolume(authToken, volumeId);
      if (selectedMangaId) {
        dispatch(fetchMangaVolumes(selectedMangaId));
      }
      dispatch(fetchLibraryMangas());
    } catch (error) {
      console.error('Failed to delete volume:', error);
    }
  };

  const handleVolumeMove = async (volumeId: string, targetMangaId: string, newVolumeNumber?: number) => {
    if (!authToken) return;
    
    // Close dialog immediately to prevent re-render issues during refresh
    setManagingVolumeId(null);
    
    try {
      await LibraryManagementAPI.moveVolume(authToken, volumeId, {
        targetMangaId,
        newVolumeNumber,
      });
      
      // Refresh both source and target manga
      dispatch(fetchLibraryMangas());
      
      if (selectedMangaId) {
        dispatch(fetchMangaVolumes(selectedMangaId));
      }
      
      // Also refresh target manga volumes if different
      if (targetMangaId !== selectedMangaId) {
        dispatch(fetchMangaVolumes(targetMangaId));
      }
    } catch (error: any) {
      console.error('Failed to move volume:', error);
      alert(`Failed to move volume: ${error.response?.data?.message || error.message}`);
    }
  };

  // Get selected manga data
  const selectedManga = mangas.find((m) => m.id === selectedMangaId);
  const selectedVolumes = selectedMangaId ? volumes[selectedMangaId] || [] : [];
  
  // Get managing manga/volume data
  const managingManga = managingMangaId ? mangas.find((m) => m.id === managingMangaId) : null;
  
  // Find managing volume by searching through all manga volumes
  const managingVolume = managingVolumeId 
    ? Object.values(volumes).flat().find((v: any) => v.id === managingVolumeId) || null
    : null;

  // Show manga detail view if manga is selected
  if (mangaId && selectedManga) {
    return (
      <>
        <MangaDetailView
          manga={selectedManga}
          volumes={selectedVolumes}
          loading={loading}
          onBack={handleBack}
          onVolumeClick={handleVolumeClick}
          onUploadComplete={handleUploadComplete}
          onMangaManage={handleMangaManage}
          onVolumeManage={handleVolumeManage}
        />
        
        <VolumeManagementDialog
          open={!!managingVolumeId}
          volume={managingVolume as any}
          allMangas={mangas.map(m => ({ id: m.id, title: m.title }))}
          onClose={() => setManagingVolumeId(null)}
          onSave={handleVolumeSave}
          onDelete={handleVolumeDelete}
          onMove={handleVolumeMove}
        />
      </>
    );
  }

  // Show library view
  return (
    <>
      <LibraryView
        mangas={filteredMangas}
        loading={loading}
        error={error}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onMangaClick={handleMangaClick}
        onMangaManage={handleMangaManage}
        onUploadComplete={handleUploadComplete}
        onRetry={handleRetry}
        username={user?.username}
        profilePicture={user?.profilePicture}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
      />
      
      <ProfileDialog
        open={profileDialogOpen}
        onClose={handleProfileClose}
        user={user}
        onUpdatePassword={handleUpdatePassword}
        onUploadProfilePicture={handleUploadProfilePicture}
        isLoading={authLoading}
        error={authError}
      />

      <MangaManagementDialog
        open={!!managingMangaId}
        manga={managingManga as any}
        onClose={() => setManagingMangaId(null)}
        onSave={handleMangaSave}
        onDelete={handleMangaDelete}
      />
    </>
  );
};

export default Library;

