import { clearProfile } from "../data/profileSettings.js";

export function clearLegacySession() {
  try {
    sessionStorage.removeItem("expense-tracker-access-token");
    sessionStorage.removeItem("expense-tracker-active-user");
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("expense-tracker-profile")) localStorage.removeItem(key);
    }
  } catch {
    // Some private browsing modes block storage access; cookie sessions still work.
  }
  clearProfile();
}
