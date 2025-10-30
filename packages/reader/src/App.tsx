import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store/store';
import { darkTheme } from './theme/theme';
import MainLayout from './components/connected/MainLayout';
import Library from './components/connected/Library';
import AuthPage from './components/connected/AuthPage';
import ProtectedRoute from './components/connected/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected Library Routes */}
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library/:mangaId"
              element={
                <ProtectedRoute>
                  <Library />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Reader Routes */}
            <Route
              path="/reader"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reader/:mangaId/:volumeId"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
            
            {/* Default Route - Redirect to Library */}
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="*" element={<Navigate to="/library" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

export default App;

