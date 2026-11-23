const STORAGE_KEY = "expense-tracker-profile";

export const defaultProfile = {
  firstName: "Maria",
  lastName: "Silva",
  email: "maria@example.com",
  photo: "",
  monthlyBudget: "2000.00",
  monthlySavingsGoal: "225.00",
  emergencyFund: "3150.00",
  currency: "GBP",
  warnAt80: true,
  roundAmounts: false,
};

export function loadProfile() {
  try {
    return { ...defaultProfile, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...defaultProfile };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function saveAccountProfile(user) {
  if (!user) return;
  const [firstName = "", ...lastName] = (user.name || "").trim().split(/\s+/);
  saveProfile({ ...loadProfile(), firstName, lastName: lastName.join(" "), email: user.email || "" });
}
