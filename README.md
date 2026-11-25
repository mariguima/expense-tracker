# expense-tracker

## Run locally

Docker Compose starts PostgreSQL. The Flask API and Vite frontend also need to be running for signup, login, and expense requests to work.

For a new checkout, copy `.env.example` to `.env` and `backend/.env.example` to `backend/.env`, then set matching database credentials and random secrets. Keep existing `.env` files when updating. From the project root, start the database:

```powershell
docker compose up -d db
```

In one terminal, start Flask:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m flask --app run db upgrade
python run.py
```

The migration creates one financial settings record per user and fills in defaults for existing accounts. Signup saves currency, monthly budget, monthly savings goal, and emergency fund target to that record. Account settings can update them later.

### Password reset with Gmail

Gmail sends password-reset emails; users still sign in with the expense tracker's email and password. No Google sign-in integration or API key is needed.

1. In the Google account that will send emails, enable Google's 2-Step Verification and create an [app password](https://myaccount.google.com/apppasswords). [Google's instructions](https://support.google.com/accounts/answer/185833) explain eligibility and account restrictions.
2. In the ignored `backend/.env`, set:

```dotenv
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-address@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_USE_SSL=false
```

`SMTP_FROM` defaults to `SMTP_USERNAME`. Use the Google app password rather than your normal Gmail password; copied grouping spaces are handled automatically. The expense tracker itself does not require two-factor authentication.

3. From `backend`, verify the mail connection without sending anything:

```powershell
python -B -m flask --app run check-email
```

4. Restart the backend to load the updated environment. Open **Forgot your password?**, enter an existing account's email and check that inbox/spam folder. Follow the email's **Reset password** link, confirm the account email and a new password, then sign in with it.

Links expire after 30 minutes and work once. A successful reset invalidates all other reset links and sessions, clears browser cookies, and sends a password-change notification. Passwords require at least 15 characters and at most 72 UTF-8 bytes. Reset requests have per-email/IP limits and give the same response for known and unknown accounts. Missing email configuration or a full sending queue returns an error instead of claiming success. Sender authentication/delivery failures are logged without passwords or reset links.

Local links must be opened on the computer running the app. In production, set `FRONTEND_URL` to the site's actual HTTPS origin. The current mail queue is in-process; use a durable queue for production delivery retries across server restarts.

The dashboard calls `GET /savings/summary?end=YYYY-MM-DD` for the emergency fund. It adds each month's unspent budget from the first recorded expense through the selected date, including credit installments. A month that exceeds its budget adds no savings. The current monthly budget is used for earlier months because budget history is not stored.

In a second terminal, start Vite:

```powershell
cd frontend
npm install
npm run dev -- --port 5173 --strictPort
```

Keep both terminals running and open http://localhost:5173/signup. Vite forwards `/api` requests to Flask at `http://127.0.0.1:5000`. If signup or login reports a gateway error, check that Flask is running; starting the database alone does not start the API.


## Security

See [SECURITY.md](SECURITY.md) for Gmail password resets, cookie sessions and CSRF, production configuration, encrypted backups, security checks, and the remaining hosting/operational tasks. Login sessions last 30 minutes. Account settings includes **Sign out** beside **Save changes**; it signs out all devices.

The frontend now uses the same-origin `/api` proxy, and tokens are no longer returned in login JSON. Existing users must sign in again after the security migration.
