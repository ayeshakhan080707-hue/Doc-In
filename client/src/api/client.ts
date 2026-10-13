import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * In-memory token store — never touches localStorage.
 * Eliminates XSS risk of reading tokens from localStorage.
 * The access token lives only in JS memory for the tab's lifetime.
 * On page refresh, the refresh endpoint (httpOnly cookie) issues a new one.
 */
let _accessToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  _accessToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = (): string | null => _accessToken;

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // Sends httpOnly refreshToken cookie automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip retry for auth endpoints to avoid infinite loops
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await apiClient.post('/auth/refresh-token');
        const newToken: string = refreshRes.data.accessToken;
        setAuthToken(newToken);
        processQueue(newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear token and let caller handle redirect
        setAuthToken(null);
        refreshQueue = [];
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
