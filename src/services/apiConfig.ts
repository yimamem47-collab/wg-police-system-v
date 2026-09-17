import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'wg_api_server_url';

/**
 * Retrieves configured custom backend API URL (especially useful for Android native APKs
 * connecting to the deployed Cloud Run server or custom domain).
 */
export function getApiServerUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved.trim().replace(/\/+$/, '');
  } catch (e) {
    console.warn('Unable to read API server URL from storage:', e);
  }
  return '';
}

/**
 * Updates the custom backend API URL in persistent storage.
 */
export function setApiServerUrl(url: string): void {
  try {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    if (cleanUrl) {
      localStorage.setItem(STORAGE_KEY, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Unable to save API server URL to storage:', e);
  }
}

/**
 * Returns a fully-qualified or relative URL for the given API path.
 * In a web browser environment, returns relative path (e.g. '/api/telegram').
 * In a native mobile app (Capacitor), prepends the configured server base URL if present.
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  const customServer = getApiServerUrl();
  if (customServer) {
    return `${customServer}${normalizedPath}`;
  }

  // If running in Capacitor and no custom base is defined,
  // relative URLs will hit localhost inside WebView, which may not have backend routes unless running locally.
  if (Capacitor.isNativePlatform()) {
    // Check if window.location has a remote origin
    if (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('capacitor://')) {
      return `${window.location.origin}${normalizedPath}`;
    }
  }

  return normalizedPath;
}
