import { api } from "./client.js";
import { clearLegacySession } from "./authSession.js";

export async function signup(userData) {
  return (await api.post("/signup", userData)).data;
}

export async function login(credentials) {
  const data = (await api.post("/login", credentials)).data;
  clearLegacySession();
  return data;
}

export async function logout() {
  await api.post("/logout", {});
  clearLegacySession();
}

export async function requestPasswordReset(email) {
  return (await api.post("/password-reset/request", { email })).data;
}

export async function confirmPasswordReset(token, email, password) {
  const data = (await api.post("/password-reset/confirm", { token, email, password })).data;
  clearLegacySession();
  return data;
}

export async function getProfile() {
  return (await api.get("/profile")).data;
}

export async function patchProfile(profile) {
  return (await api.patch("/profile", profile)).data;
}
