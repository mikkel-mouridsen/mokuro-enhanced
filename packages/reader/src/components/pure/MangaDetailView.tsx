import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Container,
  Toolbar,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import VolumeCard from './VolumeCard';
import { LibraryManga, MangaVolume } from '../../store/library.model';
import { UploadButton } from './UploadButton';

export interface MangaDetailViewProps {
  manga: LibraryManga;
  volumes: MangaVolume[];
  loading: boolean;
  onBack: () => void;
  onVolumeClick: (volumeId: string) => void;
  onMangaManage?: (mangaId: string) => void;
  onVolumeManage?: (volumeId: string) => void;
  onUploadComplete?: () => void;
}

const MangaDetailView: React.FC<MangaDetailViewProps> = ({
  manga,
  volumes,
  loading,
  onBack,
  onVolumeClick,
  onMangaManage,
  onVolumeManage,
  onUploadComplete,
}) => {
  const getStatusColor = (status: LibraryManga['status']) => {
    switch (status) {
      case 'ongoing':
        return 'success';
      case 'completed':
        return 'primary';
      case 'hiatus':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: LibraryManga['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Toolbar
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mr: 2 }}
        >
          Back to Library
        </Button>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {manga.title}
        </Typography>
        {onMangaManage && (
          <Button
            variant="outlined"
            onClick={() => onMangaManage(manga.id)}
            sx={{ mr: 2 }}
          >
            Manage Manga
          </Button>
        )}
      </Toolbar>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Manga Info Section */}
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3}>
              {/* Cover Image */}
              <Grid item xs={12} sm={4} md={3}>
                <Box
                  component="img"
                  src={manga.coverUrl}
                  alt={manga.title}
                  sx={{
                    width: '100%',
                    borderRadius: 2,
                    boxShadow: 3,
                  }}
                />
              </Grid>

              {/* Info */}
              <Grid item xs={12} sm={8} md={9}>
                <Stack spacing={2}>
                  <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
                    {manga.title}
                  </Typography>

                  {manga.author && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        Author
                      </Typography>
                      <Typography variant="body1">{manga.author}</Typography>
                    </Box>
                  )}

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={getStatusLabel(manga.status)}
                      color={getStatusColor(manga.status)}
                      size="medium"
                    />
                    {manga.unreadCount > 0 && (
                      <Chip
                        label={`${manga.unreadCount} unread volumes`}
                        color="error"
                        size="medium"
                      />
                    )}
                  </Stack>

                  <Box>
                    <Stack direction="row" spacing={3}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {manga.volumeCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          VOLUMES
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {volumes.filter((v) => v.isRead).length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          READ
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Volumes Section */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <MenuBookIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h5" component="h3" sx={{ fontWeight: 600 }}>
                  Volumes
                </Typography>
              </Stack>
              {onUploadComplete && (
                <UploadButton onUploadComplete={onUploadComplete} variant="outlined" size="small" />
              )}
            </Stack>

            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '300px',
                }}
              >
                <CircularProgress size={60} />
              </Box>
            ) : volumes.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '300px',
                  gap: 2,
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  No volumes available
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {volumes.map((volume) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={volume.id}>
                    <VolumeCard volume={volume} onClick={onVolumeClick} onManage={onVolumeManage} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default MangaDetailView;

