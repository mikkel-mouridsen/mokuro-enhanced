import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store/store';
import { darkTheme } from './theme/theme';
import MainLayout from './components/connected/MainLayout';
import Library from './components/connected/Library';
import AuthPage from './components/connected/AuthPage';
import ProtectedRoute from './components/connected/ProtectedRoute';
import WelcomeScreen from './components/pure/WelcomeScreen';
import { getBasePath } from './utils/navigation';
import { isElectron } from './platform/platform.detector';

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use HashRouter for Electron, BrowserRouter for Web
  const Router = isElectron() ? HashRouter : BrowserRouter;

  useEffect(() => {
    // Check if this is the first run (no server mode configured)
    const checkFirstRun = () => {
      try {
        const savedSettings = localStorage.getItem('appSettings');
        if (!savedSettings) {
          // First run - show welcome screen
          setShowWelcome(true);
        } else {
          const parsed = JSON.parse(savedSettings);
          // If serverMode is not set, show welcome screen
          if (!parsed.serverMode) {
            setShowWelcome(true);
          }
        }
      } catch (error) {
        console.error('Failed to check first run:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    checkFirstRun();
  }, []);

  const handleModeSelection = (mode: 'cloud' | 'standalone' | 'offline') => {
    // Save the selected mode
    const settings = {
      serverMode: mode,
      backendEndpoint: mode === 'standalone' ? 'http://localhost:3000' : 'http://localhost:3000',
      standaloneServerEnabled: mode === 'standalone',
    };
    
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save mode selection:', error);
    }

    setShowWelcome(false);
    // Force reload to apply settings
    window.location.reload();
  };

  // Show loading state while checking
  if (!isInitialized) {
    return null;
  }

  // Show welcome screen on first run
  if (showWelcome) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <WelcomeScreen onSelectMode={handleModeSelection} />
      </ThemeProvider>
    );
  }

  return (
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Router basename={isElectron() ? undefined : getBasePath()}>
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
        </Router>
      </ThemeProvider>
    </Provider>
  );
};

export default App;

