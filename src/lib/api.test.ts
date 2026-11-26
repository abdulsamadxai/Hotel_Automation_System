/**
 * API client checks: the Bearer token is attached, the `{data}` envelope
 * is unwrapped, the `{error: {message}}` shape surfaces its message, and
 * a 401 clears the token and sends the user to /login.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError, TOKEN_KEY, setToken, clearToken } from '@/lib/api';

const okResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    localStorage.clear();
    // jsdom does not implement navigation; stub the location object so
    // the 401 redirect does not throw.
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/bookings',
        assign: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearToken();
  });

  it('attaches the stored Bearer token and unwraps {data}', async () => {
    setToken('jwt-123');
    fetchMock.mockResolvedValue(okResponse({ data: [{ id: 'room-101' }] }));

    const rooms = await api.get<Array<{ id: string }>>('/api/rooms');

    expect(rooms).toEqual([{ id: 'room-101' }]);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer jwt-123',
    });
  });

  it('sends no Authorization header without a token', async () => {
    fetchMock.mockResolvedValue(okResponse({ data: [] }));
    await api.get('/api/rooms');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('surfaces the API error message and status', async () => {
    // A fresh Response per call: a body can only be read once.
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        okResponse({ error: { message: 'Room 101 already exists' } }, 409),
      ),
    );
    await expect(api.post('/api/rooms', {})).rejects.toThrow(
      'Room 101 already exists',
    );
    try {
      await api.post('/api/rooms', {});
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
    }
  });

  it('returns the raw body for login (no {data} envelope)', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ token: 'jwt-abc', user: { id: 'u-1' } }),
    );
    const result = await api.post<{ token: string; user: { id: string } }>(
      '/api/auth/login',
      { email: 'a@b.c', password: 'x' },
    );
    expect(result.token).toBe('jwt-abc');
  });

  it('clears the token and redirects to /login on 401', async () => {
    setToken('stale-jwt');
    fetchMock.mockResolvedValue(
      okResponse({ error: { message: 'Authentication required' } }, 401),
    );
    await expect(api.get('/api/rooms')).rejects.toThrow(
      'Authentication required',
    );
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });
});
