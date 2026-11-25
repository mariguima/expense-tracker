import axios from "axios";

// Credentials stay in HttpOnly cookies; the API must share the site's origin.
export const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true,
  xsrfCookieName: "csrf_access_token",
  xsrfHeaderName: "X-CSRF-TOKEN",
});
