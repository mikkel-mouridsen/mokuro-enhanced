import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, registerUser } from '../../store/auth.thunks';
import { clearError } from '../../store/auth.slice';
import { updateAppSettings } from '../../store/app-settings.slice';
import { updateApiBaseUrl } from '../../api/api-client';
import LoginPage from '../pure/LoginPage';
import RegisterPage from '../pure/RegisterPage';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error, isLoading } = useAppSelector((state) => state.auth);
  const appSettings = useAppSelector((state) => state.appSettings.settings);

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

  if (isLogin) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={handleSwitchMode}
        error={error}
        isLoading={isLoading}
        backendEndpoint={appSettings.backendEndpoint}
        onBackendEndpointChange={handleBackendEndpointChange}
      />
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

