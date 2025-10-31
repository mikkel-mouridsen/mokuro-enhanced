import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Container,
  Toolbar,
  Avatar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import MangaCard from './MangaCard';
import { LibraryManga } from '../../store/library.model';
import { UploadButton } from './UploadButton';
import { Button } from '@mui/material';

export interface LibraryViewProps {
  mangas: LibraryManga[];
  loading: boolean;
  error?: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMangaClick: (mangaId: string) => void;
  onMangaManage?: (mangaId: string) => void;
  onUploadComplete?: () => void;
  onRetry?: () => void;
  username?: string;
  profilePicture?: string | null;
  onProfileClick?: () => void;
  onLogout?: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({
  mangas,
  loading,
  error,
  searchQuery,
  onSearchChange,
  onMangaClick,
  onMangaManage,
  onUploadComplete,
  onRetry,
  username,
  profilePicture,
  onProfileClick,
  onLogout,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    onProfileClick?.();
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout?.();
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
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Library
        </Typography>
        <UploadButton onUploadComplete={onUploadComplete} />
        
        {username && (
          <Box sx={{ ml: 2 }}>
            <Tooltip title="Account">
              <IconButton onClick={handleMenuOpen} aria-label="account">
                <Avatar
                  src={profilePicture || undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {username[0].toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Signed in as <strong>{username}</strong>
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>

      {/* Search Bar */}
      <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
        <TextField
          fullWidth
          placeholder="Search manga..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
              }}
            >
              <CircularProgress size={60} />
            </Box>
          ) : mangas.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                gap: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                {searchQuery ? 'No manga found' : 'Your library is empty'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add some manga to get started'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {mangas.map((manga) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={manga.id}>
                  <MangaCard manga={manga} onClick={onMangaClick} onManage={onMangaManage} />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default LibraryView;

