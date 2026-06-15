import { Capacitor } from '@capacitor/core';

/**
 * Service to resolve API endpoints dynamically.
 * Helps direct calls to the remote server when running inside a native mobile app (Capacitor),
 * while keeping paths relative on normal web/preview mode.
 */

// Default Cloud Run deployment host for the backend
const DEFAULT_REMOTE_HOST = 'https://ais-pre-dv2qu5li6lwo7dput2a5di-281496265411.europe-west2.run.app';

export function getApiUrl(path: string): string {
  // Try to read custom server URL from local storage
  const savedUrl = localStorage.getItem('wg_police_api_server_url');
  
  if (savedUrl && savedUrl.trim() !== '') {
    const cleanBase = savedUrl.trim().endsWith('/') ? savedUrl.trim().slice(0, -1) : savedUrl.trim();
    return `${cleanBase}${path}`;
  }

  // If Capacitor is on a native platform (Android/iOS), point to remote host
  if (Capacitor.isNativePlatform()) {
    return `${DEFAULT_REMOTE_HOST}${path}`;
  }

  // Default to relative path for normal web context
  return path;
}

/**
 * Sets the API Server URL in local storage (useful for mobile settings screen)
 */
export function setApiServerUrl(url: string | null) {
  if (url) {
    localStorage.setItem('wg_police_api_server_url', url);
  } else {
    localStorage.removeItem('wg_police_api_server_url');
  }
}

/**
 * Gets currently configured API Server URL
 */
export function getApiServerUrl(): string {
  return localStorage.getItem('wg_police_api_server_url') || DEFAULT_REMOTE_HOST;
}
