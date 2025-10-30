import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

export interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, options: { mangaTitle?: string; volumeNumber?: number }) => Promise<void>;
  allowCbz?: boolean;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ open, onClose, onUpload, allowCbz = true }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mangaTitle, setMangaTitle] = useState('');
  const [volumeNumber, setVolumeNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Check file extension
      const extension = selectedFile.name.toLowerCase();
      const isZip = extension.endsWith('.zip');
      const isCbz = extension.endsWith('.cbz');

      if (!isZip && !isCbz) {
        setError('Please select a .zip or .cbz file');
        return;
      }

      // If it's a zip but CBZ processing is enabled, suggest it might be raw
      if (isZip && allowCbz) {
        setError('');
      } else if (isCbz && !allowCbz) {
        setError('CBZ files require processing. Please upload a pre-processed .zip file.');
        return;
      } else {
        setError('');
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const options: { mangaTitle?: string; volumeNumber?: number } = {};
      
      if (!autoDetect) {
        if (mangaTitle.trim()) {
          options.mangaTitle = mangaTitle.trim();
        }
        if (volumeNumber.trim()) {
          const volNum = parseInt(volumeNumber, 10);
          if (!isNaN(volNum)) {
            options.volumeNumber = volNum;
          }
        }
      }

      await onUpload(file, options);
      
      // Reset form
      setFile(null);
      setMangaTitle('');
      setVolumeNumber('');
      setAutoDetect(true);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setMangaTitle('');
      setVolumeNumber('');
      setError('');
      setAutoDetect(true);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Manga Volume</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {allowCbz && (
            <Alert severity="info">
              You can upload:
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li><strong>.zip</strong> - Pre-processed mokuro files (ready to read)</li>
                <li><strong>.cbz</strong> - Raw manga files (will be processed with OCR)</li>
              </ul>
            </Alert>
          )}

          {/* File Upload */}
          <Box>
            <input
              accept=".zip,.cbz"
              style={{ display: 'none' }}
              id="raised-button-file"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="raised-button-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={uploading}
              >
                {file ? file.name : 'Choose File'}
              </Button>
            </label>
          </Box>

          {/* Auto-detect toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                disabled={uploading}
              />
            }
            label="Auto-detect title and volume number"
          />

          {/* Manual fields */}
          {!autoDetect && (
            <>
              <TextField
                label="Manga Title"
                value={mangaTitle}
                onChange={(e) => setMangaTitle(e.target.value)}
                fullWidth
                disabled={uploading}
                helperText="Leave empty to auto-detect from filename"
              />
              <TextField
                label="Volume Number"
                type="number"
                value={volumeNumber}
                onChange={(e) => setVolumeNumber(e.target.value)}
                fullWidth
                disabled={uploading}
                helperText="Leave empty to auto-detect from filename"
              />
            </>
          )}

          {file && file.name.toLowerCase().endsWith('.cbz') && (
            <Alert severity="warning">
              <strong>CBZ Processing</strong>
              <br />
              This file will be processed with mokuro OCR. This may take several minutes depending on the number of pages.
              You can continue using the app while processing happens in the background.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDialog;

