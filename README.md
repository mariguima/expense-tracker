# expense-tracker

expense-tracker/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # app factory, extensions init (db, jwt)
│   │   ├── config.py            # DB URI, secret keys, env-based config
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py          # User model (SQLAlchemy)
│   │   │   └── expense.py       # Expense model
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # /signup, /login
│   │   │   └── expenses.py      # CRUD + /summary, /daily endpoints
│   │   ├── schemas/
│   │   │   ├── user_schema.py   # marshmallow validation/serialization
│   │   │   └── expense_schema.py
│   │   └── utils/
│   │       └── auth_helpers.py  # JWT decode, password hashing
│   ├── migrations/               # Flask-Migrate auto-generated
│   ├── tests/
│   │   ├── test_auth.py
│   │   └── test_expenses.py
│   ├── .env                       # DB_URI, JWT_SECRET (never commit)
│   ├── .gitignore
│   ├── requirements.txt
│   └── run.py                     # entry point
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.js   # base URL + auth header interceptor
│   │   │   ├── authApi.js         # signup, login calls
│   │   │   └── expenseApi.js      # CRUD + summary calls
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   └── SignupForm.jsx
│   │   │   ├── expenses/
│   │   │   │   ├── ExpenseList.jsx
│   │   │   │   ├── ExpenseForm.jsx
│   │   │   │   └── CategoryFilter.jsx
│   │   │   └── dashboard/
│   │   │       ├── SummaryCards.jsx
│   │   │       └── ExpenseChart.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── ExpensesPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                          # VITE_API_URL
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml             # spins up Postgres (+ optionally backend)
├── .gitignore                      # root-level, covers both if needed
└── README.md                       # project overview, setup instructions for both sides
name = "Test User"
email = "test@tes.com"
password = "123"
