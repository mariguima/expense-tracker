import { api } from "./client.js";
import { clearLegacySession } from "./authSession.js";

export function registerNotFoundHandler(onNotFound, onUnauthorized) {
  const interceptor = api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 404) onNotFound();
      if (error.response?.status === 401 && !["/login", "/signup", "/password-reset/request", "/password-reset/confirm"].includes(error.config?.url)) {
        clearLegacySession();
        onUnauthorized?.();
      }
      return Promise.reject(error);
    },
  );

  return () => api.interceptors.response.eject(interceptor);
}
