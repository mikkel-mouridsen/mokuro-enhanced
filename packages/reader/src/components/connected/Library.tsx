import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LibraryView from '../pure/LibraryView';
import MangaDetailView from '../pure/MangaDetailView';
import ProfileDialog from '../pure/ProfileDialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLibraryMangas, fetchMangaVolumes, openVolume } from '../../store/library.thunks';
import { setSelectedManga } from '../../store/library.slice';
import { logoutUser, updateUserProfile, uploadProfilePicture } from '../../store/auth.thunks';

const Library: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { mangaId } = useParams<{ mangaId: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Selectors
  const mangas = useAppSelector((state) => state.library.mangas);
  const volumes = useAppSelector((state) => state.library.volumes);
  const loading = useAppSelector((state) => state.library.loading);
  const error = useAppSelector((state) => state.library.error);
  const selectedMangaId = useAppSelector((state) => state.library.selectedMangaId);
  const user = useAppSelector((state) => state.auth.user);
  const authLoading = useAppSelector((state) => state.auth.isLoading);
  const authError = useAppSelector((state) => state.auth.error);

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

  // Get selected manga data
  const selectedManga = mangas.find((m) => m.id === selectedMangaId);
  const selectedVolumes = selectedMangaId ? volumes[selectedMangaId] || [] : [];

  // Show manga detail view if manga is selected
  if (mangaId && selectedManga) {
    return (
      <MangaDetailView
        manga={selectedManga}
        volumes={selectedVolumes}
        loading={loading}
        onBack={handleBack}
        onVolumeClick={handleVolumeClick}
        onUploadComplete={handleUploadComplete}
      />
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
    </>
  );
};

export default Library;

