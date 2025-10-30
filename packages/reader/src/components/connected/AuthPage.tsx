import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, registerUser } from '../../store/auth.thunks';
import { clearError } from '../../store/auth.slice';
import LoginPage from '../pure/LoginPage';
import RegisterPage from '../pure/RegisterPage';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error, isLoading } = useAppSelector((state) => state.auth);

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

  if (isLogin) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={handleSwitchMode}
        error={error}
        isLoading={isLoading}
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

