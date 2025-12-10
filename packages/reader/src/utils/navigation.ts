/**
 * Navigation utilities for handling base path in web builds
 */

import { detectPlatform } from '../platform/platform.detector';
import { Platform } from '../platform/platform.types';

/**
 * Get the base path for the current platform
 * Web builds are served from /reader/, desktop builds from root
 */
export function getBasePath(): string {
  const platform = detectPlatform();
  return platform === Platform.WEB ? '/reader' : '';
}

/**
 * Prepend the base path to a route
 * @param path The route path (e.g., '/library', '/reader/mangaId/volumeId')
 */
export function getFullPath(path: string): string {
  const basePath = getBasePath();
  
  // Handle paths that already start with the base path
  if (basePath && path.startsWith(basePath)) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${basePath}${normalizedPath}`;
}

/**
 * Strip the base path from a route (useful for route matching)
 * @param path The full path (e.g., '/reader/library')
 */
export function stripBasePath(path: string): string {
  const basePath = getBasePath();
  
  if (!basePath) {
    return path;
  }
  
  if (path.startsWith(basePath)) {
    return path.substring(basePath.length) || '/';
  }
  
  return path;
}

