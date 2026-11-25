import { useEffect } from "react";
import { Link } from "react-router-dom";
import authSpreadsheet from "../assets/auth-spreadsheet.jpg";
import "../styles/not-found.css";

export default function NotFoundPage() {
  const returnTo = "/dashboard";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "404 — Page not found | Expense Tracker";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main className="not-found-page" style={{ backgroundImage: `url(${authSpreadsheet})` }}>
      <Link className="not-found-brand" to={returnTo} title={returnTo === "/dashboard" ? "Back to dashboard" : "Back to sign in"}>
        Expense Tracker
      </Link>

      <section className="not-found-receipt" aria-labelledby="not-found-title">
        <h1 id="not-found-title" className="not-found-number">Receipt #404</h1>
        <dl className="not-found-items">
          <div><dt>Page you asked for</dt><dd>£0.00</dd></div>
          <div><dt>Items found</dt><dd>0</dd></div>
          <div><dt>Time spent looking</dt><dd>3 sec</dd></div>
          <div><dt>Wrong turns</dt><dd>1</dd></div>
        </dl>
        <p className="not-found-status"><span>Status</span><strong>Not found</strong></p>
        <p className="not-found-note">Thanks for stopping by. This page isn’t on your account.</p>
      </section>
    </main>
  );
}
