import authSpreadsheet from "../../assets/auth-spreadsheet.jpg";
import { Link } from "react-router-dom";

export default function AuthLayout({ title, description, beforeTitle, children, className = "" }) {
  return (
    <div className={`auth-page ${className}`.trim()}>
      <section className="auth-main">
        <div className="auth-brand-row">
          <Link className="brand" to="/login">Expense Tracker</Link>
        </div>
        <div className="auth-card-wrap">
          {beforeTitle}
          <div className="auth-copy">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
        </div>
      </section>

      <div
        className="auth-art"
        role="img"
        aria-label="Spreadsheet of expenses with a rising trend arrow"
        style={{ backgroundImage: `url(${authSpreadsheet})` }}
      />
    </div>
  );
}
