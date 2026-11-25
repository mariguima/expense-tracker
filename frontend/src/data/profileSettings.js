let cachedProfile = null;
let activeUserId = null;

export const currencySymbol = (currency) => ({ GBP: "£", EUR: "€", USD: "$" })[currency] || "£";

export const defaultProfile = {
  firstName: "",
  lastName: "",
  email: "",
  photo: "",
  monthlyBudget: "2000.00",
  monthlySavingsGoal: "225.00",
  emergencyFund: "0.00",
  emergencyFundTarget: "5000.00",
  currency: "GBP",
  warnAt80: true,
  roundAmounts: false,
};

export function loadProfile() {
  return { ...defaultProfile, ...cachedProfile };
}

export function saveProfile(profile) {
  cachedProfile = { ...profile };
}

export function clearProfile() {
  cachedProfile = null;
  activeUserId = null;
}

export function saveAccountProfile(user, settings) {
  if (!user) return;
  if (activeUserId !== user.id) clearProfile();
  activeUserId = user.id;
  const [legacyFirstName = "", ...legacyLastName] = (user.name || "").trim().split(/\s+/);
  saveProfile({
    ...defaultProfile,
    photo: loadProfile().photo,
    firstName: user.first_name || legacyFirstName,
    lastName: user.last_name || legacyLastName.join(" "),
    email: user.email || "",
    monthlyBudget: settings?.monthly_budget ?? defaultProfile.monthlyBudget,
    monthlySavingsGoal: settings?.monthly_savings_goal ?? defaultProfile.monthlySavingsGoal,
    emergencyFund: settings?.emergency_fund ?? defaultProfile.emergencyFund,
    emergencyFundTarget: settings?.emergency_fund_target ?? defaultProfile.emergencyFundTarget,
    currency: settings?.currency ?? defaultProfile.currency,
    warnAt80: settings?.warn_at_80 ?? defaultProfile.warnAt80,
    roundAmounts: settings?.round_amounts ?? defaultProfile.roundAmounts,
  });
  return loadProfile();
}

export function toProfilePayload(profile) {
  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email,
    ...(profile.currentPassword ? { current_password: profile.currentPassword } : {}),
    financial_settings: {
      monthly_budget: profile.monthlyBudget,
      monthly_savings_goal: profile.monthlySavingsGoal,
      emergency_fund_target: profile.emergencyFundTarget,
      currency: profile.currency,
    },
  };
}
