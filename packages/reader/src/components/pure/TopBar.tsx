import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

export interface TopBarProps {
  title: string;
  fullscreen: boolean;
  onMenuClick: () => void;
  onOpenFolder: () => void;
  onSettingsClick: () => void;
  onToggleFullscreen: () => void;
  onBackToLibrary?: () => void;
  username?: string;
  profilePicture?: string | null;
  onProfileClick?: () => void;
  onLogout?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  title,
  fullscreen,
  onMenuClick,
  onOpenFolder,
  onSettingsClick,
  onToggleFullscreen,
  onBackToLibrary,
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
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {onBackToLibrary && (
            <Tooltip title="Back to Library">
              <IconButton color="inherit" aria-label="library" onClick={onBackToLibrary}>
                <LibraryBooksIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Open Folder">
            <IconButton color="inherit" aria-label="open folder" onClick={onOpenFolder}>
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton color="inherit" aria-label="settings" onClick={onSettingsClick}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton color="inherit" aria-label="fullscreen" onClick={onToggleFullscreen}>
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          {username && (
            <>
              <Tooltip title="Account">
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ ml: 1 }}
                  aria-label="account"
                >
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
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;

