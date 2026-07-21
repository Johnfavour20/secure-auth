export function getApiBaseUrl(): string {
  let envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  // Remove trailing slashes
  envUrl = envUrl.replace(/\/+$/, '');
  
  // Auto-append /api if missing from base URL
  if (!envUrl.endsWith('/api')) {
    envUrl += '/api';
  }
  return envUrl;
}
