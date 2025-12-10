import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, registerUser } from '../../store/auth.thunks';
import { clearError } from '../../store/auth.slice';
import { updateAppSettings } from '../../store/app-settings.slice';
import { updateApiBaseUrl } from '../../api/api-client';
import LoginPage from '../pure/LoginPage';
import RegisterPage from '../pure/RegisterPage';
import ServerManagement from './ServerManagement';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error, isLoading } = useAppSelector((state) => state.auth);
  const appSettings = useAppSelector((state) => state.appSettings.settings);

  // Check if we're in Electron environment
  const isElectron = !!(window as any).electronAPI;

  const handleLogin = async (username: string, password: string) => {
    try {
      await dispatch(loginUser({ username, password }));
      navigate('/library');
    } catch (err) {
      // Error is handled by Redux
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      await dispatch(registerUser({ username, password }));
      navigate('/library');
    } catch (err) {
      // Error is handled by Redux
    }
  };

  const handleSwitchMode = () => {
    dispatch(clearError());
    setIsLogin(!isLogin);
  };

  const handleBackendEndpointChange = (endpoint: string) => {
    dispatch(updateAppSettings({ backendEndpoint: endpoint }));
    updateApiBaseUrl(endpoint);
  };

  const handleOpenServerManagement = () => {
    setServerDialogOpen(true);
  };

  const handleCloseServerManagement = () => {
    setServerDialogOpen(false);
  };

  if (isLogin) {
    return (
      <>
        <LoginPage
          onLogin={handleLogin}
          onSwitchToRegister={handleSwitchMode}
          error={error}
          isLoading={isLoading}
          backendEndpoint={appSettings.backendEndpoint}
          onBackendEndpointChange={handleBackendEndpointChange}
          serverMode={appSettings.serverMode}
          showServerManagement={isElectron && appSettings.serverMode === 'standalone'}
          onOpenServerManagement={handleOpenServerManagement}
        />
        
        {/* Server Management Dialog */}
        <Dialog
          open={serverDialogOpen}
          onClose={handleCloseServerManagement}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Server Management</span>
              <IconButton onClick={handleCloseServerManagement}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <ServerManagement />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <RegisterPage
      onRegister={handleRegister}
      onSwitchToLogin={handleSwitchMode}
      error={error}
      isLoading={isLoading}
    />
  );
};

export default AuthPage;

