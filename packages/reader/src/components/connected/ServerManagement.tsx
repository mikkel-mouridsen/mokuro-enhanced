import React, { useState, useEffect } from 'react';
import ServerManagementPanel, { ServerStackStatus, NetworkInfo } from '../pure/ServerManagementPanel';

// Electron IPC bridge
const electronAPI = (window as any).electronAPI || (window as any).electron;

interface DockerStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
}

const ServerManagement: React.FC = () => {
  const [dockerStatus, setDockerStatus] = useState<DockerStatus>({ installed: false, running: false });
  const [stackStatus, setStackStatus] = useState<ServerStackStatus | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const checkDockerStatus = async () => {
    if (!electronAPI) return;

    try {
      const status = await electronAPI.invoke('docker:check-status');
      setDockerStatus(status);

      if (status.running) {
        await refreshStackStatus();
      }
    } catch (err) {
      console.error('Failed to check Docker status:', err);
      setError('Failed to check Docker status');
    }
  };

  const refreshStackStatus = async () => {
    if (!electronAPI) return;

    try {
      const status = await electronAPI.invoke('docker:get-stack-status');
      setStackStatus(status);

      if (status.isRunning) {
        const networks = await electronAPI.invoke('docker:get-network-info');
        setNetworkInfo(networks);
      } else {
        setNetworkInfo([]);
      }
    } catch (err) {
      console.error('Failed to get stack status:', err);
    }
  };

  const handleStartServer = async () => {
    if (!electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.invoke('docker:start-stack');

      if (result.success) {
        // Wait a bit for containers to start
        setTimeout(async () => {
          await refreshStackStatus();
          
          // Try to create default user
          const userResult = await electronAPI.invoke('docker:create-default-user');
          if (userResult.success && userResult.username && userResult.password) {
            alert(
              `Default user created!\n\nUsername: ${userResult.username}\nPassword: ${userResult.password}\n\nPlease save these credentials!`
            );
          }
        }, 5000);
      } else {
        setError(result.error || 'Failed to start server');
      }
    } catch (err) {
      console.error('Failed to start server:', err);
      setError('Failed to start server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopServer = async () => {
    if (!electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.invoke('docker:stop-stack');

      if (result.success) {
        await refreshStackStatus();
      } else {
        setError(result.error || 'Failed to stop server');
      }
    } catch (err) {
      console.error('Failed to stop server:', err);
      setError('Failed to stop server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartServer = async () => {
    if (!electronAPI) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await electronAPI.invoke('docker:restart-stack');

      if (result.success) {
        setTimeout(() => refreshStackStatus(), 3000);
      } else {
        setError(result.error || 'Failed to restart server');
      }
    } catch (err) {
      console.error('Failed to restart server:', err);
      setError('Failed to restart server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowQRCode = (url: string) => {
    setQrCodeUrl(url);
    // You could show this in a modal/dialog
    // For now, just log it
    console.log('QR Code URL:', url);
  };

  useEffect(() => {
    checkDockerStatus();

    // Poll for status updates every 30 seconds
    const interval = setInterval(() => {
      if (dockerStatus.running) {
        refreshStackStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [dockerStatus.running]);

  if (!electronAPI) {
    return (
      <div>
        <p>Server management is only available in the desktop app.</p>
      </div>
    );
  }

  return (
    <ServerManagementPanel
      dockerInstalled={dockerStatus.installed}
      dockerRunning={dockerStatus.running}
      stackStatus={stackStatus}
      networkInfo={networkInfo}
      isLoading={isLoading}
      error={error}
      onStartServer={handleStartServer}
      onStopServer={handleStopServer}
      onRestartServer={handleRestartServer}
      onRefreshStatus={refreshStackStatus}
      onShowQRCode={handleShowQRCode}
    />
  );
};

export default ServerManagement;

