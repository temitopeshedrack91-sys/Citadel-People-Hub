const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
let accessToken: string | null = null;

export class LaravelApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'LaravelApiError';
  }
}

export const isLaravelApiConfigured = (): boolean => Boolean(baseUrl);

export const setLaravelAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const requestLaravel = async <T>(
  path: string,
  options: RequestInit = {}
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

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers,
  });
  if (response.status === 401 && accessToken) {
    accessToken = null;
    window.dispatchEvent(new Event('citadel:unauthorized'));
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const validationMessage = body?.errors
      ? Object.values(body.errors).flat().join(' ')
      : body?.message;
    throw new LaravelApiError(validationMessage || `API request failed (${response.status}).`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
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
