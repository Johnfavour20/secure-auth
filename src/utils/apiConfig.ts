export function getApiBaseUrl(): string {
  let envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  // Auto-correct outdated/typo Render URLs
  envUrl = envUrl.replace(/secure-auth-[12]\.onrender\.com/g, 'secure-auth-3.onrender.com');

  // Remove trailing slashes
  envUrl = envUrl.replace(/\/+$/, '');
  
  // Auto-append /api if missing from base URL
  if (!envUrl.endsWith('/api')) {
    envUrl += '/api';
  }
  return envUrl;
}
