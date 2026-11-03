/**
 * Citadel Laravel API HTTP Client
 *
 * Provides a resilient, type-safe HTTP client for interacting with the Laravel backend.
 * Handles Bearer token persistence, automatic retries with exponential backoff on transient errors,
 * 401 unauthenticated session revocation, and response unwrapping.
 */

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'citadel_laravel_token';

let accessToken: string | null = typeof window !== 'undefined'
  ? localStorage.getItem(TOKEN_KEY)
  : null;

/**
 * Standardized API error thrown on non-2xx HTTP responses from Laravel.
 */
export class LaravelApiError extends Error {
  /**
   * @param message Human-readable error description or aggregated validation messages.
   * @param status HTTP response status code (e.g. 422, 403, 404, 500).
   * @param errors Validation error dictionary keyed by field name.
   */
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'LaravelApiError';
  }
}

/**
 * Checks whether the Laravel backend API base URL is configured in the environment.
 */
export const isLaravelApiConfigured = (): boolean => Boolean(baseUrl);

/**
 * Returns the active Sanctum bearer token from memory or local storage.
 */
export const getLaravelAccessToken = (): string | null => accessToken;

/**
 * Sets or clears the active Sanctum bearer token and syncs to localStorage.
 *
 * @param token Sanctum plain-text bearer token or null to clear authentication.
 */
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
 * Executes an HTTP request against the Laravel API with automatic retry and auth handling.
 *
 * - Automatically attaches Bearer token Authorization and JSON headers.
 * - Handles 401 responses by clearing token and firing the 'citadel:unauthorized' window event.
 * - Retries transient failures (network/5xx) with exponential backoff (300ms, 600ms...).
 * - Immediately rejects 4xx client errors (validation, permissions) without retrying.
 *
 * @template T Expected response payload type.
 * @param path Relative path under /api/v1 (e.g. '/payroll/runs').
 * @param options Standard fetch RequestInit options.
 * @param maxRetries Maximum retry attempts for transient errors (default: 2).
 * @returns Parsed JSON response body or undefined on 204 No Content.
 * @throws {LaravelApiError} On HTTP 4xx/5xx responses.
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
        await new Promise((resolve) => setTimeout(resolve, attempt * 300));
      }
    }
  }

  throw lastError || new Error(`Request to ${path} failed after ${maxRetries} retries.`);
};

/**
 * Convenience helper to request and unpack Laravel's standard `{ data: T }` envelope.
 *
 * @template T Inner entity or collection type.
 * @param path Endpoint path under /api/v1.
 * @param options RequestInit options.
 * @returns The unpacked `data` property.
 */
export const requestLaravelData = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await requestLaravel<{ data: T }>(path, options);
  return response.data;
};

/**
 * Request raw binary file data (blob) from an authenticated endpoint.
 *
 * @param path Endpoint path under /api/v1.
 * @returns File blob.
 */
export const requestLaravelBlob = async (path: string): Promise<Blob> => {
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.');
  }

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (response.status === 401 && accessToken) {
    setLaravelAccessToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('citadel:unauthorized'));
    }
  }

  if (!response.ok) throw new Error(`Document download failed (${response.status}).`);
  return response.blob();
};

/**
 * Download a file from the Laravel API and trigger browser file-save.
 *
 * @param path Download endpoint path.
 * @param fileName Suggested filename for the downloaded file.
 */
export const downloadLaravelFile = async (path: string, fileName: string): Promise<void> => {
  const objectUrl = URL.createObjectURL(await requestLaravelBlob(path));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
