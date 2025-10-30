import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import BookIcon from '@mui/icons-material/Book';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ImageIcon from '@mui/icons-material/Image';

export interface SidebarProps {
  open: boolean;
  currentPage: number;
  totalPages: number;
  pages: Array<{ id: string; index: number; path: string }>;
  recentMangas: Array<{ id: string; title: string }>;
  onClose: () => void;
  onPageSelect: (pageIndex: number) => void;
  onRecentMangaSelect: (mangaId: string) => void;
}

const SIDEBAR_WIDTH = 280;

const Sidebar: React.FC<SidebarProps> = ({
  open,
  currentPage,
  totalPages,
  pages,
  recentMangas,
  onClose,
  onPageSelect,
  onRecentMangaSelect,
}) => {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, justifyContent: 'space-between' }}>
        <Typography variant="h6">Navigation</Typography>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Current Manga Pages */}
      {pages.length > 0 && (
        <>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Pages ({currentPage + 1} / {totalPages})
            </Typography>
          </Box>
          <List sx={{ maxHeight: '40vh', overflow: 'auto' }}>
            {pages.map((page) => (
              <ListItem key={page.id} disablePadding>
                <ListItemButton
                  selected={page.index === currentPage}
                  onClick={() => onPageSelect(page.index)}
                >
                  <ListItemIcon>
                    <ImageIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={`Page ${page.index + 1}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </>
      )}

      {/* Recent Mangas */}
      {recentMangas.length > 0 && (
        <>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Recent Mangas
            </Typography>
          </Box>
          <List>
            {recentMangas.map((manga) => (
              <ListItem key={manga.id} disablePadding>
                <ListItemButton onClick={() => onRecentMangaSelect(manga.id)}>
                  <ListItemIcon>
                    <BookIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={manga.title}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: '0.875rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Empty state */}
      {pages.length === 0 && recentMangas.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
            textAlign: 'center',
          }}
        >
          <BookIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            No manga loaded. Open a folder to get started.
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;

