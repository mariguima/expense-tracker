import { useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import Select from "../components/ui/Select.jsx";
import { logout } from "../api/authApi.js";

const currencies = [
  { value: "GBP", label: "British pound (£)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US dollar ($)" },
];
export default function ProfilePage() {
  const { profile, updateProfile } = useOutletContext();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(profile);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const fileInput = useRef(null);
  const change = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setNotice("");
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 2_000_000) {
      setErrors((current) => ({ ...current, photo: "Choose a JPG or PNG image under 2 MB." }));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const validSize = bitmap.width >= 400 && bitmap.height >= 400;
      bitmap.close();
      if (!validSize) {
        setErrors((current) => ({ ...current, photo: "Choose an image at least 400 × 400 px." }));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => change("photo", String(reader.result));
      reader.readAsDataURL(file);
    } catch {
      setErrors((current) => ({ ...current, photo: "This image could not be opened." }));
    }
  };

  const save = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!draft.firstName.trim()) nextErrors.firstName = "Enter your first name.";
    if (!draft.lastName.trim()) nextErrors.lastName = "Enter your last name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!Number.isFinite(Number(draft.monthlyBudget)) || Number(draft.monthlyBudget) <= 0) nextErrors.monthlyBudget = "Enter a budget greater than zero.";
    if (!Number.isFinite(Number(draft.monthlySavingsGoal)) || Number(draft.monthlySavingsGoal) < 0) nextErrors.monthlySavingsGoal = "Enter a valid savings goal.";
    if (!Number.isFinite(Number(draft.emergencyFundTarget)) || Number(draft.emergencyFundTarget) <= 0) nextErrors.emergencyFundTarget = "Enter a target greater than zero.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      await updateProfile({
        ...draft,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        email: draft.email.trim(),
        monthlyBudget: Number(draft.monthlyBudget).toFixed(2),
        monthlySavingsGoal: Number(draft.monthlySavingsGoal).toFixed(2),
        emergencyFundTarget: Number(draft.emergencyFundTarget).toFixed(2),
      });
      setNotice("Changes saved.");
      setDraft((current) => ({ ...current, currentPassword: "" }));
    } catch (err) {
      const responseError = err.response?.data?.error || err.response?.data?.errors;
      setNotice(typeof responseError === "string" ? responseError : responseError ? Object.values(responseError).flat().join(" ") : "Could not save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(profile);
    setErrors({});
    setNotice("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const signOut = async () => {
    setSigningOut(true);
    setNotice("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      if (error.response?.status === 401) navigate("/login", { replace: true });
      else setNotice("Could not sign out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="app-page-title">
        <h1>Account settings</h1>
      </header>

      <form onSubmit={save} noValidate>
        <section className="settings-card" aria-labelledby="profile-title">
          <div className="settings-card-heading">
            <h2 id="profile-title">Profile</h2>
          </div>
          <div className="settings-photo-row">
            <div className="settings-avatar">{draft.photo ? <img src={draft.photo} alt="Profile" /> : (draft.firstName?.charAt(0) || "M").toUpperCase()}</div>
            <div className="settings-photo-actions">
              <div className="settings-photo-buttons">
                <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>Upload photo</Button>
                <Button type="button" variant="tertiary" onClick={() => change("photo", "")} disabled={!draft.photo}>Remove</Button>
              </div>
              <p>JPG or PNG, at least 400 × 400 px.</p>
              {errors.photo && <span className="settings-error" role="alert">{errors.photo}</span>}
              <input ref={fileInput} className="settings-file-input" type="file" accept="image/jpeg,image/png" onChange={uploadPhoto} aria-label="Choose profile photo" />
            </div>
          </div>
          <div className="settings-profile-fields">
            <div className="settings-two-columns">
              <div className="form-field"><label className="label" htmlFor="profile-first-name">First name</label><Input id="profile-first-name" name="firstName" value={draft.firstName} autoComplete="given-name" invalid={!!errors.firstName} onChange={(event) => change("firstName", event.currentTarget.value)} />{errors.firstName && <span className="settings-error">{errors.firstName}</span>}</div>
              <div className="form-field"><label className="label" htmlFor="profile-last-name">Last name</label><Input id="profile-last-name" name="lastName" value={draft.lastName} autoComplete="family-name" invalid={!!errors.lastName} onChange={(event) => change("lastName", event.currentTarget.value)} />{errors.lastName && <span className="settings-error">{errors.lastName}</span>}</div>
            </div>
            <div className="form-field"><label className="label" htmlFor="profile-email">Email address</label><Input id="profile-email" name="email" type="email" value={draft.email} autoComplete="email" invalid={!!errors.email} onChange={(event) => change("email", event.currentTarget.value)} />{errors.email && <span className="settings-error">{errors.email}</span>}</div>
          </div>
        </section>

        {draft.email.trim().toLowerCase() !== profile.email.toLowerCase() && <section className="settings-card">
          <div className="form-field">
            <label className="label" htmlFor="email-change-password">Current password to change your email</label>
            <Input id="email-change-password" type="password" autoComplete="current-password" value={draft.currentPassword || ""} maxLength={128} onChange={(event) => change("currentPassword", event.currentTarget.value)} />
          </div>
        </section>}

        <section className="settings-card" aria-labelledby="budget-title">
          <div className="settings-card-heading">
            <h2 id="budget-title">Budget, savings and currency</h2>
            <p>Set your monthly limit, what you want to save and how amounts are shown.</p>
          </div>
          <div className="settings-finance-columns">
            <div className="form-field"><label className="label" htmlFor="profile-budget">Monthly budget</label><div className="settings-budget-input"><span aria-hidden="true">{draft.currency === "EUR" ? "€" : draft.currency === "USD" ? "$" : "£"}</span><Input id="profile-budget" name="monthlyBudget" type="number" min="0.01" step="0.01" value={draft.monthlyBudget} invalid={!!errors.monthlyBudget} onChange={(event) => change("monthlyBudget", event.currentTarget.value)} /></div>{errors.monthlyBudget && <span className="settings-error">{errors.monthlyBudget}</span>}</div>
            <div className="form-field"><label className="label" htmlFor="profile-savings-goal">Monthly savings goal</label><div className="settings-budget-input"><span aria-hidden="true">{draft.currency === "EUR" ? "€" : draft.currency === "USD" ? "$" : "£"}</span><Input id="profile-savings-goal" name="monthlySavingsGoal" type="number" min="0" step="0.01" value={draft.monthlySavingsGoal} invalid={!!errors.monthlySavingsGoal} onChange={(event) => change("monthlySavingsGoal", event.currentTarget.value)} /></div>{errors.monthlySavingsGoal && <span className="settings-error">{errors.monthlySavingsGoal}</span>}</div>
            <div className="form-field"><label className="label" htmlFor="profile-emergency-fund">Emergency fund target</label><div className="settings-budget-input"><span aria-hidden="true">{draft.currency === "EUR" ? "€" : draft.currency === "USD" ? "$" : "£"}</span><Input id="profile-emergency-fund" name="emergencyFundTarget" type="number" min="0.01" step="0.01" value={draft.emergencyFundTarget} invalid={!!errors.emergencyFundTarget} onChange={(event) => change("emergencyFundTarget", event.currentTarget.value)} /></div>{errors.emergencyFundTarget && <span className="settings-error">{errors.emergencyFundTarget}</span>}</div>
            <div className="form-field"><label className="label" htmlFor="profile-currency">Currency</label><Select id="profile-currency" name="currency" value={draft.currency} options={currencies} onChange={(event) => change("currency", event.currentTarget.value)} /></div>
          </div>
          
        </section>

        <div className="settings-actions">
          {notice && <span className="settings-notice" role="status">{notice}</span>}
          <Button type="button" variant="secondary" onClick={cancel} disabled={saving || signingOut}>Cancel</Button>
          <Button type="submit" className="settings-save-button" disabled={saving || signingOut}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="secondary" onClick={signOut} disabled={saving || signingOut} title="Sign out on all devices">{signingOut ? "Signing out…" : "Sign out"}</Button>
        </div>
      </form>
    </div>
  );
}
