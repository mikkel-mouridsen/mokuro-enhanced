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
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { FolderOpen, CloudUpload } from '@mui/icons-material';
import { bulkImportService, BulkImportItem, BulkImportResult } from '../../services/bulkImport.service';
import { libraryApi } from '../../api/library.api';

export interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ 
  open, 
  onClose, 
  onImportComplete 
}) => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [scannedItems, setScannedItems] = useState<BulkImportItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
  
  // Manga selection
  const [existingMangas, setExistingMangas] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedMangaOption, setSelectedMangaOption] = useState<string>('auto'); // 'auto', 'create-new', or manga ID
  const [newMangaTitle, setNewMangaTitle] = useState('');

  // Load existing mangas when dialog opens
  useEffect(() => {
    if (open) {
      loadExistingMangas();
    }
  }, [open]);

  const loadExistingMangas = async () => {
    try {
      const mangas = await libraryApi.getAllManga();
      setExistingMangas(mangas.map(m => ({ id: m.id, title: m.title })));
    } catch (err) {
      console.error('Failed to load existing mangas:', err);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      // Check if running in Electron
      if (window.electronAPI?.openFolderDialog) {
        const path = await window.electronAPI.openFolderDialog();
        if (path) {
          setDirectoryPath(path);
          setError('');
        }
      } else {
        setError('Folder selection is only available in the desktop app');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select directory');
    }
  };

  const handleScan = async () => {
    if (!directoryPath) {
      setError('Please select a directory');
      return;
    }

    setScanning(true);
    setError('');
    setScannedItems([]);
    setSelectedItems(new Set());

    try {
      const items = await bulkImportService.scanDirectory(directoryPath, recursive);
      setScannedItems(items);
      
      // Select all items by default
      setSelectedItems(new Set(items.map((_, index) => index)));
      
      if (items.length === 0) {
        setError('No manga files found in the selected directory');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan directory');
    } finally {
      setScanning(false);
    }
  };

  const handleToggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedItems.size === scannedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(scannedItems.map((_, index) => index)));
    }
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) {
      setError('Please select at least one item to import');
      return;
    }

    // Validate manga selection
    let mangaTitleToUse: string | undefined;
    
    if (selectedMangaOption === 'create-new') {
      if (!newMangaTitle.trim()) {
        setError('Please enter a manga title');
        return;
      }
      mangaTitleToUse = newMangaTitle.trim();
    } else if (selectedMangaOption !== 'auto') {
      // Using existing manga - find its title
      const selectedManga = existingMangas.find(m => m.id === selectedMangaOption);
      if (selectedManga) {
        mangaTitleToUse = selectedManga.title;
      }
    }

    setImporting(true);
    setError('');
    setResult(null);
    
    const itemsToImport = Array.from(selectedItems).map(index => scannedItems[index]);
    setProgress({ current: 0, total: itemsToImport.length, currentFile: '' });

    try {
      const importResult = await bulkImportService.bulkImport(itemsToImport, {
        mangaTitleOverride: mangaTitleToUse,
        onProgress: (prog) => setProgress(prog),
      });
      
      setResult(importResult);
      
      if (importResult.queued > 0) {
        onImportComplete?.();
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing && !scanning) {
      setDirectoryPath('');
      setRecursive(false);
      setError('');
      setScannedItems([]);
      setSelectedItems(new Set());
      setResult(null);
      setSelectedMangaOption('auto');
      setNewMangaTitle('');
      setProgress({ current: 0, total: 0, currentFile: '' });
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'success';
      case 'skipped':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Import Manga</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {!result && !scannedItems.length && (
            <>
              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Bulk import supports:
                </Typography>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  <li><strong>.cbz files</strong> - Will be processed with OCR</li>
                  <li><strong>Pre-processed mokuro</strong> - Folder + .mokuro file with same name</li>
                  <li><strong>Image folders</strong> - Folders containing manga images (will be processed)</li>
                </ul>
              </Alert>

              {/* Directory Selection */}
              <Box>
                <TextField
                  label="Directory Path"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  fullWidth
                  disabled={scanning || importing}
                  InputProps={{
                    readOnly: !!window.electronAPI,
                    endAdornment: (
                      <Button
                        startIcon={<FolderOpen />}
                        onClick={handleSelectDirectory}
                        disabled={scanning || importing}
                      >
                        Browse
                      </Button>
                    ),
                  }}
                  helperText="Select a directory containing manga files to import"
                />
              </Box>

              {/* Recursive toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={recursive}
                    onChange={(e) => setRecursive(e.target.checked)}
                    disabled={scanning || importing}
                  />
                }
                label="Scan subdirectories (recursive)"
              />

              {scanning && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Scanning directory...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </>
          )}

          {/* Scanned Items Preview */}
          {scannedItems.length > 0 && !result && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Found {scannedItems.length} manga volume(s) - {selectedItems.size} selected
              </Alert>

              {/* Manga Selection */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Import to Manga</InputLabel>
                <Select
                  value={selectedMangaOption}
                  onChange={(e) => setSelectedMangaOption(e.target.value)}
                  disabled={importing}
                  label="Import to Manga"
                >
                  <MenuItem value="auto">Auto-detect (may create multiple manga)</MenuItem>
                  <MenuItem value="create-new">Create new manga for all volumes</MenuItem>
                  {existingMangas.length > 0 && [
                    <MenuItem key="divider" disabled sx={{ borderTop: 1, borderColor: 'divider', mt: 1, pt: 1 }}>
                      <em>Add to existing manga:</em>
                    </MenuItem>,
                    ...existingMangas.map(manga => (
                      <MenuItem key={manga.id} value={manga.id}>
                        {manga.title}
                      </MenuItem>
                    ))
                  ]}
                </Select>
              </FormControl>

              {/* New manga title input */}
              {selectedMangaOption === 'create-new' && (
                <TextField
                  label="New Manga Title"
                  value={newMangaTitle}
                  onChange={(e) => setNewMangaTitle(e.target.value)}
                  fullWidth
                  disabled={importing}
                  required
                  helperText="This title will be used for all imported volumes"
                  sx={{ mb: 2 }}
                />
              )}

              {/* Select all checkbox */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedItems.size === scannedItems.length}
                      indeterminate={selectedItems.size > 0 && selectedItems.size < scannedItems.length}
                      onChange={handleToggleAll}
                      disabled={importing}
                    />
                  }
                  label={
                    <Typography variant="subtitle2" fontWeight="bold">
                      Select All ({selectedItems.size}/{scannedItems.length})
                    </Typography>
                  }
                />
              </Box>

              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List dense>
                  {scannedItems.map((item, index) => (
                    <ListItem 
                      key={index}
                      sx={{ 
                        bgcolor: selectedItems.has(index) ? 'action.selected' : 'action.hover', 
                        mb: 0.5, 
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleItem(index)}
                    >
                      <Checkbox
                        checked={selectedItems.has(index)}
                        disabled={importing}
                        sx={{ mr: 1 }}
                      />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {item.mangaTitle} Vol. {item.volumeNumber}
                            </Typography>
                            <Chip 
                              label={item.type} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {item.fileName}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {importing && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Uploading: {progress.currentFile} ({progress.current}/{progress.total})
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(progress.current / progress.total) * 100} 
                  />
                </Box>
              )}
            </>
          )}

          {/* Results */}
          {result && (
            <Box>
              <Alert severity={result.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                <Typography variant="body1" fontWeight="bold">
                  Import Summary
                </Typography>
                <Typography variant="body2">
                  Found: {result.found} | Queued: {result.queued} | Skipped: {result.skipped} | Failed: {result.failed}
                </Typography>
              </Alert>

              {result.items && result.items.length > 0 && (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Items:
                  </Typography>
                  <List dense>
                    {result.items.map((item: any, index: number) => (
                      <ListItem 
                        key={index}
                        sx={{ 
                          bgcolor: 'action.hover', 
                          mb: 0.5, 
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'flex-start',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {item.mangaTitle} Vol. {item.volumeNumber}
                              </Typography>
                              <Chip 
                                label={item.type} 
                                size="small" 
                                variant="outlined"
                              />
                              <Chip 
                                label={item.status} 
                                size="small" 
                                color={getStatusColor(item.status)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {item.path}
                              </Typography>
                              {item.error && (
                                <Typography variant="caption" color="error" display="block">
                                  Error: {item.error}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing || scanning}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && !scannedItems.length && (
          <Button
            onClick={handleScan}
            variant="contained"
            disabled={!directoryPath || scanning || importing}
            startIcon={scanning ? <CircularProgress size={20} /> : <FolderOpen />}
          >
            {scanning ? 'Scanning...' : 'Scan Directory'}
          </Button>
        )}
        {scannedItems.length > 0 && !result && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={importing || selectedItems.size === 0}
            startIcon={importing ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {importing ? `Uploading... (${progress.current}/${progress.total})` : `Import ${selectedItems.size} Volume(s)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkImportDialog;

