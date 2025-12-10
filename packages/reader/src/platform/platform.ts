/**
 * Platform API singleton
 * Automatically detects and provides the correct platform implementation
 */

import { IPlatformAPI } from './platform.types';
import { detectPlatform } from './platform.detector';
import { ElectronPlatform } from './electron.platform';
import { WebPlatform } from './web.platform';
import { Platform } from './platform.types';

let platformInstance: IPlatformAPI | null = null;

/**
 * Get the platform API instance
 */
export function getPlatformAPI(): IPlatformAPI {
  if (!platformInstance) {
    const platform = detectPlatform();
    platformInstance = platform === Platform.ELECTRON 
      ? new ElectronPlatform() 
      : new WebPlatform();
  }
  return platformInstance;
}

/**
 * Reset platform instance (useful for testing)
 */
export function resetPlatformAPI(): void {
  platformInstance = null;
}

// Export everything from types and detector
export * from './platform.types';
export * from './platform.detector';

