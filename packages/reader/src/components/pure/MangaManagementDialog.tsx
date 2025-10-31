import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import { Close, DeleteOutline } from '@mui/icons-material';

export interface Manga {
  id: string;
  title: string;
  author?: string;
  description?: string;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  coverUrl?: string;
}

interface MangaManagementDialogProps {
  open: boolean;
  manga: Manga | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<Manga>) => void;
  onDelete: (id: string) => void;
}

const MangaManagementDialog: React.FC<MangaManagementDialogProps> = ({
  open,
  manga,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<Manga>>({
    title: '',
    author: '',
    description: '',
    status: 'ongoing',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (manga) {
      setFormData({
        title: manga.title,
        author: manga.author || '',
        description: manga.description || '',
        status: manga.status,
      });
    }
  }, [manga]);

  const handleChange = (field: keyof Manga, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (manga && formData.title) {
      onSave(manga.id, formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (manga) {
      // Call onDelete which will close dialog and handle the delete
      onDelete(manga.id);
      setShowDeleteConfirm(false);
      // Note: onClose is handled by parent component now
    }
  };

  if (!manga) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Edit Manga</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Author"
            value={formData.author}
            onChange={(e) => handleChange('author', e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={4}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              label="Status"
            >
              <MenuItem value="ongoing">Ongoing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="hiatus">Hiatus</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

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
              Are you sure? This will delete all volumes and pages for this manga.
            </Alert>
          ) : (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutline />}
              onClick={() => setShowDeleteConfirm(true)}
              fullWidth
            >
              Delete Manga
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={!formData.title}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MangaManagementDialog;

