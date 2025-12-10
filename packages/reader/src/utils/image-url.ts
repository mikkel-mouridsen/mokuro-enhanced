/**
 * Image URL utilities
 * Handles converting relative image paths to absolute URLs
 */

/**
 * Get the API base URL from configuration (server base URL, not including /api prefix)
 */
export const getApiBaseUrl = (): string => {
  try {
    // Try to get from localStorage first (user configurable)
    const savedEndpoint = localStorage.getItem('backendEndpoint');
    if (savedEndpoint) {
      // Remove trailing slash
      return savedEndpoint.replace(/\/$/, '');
    }
  } catch (error) {
    console.error('Failed to load backend endpoint from localStorage:', error);
  }

  // Fall back to environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

/**
 * Convert a relative image URL to an absolute URL
 * @param relativeUrl - Relative URL from the API (e.g., "/api/files/manga/...")
 * @returns Absolute URL
 */
export const getAbsoluteImageUrl = (relativeUrl: string | null | undefined): string | null => {
  if (!relativeUrl) {
    return null;
  }

  // If already an absolute URL, return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }

  // If it's a relative path, prepend the API base URL
  const baseUrl = getApiBaseUrl();
  
  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Ensure relative URL starts with /
  const cleanRelativeUrl = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  
  return `${cleanBaseUrl}${cleanRelativeUrl}`;
};

/**
 * Convert multiple relative image URLs to absolute URLs
 */
export const getAbsoluteImageUrls = (relativeUrls: (string | null | undefined)[]): (string | null)[] => {
  return relativeUrls.map(getAbsoluteImageUrl);
};

/**
 * Update API base URL (useful for configuration changes)
 */
export const updateApiBaseUrl = (newBaseUrl: string): void => {
  try {
    localStorage.setItem('backendEndpoint', newBaseUrl);
    console.log('API base URL updated to:', newBaseUrl);
  } catch (error) {
    console.error('Failed to update backend endpoint in localStorage:', error);
  }
};

