# Application security

This implementation applies the recommendations in `web-app-security.md` to the existing Flask, React and PostgreSQL app. It is not a penetration-test report or a statement of regulatory compliance.

## Implemented protections

- **Authentication:** Flask-JWT-Extended issues a 30-minute session in an HttpOnly, SameSite=Lax cookie. Production requires Secure cookies. Access tokens are never returned to the browser or kept in web storage. Unsafe authenticated requests require the matching `X-CSRF-TOKEN` header. Axios sends it automatically from the separate CSRF cookie.
- **Session revocation:** signing out, changing a password, or changing an email invalidates all previous sessions. Email changes issue a replacement session to the current browser. New routes require authentication by default; only explicitly listed public endpoints bypass it. Existing ownership filters protect each user's expenses, reports and settings.
- **Passwords:** bcrypt hashing, a 15-character minimum for new/reset passwords, a 72-byte UTF-8 maximum, bounded login inputs, generic login errors, and a dummy hash check for unknown accounts. Existing shorter passwords can still sign in. Email addresses are normalized with a database-enforced case-insensitive unique index.
- **Sensitive account changes:** changing an email requires the current password. Other settings remain editable without repeatedly entering a password.
- **Password resets:** random, hashed, 30-minute single-use links; non-enumerating responses for known/unknown addresses; per-email and IP throttling; old sessions revoked after reset; bounded email queue; SMTP TLS certificate verification.
- **Abuse protection:** Flask-Limiter applies 120 requests/minute and 1,000/hour per client per route by default. Login adds 20/minute per IP and five/minute per normalized email across IPs. Signup permits five/hour per IP. Reset endpoints have stricter limits. Rejections use HTTP 429 with Retry-After. Redis is required for shared production counters; memory storage is for local development only.
- **Input and error handling:** JSON objects only for writes, 32 KB request bodies, bounded text/amounts/dates/installments, finite amounts with two decimal places, rejected unknown fields, and ORM queries. Server errors return a generic message and request ID. Internal logs exclude request bodies, passwords, reset tokens and SQL parameter values.
- **Browser protections:** CSP, nosniff, no framing, no referrers, restricted browser permissions, and no caching of API responses. React renders user text as text. CSV export neutralizes formula-prefixed values. Production scripts are restricted to the same origin; inline styles remain allowed for the component/chart libraries. Vite development additionally permits its inline refresh script and local WebSocket connections.
- **Privacy:** the client no longer persists account/financial profiles in localStorage; legacy data and tokens are cleared. Profiles are fetched from the server and cached in memory. Profile photos currently last until reload/sign-out. Audit events use account IDs and HMAC-derived IP keys, without email addresses or transaction details.
- **Configuration and dependencies:** environment examples, ignored secrets/backups, pinned Python dependencies, dependency/security CI, Dependabot, no Flask debugger by default, and a PostgreSQL port bound to loopback in the local Compose configuration.
- **Backups:** encrypted database backup and isolated restoration verification commands are provided below. A pre-migration backup was created and restored successfully during implementation.

There are no administrator features in this personal tracker. Its authorization boundary is account ownership. Do not add unused privileged roles; when shared accounts or administration are introduced, add explicit permission checks and tests. Database row-level security is not enabled: the current model uses server-side ownership filters.

## Local setup and API changes

Install `backend/requirements.txt` in the Python environment you use to run Flask. Copy the root and backend environment examples only when those `.env` files do not already exist. Set real random secrets and matching database credentials, then run:

```powershell
docker compose up -d db
cd backend
python -B -m flask --app run db upgrade
python -B run.py
```

Run `npm install` and `npm run dev` from `frontend` in another terminal. Open `http://localhost:5173`. The same-origin `/api` proxy is required; the frontend no longer uses a separate `VITE_API_URL`. API consumers must retain cookies and send the CSRF value on POST/PATCH/DELETE requests. `/login` returns the user and settings after an email/password login. POST `/logout` with `{}` ends all sessions.

The earlier security migration normalizes existing emails and revokes legacy tokens. The latest migration removes two-factor enrollment/recovery storage and revokes sessions only for previously enrolled accounts. It preserves user profiles, passwords and expenses.

The local Compose password was moved into the ignored root `.env` without changing the database password. Existing development credentials are **not suitable for public hosting**. Changing `POSTGRES_PASSWORD` in Compose does not change a password in an existing PostgreSQL volume; rotate the database role password through PostgreSQL and update both environment files together.

## Production configuration still required

Use `backend/.env.production.example` and `deploy/nginx.conf.example` as templates, not ready-to-deploy credentials. Nothing has been published or provisioned in a cloud account.

