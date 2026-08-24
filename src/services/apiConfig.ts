import { Capacitor } from '@capacitor/core';

/**
 * Service to resolve API endpoints dynamically.
 * Helps direct calls to the remote server when running inside a native mobile app (Capacitor),
 * while keeping paths relative on normal web/preview mode.
 */

export function getApiUrl(path: string): string {
  // Try to read custom server URL from local storage
  const savedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('wg_police_api_server_url') : null;
  
  if (savedUrl && savedUrl.trim() !== '') {
    const cleanBase = savedUrl.trim().endsWith('/') ? savedUrl.trim().slice(0, -1) : savedUrl.trim();
    return `${cleanBase}${path}`;
  }

  // On all environments, use the path directly.
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
  return localStorage.getItem('wg_police_api_server_url') || '';
}

