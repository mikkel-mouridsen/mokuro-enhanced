/**
 * Dictionary Manager Component
 * 
 * UI for managing dictionaries: import, enable/disable, delete, and view statistics.
 * Production-ready with proper error handling and user feedback.
 * 
 * Features:
 * - Dictionary import with progress tracking
 * - Enable/disable dictionaries
 * - Delete dictionaries with confirmation
 * - View database statistics
 * - Responsive design for mobile and desktop
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  IconButton,
  Typography,
  LinearProgress,
  Alert,
  Divider,
  Stack,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { dictionaryDatabase } from '../../services/dictionary/dictionary-database.service';

interface DictionaryInfo {
  title: string;
  revision: string;
  enabled: boolean;
  priority: number;
  format: number;
}

interface ImportProgress {
  progress: number;
  status: string;
  error?: string;
}

export interface DictionaryManagerProps {
  open: boolean;
  onClose: () => void;
}

const DictionaryManager: React.FC<DictionaryManagerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [dictionaries, setDictionaries] = useState<DictionaryInfo[]>([]);
  const [statistics, setStatistics] = useState<{
    dictionaries: number;
    terms: number;
    kanji: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load dictionaries on mount
  useEffect(() => {
    if (open) {
      loadDictionaries();
      loadStatistics();
    }
  }, [open]);

  /**
   * Load dictionary list
   */
  const loadDictionaries = async () => {
    setLoading(true);
    setError(null);

    try {
      await dictionaryDatabase.initialize();
      const dicts = await dictionaryDatabase.getDictionaries();
      setDictionaries(dicts.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title)));
    } catch (err) {
      console.error('Failed to load dictionaries:', err);
      setError('Failed to load dictionaries');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load database statistics
   */
  const loadStatistics = async () => {
    try {
      await dictionaryDatabase.initialize();
      const stats = await dictionaryDatabase.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  /**
   * Handle dictionary import
   */
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      setError('Please select a valid dictionary ZIP file');
      return;
    }

    setImporting(true);
    setImportProgress({ progress: 0, status: 'Starting import...' });
    setError(null);

    try {
      await dictionaryDatabase.importDictionary(file, (progress, status) => {
        setImportProgress({ progress, status });
      });

      // Reload dictionaries and statistics
      await loadDictionaries();
      await loadStatistics();

      setImportProgress({
        progress: 100,
        status: 'Dictionary imported successfully!',
      });

      // Clear progress after 2 seconds
      setTimeout(() => {
        setImportProgress(null);
        setImporting(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to import dictionary:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import dictionary';
      setError(errorMessage);
      setImportProgress({
        progress: 0,
        status: '',
        error: errorMessage,
      });
      setImporting(false);
    }

    // Reset file input
    event.target.value = '';
  };

  /**
   * Toggle dictionary enabled state
   */
  const handleToggle = async (title: string, enabled: boolean) => {
    try {
      await dictionaryDatabase.toggleDictionary(title, enabled);
      await loadDictionaries();
    } catch (err) {
      console.error('Failed to toggle dictionary:', err);
      setError('Failed to update dictionary');
    }
  };

  /**
   * Delete dictionary
   */
  const handleDelete = async (title: string) => {
    setLoading(true);
    setError(null);

    try {
      await dictionaryDatabase.deleteDictionary(title);
      await loadDictionaries();
      await loadStatistics();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete dictionary:', err);
      setError('Failed to delete dictionary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Dictionary Manager</Typography>
          {statistics && (
            <Tooltip title="Database Statistics">
              <Chip
                icon={<InfoIcon />}
                label={`${statistics.dictionaries} dicts, ${statistics.terms.toLocaleString()} terms`}
                size="small"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Import Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Import Dictionary
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Import Yomitan-compatible dictionary ZIP files. You can download dictionaries from{' '}
            <a
              href="https://github.com/themoeway/yomitan#dictionaries"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.palette.primary.main }}
            >
              the Yomitan dictionary repository
            </a>
            .
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadIcon />}
              disabled={importing}
            >
              Select Dictionary ZIP
              <input
                type="file"
                hidden
                accept=".zip"
                onChange={handleImport}
                disabled={importing}
              />
            </Button>

            {importProgress && (
              <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  {importProgress.error ? (
                    <ErrorIcon color="error" fontSize="small" />
                  ) : importProgress.progress === 100 ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <CircularProgress size={16} />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {importProgress.status}
                  </Typography>
                </Stack>
                {!importProgress.error && (
                  <LinearProgress
                    variant="determinate"
                    value={importProgress.progress}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                )}
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Dictionary List */}
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          Installed Dictionaries ({dictionaries.length})
        </Typography>

        {loading && dictionaries.length === 0 ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : dictionaries.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No dictionaries installed. Import a dictionary to get started.
          </Alert>
        ) : (
          <List>
            {dictionaries.map((dict, index) => (
              <React.Fragment key={dict.title}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1">{dict.title}</Typography>
                        {dict.enabled && (
                          <Chip label="Active" size="small" color="success" variant="outlined" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Revision: {dict.revision} • Format: v{dict.format}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Switch
                        edge="end"
                        checked={dict.enabled}
                        onChange={(e) => handleToggle(dict.title, e.target.checked)}
                        disabled={loading}
                      />
                      <Tooltip title="Delete Dictionary">
                        <IconButton
                          edge="end"
                          onClick={() => setDeleteConfirm(dict.title)}
                          disabled={loading}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Statistics */}
        {statistics && dictionaries.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Database Statistics
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="h4" color="primary.main">
                  {statistics.terms.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Term Entries
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="primary.main">
                  {statistics.kanji.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Kanji Entries
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the dictionary "{deleteConfirm}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DictionaryManager;

