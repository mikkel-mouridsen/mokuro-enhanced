import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import { MangaVolume } from '../../store/library.model';

export interface VolumeCardProps {
  volume: MangaVolume & { status?: 'uploaded' | 'processing' | 'completed' | 'failed' };
  onClick: (volumeId: string) => void;
}

const VolumeCard: React.FC<VolumeCardProps> = ({ volume, onClick }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'processing':
        return 'info';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'uploaded':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return null;
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Use placeholder if no cover URL
  const coverImage =
    volume.coverUrl ||
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23333" width="300" height="450"/%3E%3Ctext fill="%23666" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Cover%3C/text%3E%3C/svg%3E';

  const isProcessing = volume.status === 'processing';
  const isFailed = volume.status === 'failed';
  const isClickable = volume.status === 'completed' || !volume.status;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        opacity: isFailed ? 0.6 : 1,
        '&:hover': isClickable
          ? {
              transform: 'translateY(-4px)',
              boxShadow: 6,
            }
          : {},
      }}
    >
      <CardActionArea
        onClick={() => isClickable && onClick(volume.id)}
        disabled={!isClickable}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          cursor: isClickable ? 'pointer' : 'default',
        }}
      >
        {/* Cover Image */}
        <Box sx={{ position: 'relative', width: '100%', paddingTop: '150%' }}>
          <CardMedia
            component="img"
            image={coverImage}
            alt={volume.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#1a1a1a',
              filter: isProcessing || isFailed ? 'brightness(0.7)' : 'none',
            }}
            onError={(e: any) => {
              e.target.src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect fill="%23333" width="300" height="450"/%3E%3Ctext fill="%23666" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Cover%3C/text%3E%3C/svg%3E';
            }}
          />

          {/* Status Badge */}
          {volume.status && (
            <Chip
              label={getStatusLabel(volume.status)}
              color={getStatusColor(volume.status)}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontWeight: 'bold',
              }}
            />
          )}

          {/* Read Badge */}
          {volume.isRead && volume.status !== 'processing' && (
            <Chip
              label="Read"
              color="success"
              size="small"
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                fontWeight: 'bold',
              }}
            />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
              }}
            >
              <Box sx={{ width: '80%', textAlign: 'center' }}>
                <Typography variant="body2" color="white" sx={{ mb: 1 }}>
                  Processing...
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={volume.progress || 0}
                  sx={{ borderRadius: 1 }}
                />
                <Typography variant="caption" color="white" sx={{ mt: 0.5 }}>
                  {Math.round(volume.progress || 0)}%
                </Typography>
              </Box>
            </Box>
          )}

          {/* Failed overlay */}
          {isFailed && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
              }}
            >
              <Typography variant="body2" color="error" sx={{ fontWeight: 'bold' }}>
                Processing Failed
              </Typography>
            </Box>
          )}
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
              whiteSpace: 'nowrap',
            }}
          >
            {volume.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Volume {volume.volumeNumber}
          </Typography>
          {volume.progress > 0 && volume.progress < 100 && volume.status !== 'processing' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {Math.round(volume.progress)}% read
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default VolumeCard;
