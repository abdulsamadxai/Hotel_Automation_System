// Typed fetch client for the Hotel Automation API (backend/).
//
// - Base URL from `VITE_API_BASE_URL`, default http://localhost:3001.
// - Every request carries `Authorization: Bearer <token>` when a token is
//   stored under localStorage key `has:token`.
// - On 401 the token is cleared and the user is sent to /login.
// - The API wraps list/single resources as `{data: ...}` and errors as
//   `{error: {message, details?}}`; login is the one exception and returns
//   `{token, user}` unwrapped, so `request` unwraps `data` only when it is
//   present.

import type { UserRole } from './types';

export const TOKEN_KEY = 'has:token';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3001';

/** Error surfaced from the API (or from the transport itself). */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode, tests) — the in-memory copy in
    // useAuth still holds the token for this session.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors; the token is gone from memory regardless.
  }
}

function handleUnauthorized(): void {
  clearToken();
  if (
    typeof window !== 'undefined' &&
    window.location.pathname !== '/login'
  ) {
    window.location.assign('/login');
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Extra headers (merged after the auth header). */
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      0,
      error instanceof Error
        ? `Could not reach the API at ${API_BASE_URL}: ${error.message}`
        : `Could not reach the API at ${API_BASE_URL}`,
    );
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const err = (payload as { error?: { message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      response.status,
      err?.message ?? `Request failed with status ${response.status}`,
      err?.details,
    );
  }

  // `{data: ...}` envelope, except login which returns `{token, user}` raw.
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function buildPath(path: string, params?: Record<string, string | undefined>): string {
  if (!params) return path;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * `?hotel_id=` for list endpoints. Only a real hotel id is sent: 'global'
 * (a super-admin with no hotel picked) means "all hotels", which is what
 * the API returns when the param is omitted. A non-super-admin passes
 * their own hotel id, which the API accepts.
 */
export function hotelParams(
  hotelId: string | null | undefined,
): Record<string, string | undefined> {
  return hotelId && hotelId !== 'global' ? { hotel_id: hotelId } : {};
}

/**
 * `hotel_id` for create bodies. super_admin must supply it (the server
 * 400s "hotel_id is required" otherwise) and must have picked a hotel
 * first — `useAuth().hotelId` is the selected hotel for super_admin
 * (persisted in localStorage by the dashboard picker) and 'global'
 * while none is picked. Everyone else is pinned to their own hotel
 * server-side, so nothing is sent for them.
 */
export function writeHotelParams(
  role: UserRole,
  hotelId: string | null | undefined,
): { hotel_id?: string } {
  return role === 'super_admin' && hotelId && hotelId !== 'global'
    ? { hotel_id: hotelId }
    : {};
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | undefined>) =>
    request<T>(buildPath(path, params)),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