1. Set `APP_ENV=production`, long random signing secrets and a separate `BACKUP_ENCRYPTION_KEY`. Generate signing secrets with `secrets.token_urlsafe(48)` and backup encryption keys with `Fernet.generate_key()`. Store production keys in a secret manager.
2. Serve the built frontend and `/api` under **one HTTPS origin**. Configure certificates and automatic renewal. The Nginx example sets HSTS and the frontend security headers; Flask's API headers alone do not protect the HTML document. Never expose the Vite development server publicly.
3. Run the API with a production WSGI server. For the local Nginx proxy example, run `waitress-serve --listen=127.0.0.1:5000 --trusted-proxy=127.0.0.1 --trusted-proxy-count=1 --trusted-proxy-headers="x-forwarded-for x-forwarded-proto" --call app:create_app` from `backend`, leaving Flask's `TRUSTED_PROXY_COUNT=0` because Waitress already processes the trusted forwarding headers. Restrict backend ingress to the reverse proxy. Set `TRUSTED_HOSTS` to the real hostname and `FRONTEND_URL` to its exact HTTPS origin. With another WSGI server, Flask's `TRUSTED_PROXY_COUNT=1` is appropriate only behind one trusted proxy that replaces forwarding headers; never trust forwarding headers from direct public clients.
4. Configure private authenticated Redis for rate limiting, preferably `rediss://`. Do not expose PostgreSQL or Redis publicly. Configure network firewall rules, managed DDoS protection, OS/container patching and resource limits at the host. Those controls are not implemented by a React/Flask code change.
5. Use a non-superuser PostgreSQL runtime role with access only to this database's required tables/sequences. Use a separate migration role. The Compose bootstrap role is for local development. Configure database transport verification, storage encryption and access controls with the hosting provider. Backups are encrypted by the app; transaction fields in PostgreSQL are not individually encrypted.
6. Configure the SMTP environment values and a real sender. Gmail setup is documented in README.md; `flask --app run check-email` verifies TLS and authentication without sending mail. For production, replace the bounded in-process mail executor with a durable queue/retry worker. A restart can still interrupt queued mail. Email ownership verification and CAPTCHA are not implemented; evaluate them for a public signup service and its abuse volume.
7. Forward structured security events to an access-controlled log/alert service. Alert on login failures, 429 spikes, errors and email-delivery failures. Avoid query strings, cookies, authorization headers, body capture or personal data in proxy/error tracking logs. The Nginx example omits query strings, including reset tokens. Configure retention and restricted access; no external monitoring account was connected.

## Encrypted backups and restoration

From the repository root, with Docker running and `BACKUP_ENCRYPTION_KEY` securely configured:

```powershell
python -B backend/scripts/backup_database.py backup .backups/manual.backup
python -B backend/scripts/backup_database.py verify .backups/manual.backup
```

Backup files are Fernet-encrypted custom-format PostgreSQL dumps. The verification command decrypts in memory, restores into a uniquely named temporary database, verifies the users/expenses tables, and removes only that temporary database. It never restores over the live app database. The current script buffers the dump in memory and is intended for this small local database; use managed encrypted backups for large/production databases.

Configure a production scheduler, remote encrypted storage, retention, and separate key storage. These services are not scheduled/provisioned by this change. Restore into an isolated environment regularly and before relying on a new backup configuration. Keep backup encryption keys recoverable separately from the database; losing the backup key makes its backups unreadable. Protect `.env` files from cloud-sync sharing.

For recovery, stop writes, retain the affected system for investigation, restore a verified backup to a new database, validate migrations and representative account/expense totals, rotate compromised signing credentials, and only then switch the app to the replacement database. Never test restoration over production.

## Verification and maintenance

```powershell
# From backend
python -B -m pip install -r requirements-dev.txt
python -B -m unittest discover -s tests -v
python -B -m bandit -r app run.py
python -B -m pip_audit -r requirements.txt

# From frontend
npm run lint
npm run build
npm audit --audit-level=moderate
```

The security suite exercises cookie flags, CSRF and Origin checks, expiration/revocation, default-deny routes, account isolation, forged owner fields, input limits, login throttling, email-change reauthentication, password-only login, removed two-factor routes, reset email composition/delivery, safe errors, and production configuration guards. Older report/reset tests explicitly use header transport for isolated API regression testing; production startup forbids it.

The GitHub workflow runs tests, lint/build, Bandit and dependency audits on pushes, pull requests, and weekly. It runs when pushed to a repository with Actions enabled; no workflow was dispatched remotely here. Review Dependabot updates, regenerate pinned runtime versions after changing `requirements.in`, and rerun checks. Audits detect known advisories, not every vulnerability. Arrange authorized staging scans and independent penetration testing before a public financial-data service launch.

## Privacy and incident operations

Define a retention policy, account deletion/export process, privacy notice, support contact and any required consent with the service owner before production. CSV expense export exists, but automated account deletion and full personal-data export are not implemented. This app currently adds no analytics or marketing trackers. No regulatory compliance claim is made.

Assign an incident owner and escalation contact. On a suspected incident: restrict affected access, preserve restricted logs/backups, identify the scope, revoke sessions/rotate compromised secrets, patch the cause, restore and verify if necessary, and have the owner determine notifications and follow-up. Train maintainers and rehearse recovery. Cloud IAM/IaC scans apply when actual cloud infrastructure is introduced; none is present in this repository.

Implementation references: [Flask security](https://flask.palletsprojects.com/en/stable/web-security/), [Flask-JWT-Extended cookie/CSRF sessions](https://flask-jwt-extended.readthedocs.io/en/stable/token_locations.html), [Flask-Limiter](https://flask-limiter.readthedocs.io/en/stable/).
