import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
  timestamp: number;
}

interface UseProgressUpdatesOptions {
  onProgressUpdate?: (update: ProgressUpdate) => void;
  autoConnect?: boolean;
}

/**
 * Hook to receive real-time progress updates via WebSocket
 */
export function useProgressUpdates(options: UseProgressUpdatesOptions = {}) {
  const { onProgressUpdate, autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Get API base URL from environment
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // Connect to progress WebSocket namespace
    const socket = io(`${API_BASE_URL}/progress`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to progress updates WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from progress updates WebSocket');
    });

    socket.on('processing.progress', (update: ProgressUpdate) => {
      console.log('Progress update received:', update);
      if (onProgressUpdate) {
        onProgressUpdate(update);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [autoConnect, onProgressUpdate]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  return {
    socket: socketRef.current,
    disconnect,
    reconnect,
  };
}

