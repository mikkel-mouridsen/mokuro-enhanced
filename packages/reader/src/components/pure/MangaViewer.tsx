import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, CircularProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

export interface MangaViewerProps {
  imagePath: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  loading: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const MangaViewer: React.FC<MangaViewerProps> = ({
  imagePath,
  currentPage,
  totalPages,
  zoom,
  loading,
  onNextPage,
  onPreviousPage,
  onZoomIn,
  onZoomOut,
}) => {
  const [imageLoading, setImageLoading] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imagePath) {
      setImageLoading(true);
    }
  }, [imagePath]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        overflow: 'auto',
      }}
    >
      {/* Loading Indicator */}
      {(loading || imageLoading) && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!imagePath && !loading && (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No Page Selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Open a manga folder to start reading
          </Typography>
        </Box>
      )}

      {/* Image Display */}
      {imagePath && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            p: 2,
          }}
        >
          <img
            ref={imageRef}
            src={`file://${imagePath}`}
            alt={`Page ${currentPage + 1}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom / 100})`,
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        </Box>
      )}

      {/* Navigation Controls */}
      {imagePath && (
        <>
          {/* Previous Page Button */}
          {currentPage > 0 && (
            <IconButton
              onClick={onPreviousPage}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {/* Next Page Button */}
          {currentPage < totalPages - 1 && (
            <IconButton
              onClick={onNextPage}
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <ArrowForwardIcon />
            </IconButton>
          )}

          {/* Zoom Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              display: 'flex',
              gap: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 1,
              p: 0.5,
            }}
          >
            <IconButton onClick={onZoomOut} size="small">
              <ZoomOutIcon />
            </IconButton>
            <Typography
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1,
                color: 'white',
                minWidth: 50,
                justifyContent: 'center',
              }}
            >
              {zoom}%
            </Typography>
            <IconButton onClick={onZoomIn} size="small">
              <ZoomInIcon />
            </IconButton>
          </Box>

          {/* Page Counter */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 1,
              px: 2,
              py: 1,
            }}
          >
            <Typography variant="body2" color="white">
              {currentPage + 1} / {totalPages}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MangaViewer;

