import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  Collapse,
} from '@mui/material';
import { Visibility, VisibilityOff, Settings as SettingsIcon } from '@mui/icons-material';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  error: string | null;
  isLoading: boolean;
  backendEndpoint?: string;
  onBackendEndpointChange?: (endpoint: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onSwitchToRegister,
  error,
  isLoading,
  backendEndpoint = 'http://localhost:3000',
  onBackendEndpointChange,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localBackendEndpoint, setLocalBackendEndpoint] = useState(backendEndpoint);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (!username.trim()) {
      setLocalError('Username is required');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      // Error is handled by Redux
    }
  };

  const handleBackendEndpointSave = () => {
    if (onBackendEndpointChange) {
      onBackendEndpointChange(localBackendEndpoint);
      setShowSettings(false);
    }
  };

  const displayError = error || localError;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        // Background image
        backgroundImage: 'url(/assets/images/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Color overlay
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.85) 0%, rgba(118, 75, 162, 0.85) 100%)',
          zIndex: 1,
        },
      }}
    >
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 2 }}>
        <Paper
          elevation={10}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
            backgroundColor: 'rgba(18, 18, 18, 0.85)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box
            component="img"
            src="/assets/icon/icon-512.png"
            alt="Mokuro Enhanced"
            sx={{
              width: 80,
              height: 80,
              mb: 2,
              borderRadius: 2,
            }}
          />
          <Typography component="h1" variant="h4" gutterBottom fontWeight="bold">
            Mokuro Enhanced
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sign in to your account
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
            {displayError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {displayError}
              </Alert>
            )}

            {/* Backend Settings Toggle */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                startIcon={<SettingsIcon />}
                onClick={() => setShowSettings(!showSettings)}
                size="small"
                variant="text"
              >
                Backend Settings
              </Button>
            </Box>

            {/* Backend Settings Section */}
            <Collapse in={showSettings}>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Backend Server Configuration
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Backend URL"
                  value={localBackendEndpoint}
                  onChange={(e) => setLocalBackendEndpoint(e.target.value)}
                  placeholder="http://localhost:3000"
                  sx={{ mb: 1 }}
                />
                <Button
                  onClick={handleBackendEndpointSave}
                  variant="contained"
                  size="small"
                  fullWidth
                >
                  Save Backend URL
                </Button>
              </Paper>
            </Collapse>

            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onSwitchToRegister}
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Register
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;

