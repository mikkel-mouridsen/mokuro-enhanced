import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import { Close, DeleteOutline, DriveFileMoveOutlined } from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`volume-tabpanel-${index}`}
      aria-labelledby={`volume-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export interface Volume {
  id: string;
  title: string;
  volumeNumber: number;
  mangaId: string;
  coverUrl?: string;
}

export interface Manga {
  id: string;
  title: string;
}

interface VolumeManagementDialogProps {
  open: boolean;
  volume: Volume | null;
  allMangas: Manga[];
  onClose: () => void;
  onSave: (id: string, data: Partial<Volume>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, targetMangaId: string, newVolumeNumber?: number) => void;
}

const VolumeManagementDialog: React.FC<VolumeManagementDialogProps> = ({
  open,
  volume,
  allMangas,
  onClose,
  onSave,
  onDelete,
  onMove,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState<Partial<Volume>>({
    title: '',
    volumeNumber: 1,
  });
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [newVolumeNumber, setNewVolumeNumber] = useState<number | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (volume) {
      setFormData({
        title: volume.title,
        volumeNumber: volume.volumeNumber,
      });
      // Find and set the current manga
      const currentManga = allMangas.find(m => m.id === volume.mangaId);
      setSelectedManga(currentManga || null);
      // Reset new volume number when volume changes
      setNewVolumeNumber(undefined);
    }
  }, [volume, allMangas]);

  const handleChange = (field: keyof Volume, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (volume && formData.title) {
      onSave(volume.id, formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (volume) {
      // Call onDelete which will close dialog and handle the delete
      onDelete(volume.id);
      setShowDeleteConfirm(false);
      // Note: onClose is handled by parent component now
    }
  };

  const handleMove = () => {
    if (volume && selectedManga && selectedManga.id !== volume.mangaId) {
      // Call onMove which will close dialog and handle the move
      onMove(volume.id, selectedManga.id, newVolumeNumber);
      // Note: onClose is handled by parent component now
    }
  };

  if (!volume) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Manage Volume</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab label="Edit" />
            <Tab label="Move" />
            <Tab label="Delete" />
          </Tabs>
        </Box>

        {/* Edit Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Volume Number"
              type="number"
              value={formData.volumeNumber}
              onChange={(e) => handleChange('volumeNumber', parseInt(e.target.value, 10))}
              required
              fullWidth
            />
          </Box>
        </TabPanel>

        {/* Move Tab */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Move this volume to a different manga series
            </Alert>
            <Autocomplete
              options={allMangas}
              getOptionLabel={(option) => option.title}
              value={selectedManga}
              onChange={(_, newValue) => setSelectedManga(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Target Manga" required />
              )}
              fullWidth
            />
            <TextField
              label="New Volume Number (optional)"
              type="number"
              value={newVolumeNumber || ''}
              onChange={(e) => setNewVolumeNumber(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              helperText="Leave empty to keep current volume number"
              fullWidth
            />
          </Box>
        </TabPanel>

        {/* Delete Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {showDeleteConfirm ? (
              <Alert
                severity="error"
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button color="inherit" size="small" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button color="inherit" size="small" onClick={handleDelete}>
                      Confirm Delete
                    </Button>
                  </Box>
                }
              >
                Are you sure? This will permanently delete this volume and all its pages.
              </Alert>
            ) : (
              <>
                <Alert severity="warning">
                  Deleting a volume will permanently remove all its pages and data.
                </Alert>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutline />}
                  onClick={() => setShowDeleteConfirm(true)}
                  fullWidth
                >
                  Delete Volume
                </Button>
              </>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {currentTab === 0 && (
          <Button onClick={handleSave} variant="contained" color="primary" disabled={!formData.title}>
            Save Changes
          </Button>
        )}
        {currentTab === 1 && (
          <Button
            onClick={handleMove}
            variant="contained"
            color="primary"
            disabled={!selectedManga || selectedManga.id === volume.mangaId}
            startIcon={<DriveFileMoveOutlined />}
          >
            Move Volume
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VolumeManagementDialog;

