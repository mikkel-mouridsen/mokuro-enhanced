import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';

export interface YomitanDialogProps {
  open: boolean;
  isInstalled: boolean;
  isEnabled: boolean;
  installing: boolean;
  error: string | null;
  onClose: () => void;
  onInstall: () => void;
  onToggle: () => void;
}

const YomitanDialog: React.FC<YomitanDialogProps> = ({
  open,
  isInstalled,
  isEnabled,
  installing,
  error,
  onClose,
  onInstall,
  onToggle,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Yomitan Integration</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1">Status:</Typography>
            <Chip
              icon={isInstalled ? <CheckCircleIcon /> : <WarningIcon />}
              label={isInstalled ? 'Installed' : 'Not Installed'}
              color={isInstalled ? 'success' : 'warning'}
              size="small"
            />
            {isInstalled && (
              <Chip
                label={isEnabled ? 'Enabled' : 'Disabled'}
                color={isEnabled ? 'success' : 'default'}
                size="small"
              />
            )}
          </Box>

          {/* Description */}
          <Typography variant="body2" color="text.secondary">
            Yomitan is a browser extension for popup dictionaries that works with Japanese text.
            When enabled, you can hover over Japanese text in the manga reader to get instant
            translations and definitions.
          </Typography>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}

          {/* Installation Section */}
          {!isInstalled && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                To use Yomitan with Mokuro Enhanced Reader, you need to install the extension.
              </Typography>
              <Button
                variant="contained"
                startIcon={installing ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={onInstall}
                disabled={installing}
                fullWidth
                sx={{ mt: 1 }}
              >
                {installing ? 'Installing...' : 'Install Yomitan'}
              </Button>
            </Box>
          )}

          {/* Enable/Disable Section */}
          {isInstalled && (
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={onToggle} fullWidth>
                {isEnabled ? 'Disable Yomitan' : 'Enable Yomitan'}
              </Button>
            </Box>
          )}

          {/* Info */}
          <Alert severity="info" sx={{ mt: 2 }}>
            Note: After installation, you may need to configure Yomitan dictionaries separately.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default YomitanDialog;

