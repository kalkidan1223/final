import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the httpOnly refresh-token cookie
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On a 401 with TOKEN_EXPIRED, refresh once and retry the original request.
// Concurrent 401s share a single refresh call instead of firing one each.
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isExpired = error.response?.data?.code === 'TOKEN_EXPIRED';

    if (isExpired && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axiosClient.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return axiosClient(original);
      } catch (refreshError) {
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
