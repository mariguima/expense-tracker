import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Icon from "../Icon.jsx";
import Button from "../ui/Button.jsx";
import { loadProfile, saveProfile } from "../../data/profileSettings.js";

export default function PageLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profile, setProfile] = useState(loadProfile);
  const updateProfile = (nextProfile) => {
    saveProfile(nextProfile);
    setProfile(nextProfile);
  };
  const displayName = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar" id="app-sidebar">
        <div className="sidebar-header">
          <Button
            type="button"
            variant="secondary"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-controls="app-sidebar"
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            <span className="toggle-lines" aria-hidden="true"><i /><i /><i /></span>
          </Button>
          <span className="sidebar-brand">Expense Tracker</span>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
            <Icon name="grid" /><span>Overview</span>
          </NavLink>
          <NavLink to="/expenses" className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
            <Icon name="receipt" /><span>Expenses</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/profile" className={({ isActive }) => `profile-row profile-link${isActive ? " is-active" : ""}`} title="Account settings" aria-label={`Account settings for ${displayName}`}>
            <div className="avatar">{profile.photo ? <img src={profile.photo} alt="" /> : (profile.firstName?.charAt(0) || "M").toUpperCase()}</div>
            <div className="profile-copy"><strong>{displayName}</strong><span>Personal account</span></div>
          </NavLink>
        </div>
      </aside>

      <div className="app-main">
        <main className="page-content"><Outlet context={{ profile, updateProfile }} /></main>
      </div>
    </div>
  );
}
