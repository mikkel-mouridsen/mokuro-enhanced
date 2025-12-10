import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Collapse,
  Paper,
  Grid,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  ContentCopy,
  QrCode2,
} from '@mui/icons-material';

export interface ContainerStatus {
  name: string;
  state: 'running' | 'stopped' | 'starting' | 'error';
  health?: 'healthy' | 'unhealthy' | 'starting';
}

export interface ServerStackStatus {
  isRunning: boolean;
  containers: ContainerStatus[];
  serverUrl?: string;
  error?: string;
}

export interface NetworkInfo {
  localIp: string;
  serverUrl: string;
}

export interface ServerManagementPanelProps {
  dockerInstalled: boolean;
  dockerRunning: boolean;
  stackStatus: ServerStackStatus | null;
  networkInfo: NetworkInfo[];
  isLoading: boolean;
  error: string | null;
  onStartServer: () => void;
  onStopServer: () => void;
  onRestartServer: () => void;
  onRefreshStatus: () => void;
  onShowQRCode: (url: string) => void;
}

const ServerManagementPanel: React.FC<ServerManagementPanelProps> = ({
  dockerInstalled,
  dockerRunning,
  stackStatus,
  networkInfo,
  isLoading,
  error,
  onStartServer,
  onStopServer,
  onRestartServer,
  onRefreshStatus,
  onShowQRCode,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'success';
      case 'starting':
        return 'warning';
      case 'stopped':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (health?: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle color="success" fontSize="small" />;
      case 'unhealthy':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'starting':
        return <CircularProgress size={16} />;
      default:
        return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!dockerInstalled) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="h6" gutterBottom>
              Docker Not Installed
            </Typography>
            <Typography variant="body2" gutterBottom>
              To use the integrated server, you need to install Docker Desktop.
            </Typography>
            <Button
              variant="contained"
              href="https://www.docker.com/products/docker-desktop"
              target="_blank"
              sx={{ mt: 2 }}
            >
              Download Docker Desktop
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!dockerRunning) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="h6" gutterBottom>
              Docker Not Running
            </Typography>
            <Typography variant="body2">
              Docker is installed but not running. Please start Docker Desktop and try again.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Integrated Server
          </Typography>
          <IconButton onClick={onRefreshStatus} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Server Status */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              Status:
            </Typography>
            <Chip
              label={stackStatus?.isRunning ? 'Running' : 'Stopped'}
              color={stackStatus?.isRunning ? 'success' : 'default'}
              icon={stackStatus?.isRunning ? <CheckCircle /> : undefined}
            />
          </Box>

          {stackStatus?.serverUrl && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Server URL:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontFamily="monospace">
                  {stackStatus.serverUrl}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(stackStatus.serverUrl!)}
                  title="Copy to clipboard"
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          )}

          {/* Control Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {!stackStatus?.isRunning ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={onStartServer}
                disabled={isLoading}
              >
                Start Server
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <Stop />}
                  onClick={onStopServer}
                  disabled={isLoading}
                >
                  Stop Server
                </Button>
                <Button
                  variant="outlined"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <Refresh />}
                  onClick={onRestartServer}
                  disabled={isLoading}
                >
                  Restart Server
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Container Details */}
        {stackStatus && stackStatus.containers.length > 0 && (
          <>
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowDetails(!showDetails)}
            >
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Containers ({stackStatus.containers.length})
              </Typography>
              <IconButton size="small">
                {showDetails ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            </Box>

            <Collapse in={showDetails}>
              <List dense>
                {stackStatus.containers.map((container, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={container.name}
                      secondary={container.state}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={container.state}
                        size="small"
                        color={getStatusColor(container.state) as any}
                      />
                      {getHealthIcon(container.health)}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Network Info for Mobile Access */}
        {stackStatus?.isRunning && networkInfo.length > 0 && (
          <>
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowNetworkInfo(!showNetworkInfo)}
            >
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Network Access (Connect from Mobile)
              </Typography>
              <IconButton size="small">
                {showNetworkInfo ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            </Box>

            <Collapse in={showNetworkInfo}>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Use these URLs to connect from devices on the same network
                </Alert>
                <Grid container spacing={2}>
                  {networkInfo.map((info, index) => (
                    <Grid item xs={12} key={index}>
                      <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {info.localIp}
                            </Typography>
                            <Typography variant="body2" fontFamily="monospace">
                              {info.serverUrl}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(info.serverUrl)}
                              title="Copy URL"
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => onShowQRCode(info.serverUrl)}
                              title="Show QR Code"
                            >
                              <QrCode2 fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </>
        )}

        {/* First-time Setup Notice */}
        {!stackStatus?.isRunning && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>First time setup:</strong> Starting the server will download Docker images
              (~1-2GB). This may take a few minutes on first launch.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ServerManagementPanel;

