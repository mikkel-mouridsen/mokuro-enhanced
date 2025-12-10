/**
 * Platform detection utilities
 */

import { Platform } from './platform.types';

/**
 * Detect if running in Electron environment
 */
export function isElectron(): boolean {
  // Check if running in Electron by looking for electronAPI
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Detect current platform
 */
export function detectPlatform(): Platform {
  return isElectron() ? Platform.ELECTRON : Platform.WEB;
}

/**
 * Check if a feature is supported on current platform
 */
export function isFeatureSupported(feature: keyof IPlatformAPI): boolean {
  const platform = detectPlatform();
  
  // Features only available on Electron
  const electronOnlyFeatures = [
    'openFileDialog',
    'openFolderDialog',
    'readDirectory',
    'scanDirectoryForManga',
    'readFileAsBuffer',
    'createMokuroZip',
    'createImagesZip',
    'checkYomitanInstalled',
    'installYomitan',
    'openYomitanSettings',
    'checkYomitanLoaded',
    'getYomitanExtensionId',
    'sendYomitanEvent',
    'getAppPath',
  ];

  if (electronOnlyFeatures.includes(feature as string)) {
    return platform === Platform.ELECTRON;
  }

  return true;
}

// Re-export for convenience
import type { IPlatformAPI } from './platform.types';

