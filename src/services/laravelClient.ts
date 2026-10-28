const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'citadel_laravel_token';

let accessToken: string | null = typeof window !== 'undefined'
  ? localStorage.getItem(TOKEN_KEY)
  : null;

export class LaravelApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'LaravelApiError';
  }
}

export const isLaravelApiConfigured = (): boolean => Boolean(baseUrl);

export const getLaravelAccessToken = (): string | null => accessToken;

export const setLaravelAccessToken = (token: string | null): void => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
};

/**
 * Resilient HTTP client for Laravel backend API with retry logic and token management.
 */
export const requestLaravel = async <T>(
  path: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<T> => {
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.');
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${baseUrl}/api/v1${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401 && accessToken) {
        setLaravelAccessToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('citadel:unauthorized'));
        }
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const validationMessage = body?.errors
          ? Object.values(body.errors).flat().join(' ')
          : body?.message;
        throw new LaravelApiError(
          validationMessage || `API request failed (${response.status}).`,
          response.status,
          body?.errors
        );
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (err: any) {
      lastError = err;

      // Do not retry client 4xx errors (validation, auth, not found, forbidden)
      if (err instanceof LaravelApiError && err.status >= 400 && err.status < 500) {
        throw err;
      }

      attempt++;
      if (attempt <= maxRetries) {
        // Exponential backoff: 300ms, 600ms...
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }

  throw lastError || new Error(`Request to ${path} failed after ${maxRetries} retries.`);
};

export const requestLaravelData = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await requestLaravel<{ data: T }>(path, options);
  return response.data;
};

export const downloadLaravelFile = async (path: string, fileName: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!response.ok) throw new Error(`Document download failed (${response.status}).`);

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
