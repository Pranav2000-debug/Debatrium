import axios from "axios";

const BASE_URL = "http://localhost:4000/api/v1";

// Create axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Include cookies in requests
});

// Flag to prevent infinite loops in interceptor
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  isRefreshing = false;
  failedQueue = [];
};

/**
 * Response interceptor to handle token refresh on 401 errors
 * If access token expires, automatically use refresh token to get a new one
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only retry once and only for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Call refresh token endpoint
        const response = await axios.post(`${BASE_URL}/users/refresh-token`, null, {
          withCredentials: true,
        });

        const { accessToken } = response.data?.data || {};

        if (!accessToken) {
          throw new Error("No access token in refresh response");
        }

        // Update authorization header for the original request
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

        processQueue(null, accessToken);

        // Retry the original request with new token
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to login again
        processQueue(refreshError, null);

        // Redirect to login or trigger logout
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
