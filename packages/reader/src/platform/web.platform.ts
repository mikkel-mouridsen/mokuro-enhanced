/**
 * Web platform implementation
 * Provides limited functionality compared to Electron
 */

import { IPlatformAPI, Platform } from './platform.types';

/**
 * Web platform API implementation
 * Most Electron-specific features are not available
 */
export class WebPlatform implements IPlatformAPI {
  readonly platform = Platform.WEB;
  readonly isElectron = false;
  readonly isWeb = true;

  // No file system access in web
  // No bundled Yomitan in web (user must install their own)
  // All desktop-specific features are undefined
}

