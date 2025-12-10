import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Container,
  Grid,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import {
  Cloud,
  Computer,
  FolderOpen,
  CloudOff,
  Speed,
  Sync,
  Security,
  Devices,
} from '@mui/icons-material';

export interface WelcomeScreenProps {
  onSelectMode: (mode: 'cloud' | 'standalone' | 'offline') => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectMode }) => {
  const modes = [
    {
      id: 'cloud' as const,
      icon: <Cloud sx={{ fontSize: 60 }} />,
      title: 'Connect to Cloud Server',
      description: 'Connect to your existing Mokuro Enhanced server in the cloud',
      features: [
        { icon: <Sync />, text: 'Full sync across devices' },
        { icon: <Cloud />, text: 'OCR processing in the cloud' },
        { icon: <Devices />, text: 'Access from anywhere' },
        { icon: <Security />, text: 'Secure cloud storage' },
      ],
      color: '#2196F3',
    },
    {
      id: 'standalone' as const,
      icon: <Computer sx={{ fontSize: 60 }} />,
      title: 'Integrated Server',
      description: 'Run the full server stack locally on your computer',
      features: [
        { icon: <Computer />, text: 'Complete features locally' },
        { icon: <CloudOff />, text: 'No cloud required' },
        { icon: <Devices />, text: 'Share on local network' },
        { icon: <Speed />, text: 'Local OCR processing' },
      ],
      color: '#4CAF50',
      badge: 'Recommended for beginners',
    },
    {
      id: 'offline' as const,
      icon: <FolderOpen sx={{ fontSize: 60 }} />,
      title: 'Offline Mode',
      description: 'Read pre-processed manga files from your local folders',
      features: [
        { icon: <FolderOpen />, text: 'Browse local manga' },
        { icon: <CloudOff />, text: 'Fully offline' },
        { icon: <Speed />, text: 'Instant access' },
        { icon: <Computer />, text: 'No setup required' },
      ],
      color: '#FF9800',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" gutterBottom fontWeight="bold">
              Welcome to Mokuro Enhanced
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Choose how you want to use the reader
            </Typography>
            <Divider sx={{ my: 3 }} />
          </Box>

          {/* Mode Cards */}
          <Grid container spacing={3}>
            {modes.map((mode) => (
              <Grid item xs={12} md={4} key={mode.id}>
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    border: '2px solid transparent',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: mode.color,
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  {mode.badge && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: mode.color,
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        zIndex: 1,
                      }}
                    >
                      {mode.badge}
                    </Box>
                  )}
                  <CardActionArea
                    onClick={() => onSelectMode(mode.id)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Icon */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          mb: 2,
                          color: mode.color,
                        }}
                      >
                        {mode.icon}
                      </Box>

                      {/* Title & Description */}
                      <Typography variant="h5" gutterBottom fontWeight="bold" textAlign="center">
                        {mode.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                        textAlign="center"
                        sx={{ mb: 3 }}
                      >
                        {mode.description}
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      {/* Features */}
                      <Box sx={{ flex: 1 }}>
                        {mode.features.map((feature, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              mb: 1.5,
                            }}
                          >
                            <Box sx={{ color: mode.color, display: 'flex' }}>
                              {feature.icon}
                            </Box>
                            <Typography variant="body2">{feature.text}</Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Action Button */}
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          mt: 2,
                          bgcolor: mode.color,
                          '&:hover': {
                            bgcolor: mode.color,
                            filter: 'brightness(0.9)',
                          },
                        }}
                      >
                        Select
                      </Button>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Additional Info */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              You can change this later in the settings
            </Typography>
          </Box>

          {/* Requirements Notice */}
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'info.light' }}>
            <Typography variant="body2" gutterBottom fontWeight="bold">
              📋 Requirements for Integrated Server:
            </Typography>
            <Typography variant="body2">
              • Docker Desktop installed and running<br />
              • ~2GB disk space for Docker images<br />
              • 4GB+ RAM recommended
            </Typography>
          </Paper>
        </Paper>
      </Container>
    </Box>
  );
};

export default WelcomeScreen;

