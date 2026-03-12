import type { ApiError } from '../types/api';

let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly requestId: string | null;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!response.ok) {
      clearTokens();
      return false;
    }
    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

async function refreshIfNeeded(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function buildUrlWithParams(url: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
  _retried?: boolean;
};

async function parseErrorBody(response: Response): Promise<ApiError> {
  try {
    return (await response.json()) as ApiError;
  } catch {
    return {
      code: 'UNKNOWN',
      message: `HTTP ${response.status}`,
      details: null,
      requestId: null,
    };
  }
}

async function requestRaw(url: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, params, skipAuth = false, _retried = false } = options;
  const fullUrl = buildUrlWithParams(url, params);
  const headers: Record<string, string> = {};

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      requestBody = body;
    } else {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: requestBody,
  });

  if (response.status === 401 && !skipAuth && !_retried) {
    const body401 = await parseErrorBody(response);
    if (body401.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshIfNeeded();
      if (refreshed) {
        return requestRaw(url, { ...options, _retried: true });
      }
    }
    clearTokens();
    throw new ApiRequestError(401, body401);
  }

  if (response.status === 423) {
    const body423 = await parseErrorBody(response);
    throw new ApiRequestError(423, body423);
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, await parseErrorBody(response));
  }

  return response;
}

async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await requestRaw(url, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get<T>(url: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return requestJson<T>(url, { method: 'GET', params });
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return requestJson<T>(url, { method: 'POST', body });
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return requestJson<T>(url, { method: 'PUT', body });
  },

  delete<T>(url: string): Promise<T> {
    return requestJson<T>(url, { method: 'DELETE' });
  },

  postNoAuth<T>(url: string, body?: unknown): Promise<T> {
    return requestJson<T>(url, { method: 'POST', body, skipAuth: true });
  },

  postForm<T>(url: string, formData: FormData): Promise<T> {
    return requestJson<T>(url, { method: 'POST', body: formData });
  },

  async getBlob(url: string, params?: Record<string, string | number | undefined>): Promise<Blob> {
    const response = await requestRaw(url, { method: 'GET', params });
    return response.blob();
  },
};
