import React from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Typography, Box, Chip } from '@mui/material';
import { LibraryManga } from '../../store/library.model';

export interface MangaCardProps {
  manga: LibraryManga;
  onClick: (mangaId: string) => void;
}

const MangaCard: React.FC<MangaCardProps> = ({ manga, onClick }) => {
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

  // Use placeholder if no cover URL
  const coverImage = manga.coverUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23333" width="300" height="450"/%3E%3Ctext fill="%23666" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Cover%3C/text%3E%3C/svg%3E';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea onClick={() => onClick(manga.id)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Cover Image */}
        <Box sx={{ position: 'relative', width: '100%', paddingTop: '150%' }}>
          <CardMedia
            component="img"
            image={coverImage}
            alt={manga.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#1a1a1a',
            }}
            onError={(e: any) => {
              // Fallback if image fails to load
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23333" width="300" height="450"/%3E%3Ctext fill="%23666" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Cover%3C/text%3E%3C/svg%3E';
            }}
          />
          {/* Unread Badge */}
          {manga.unreadCount > 0 && (
            <Chip
              label={`${manga.unreadCount} unread`}
              color="error"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontWeight: 'bold',
              }}
            />
          )}
          {/* Status Badge */}
          <Chip
            label={getStatusLabel(manga.status)}
            color={getStatusColor(manga.status)}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontWeight: 'bold',
            }}
          />
        </Box>

        {/* Card Content */}
        <CardContent sx={{ flexGrow: 1, width: '100%' }}>
          <Typography
            gutterBottom
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: '3em',
            }}
          >
            {manga.title}
          </Typography>
          {manga.author && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {manga.author}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {manga.volumeCount} {manga.volumeCount === 1 ? 'volume' : 'volumes'}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default MangaCard;

