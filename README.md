# Air Booking

A flight booking platform built with Django REST Framework on the backend and React on the frontend.

## Features

- Registration with admin approval. New accounts start as `pending` and can only log in after an administrator approves them.
- JWT authentication with access and refresh tokens (rotation + blacklist).
- Flight search by origin, destination, date, price and seat availability.
- Booking creation with seat locking, a simulated payment step and a booking reference.
- "My Booked Trips" page with flight status and cancellation.
- Admin dashboard for approving users, creating flights, updating flight status and viewing statistics.
- Separate admin login page (`/admin/login`); staff see only admin screens.
- Live flight status from the AirLabs API, with a schedule-based fallback when the API is unavailable.
- Approval emails sent by a Celery worker via SMTP (console backend for testing).

## Tech stack

| Layer | Tools |
| --- | --- |
| Backend | Django 6, Django REST Framework, SimpleJWT, django-cors-headers |
| Tasks | Celery, Redis |
| Database | PostgreSQL |
| Frontend | React 18, React Router 6, Axios, Vite |
| Flight status | AirLabs API |
| Email | SMTP (e.g. Gmail app password), Celery |

## Project structure

```
AIR BOOKING/
├── backend/
│   ├── airbooking/          # settings, urls, celery
│   ├── accounts/            # custom User, register, login, approval, logout
│   ├── flights/             # Flight model, search, live status, admin endpoints
│   ├── bookings/            # Booking model, create, cancel, stats
│   ├── requirements.txt
│   ├── .env.example
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api.js           # axios instance and token refresh
│   │   ├── context/         # AuthContext
│   │   ├── components/      # Navbar, StatusBadge
│   │   └── pages/           # Login, AdminLogin, Register, Dashboard,
│   │                        # FlightList, BookFlight, MyTrips, AdminDashboard
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Setup

### Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- PostgreSQL 14 or newer
- Redis 6 or newer

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE air_booking;"
```

### 2. Redis

```bash
# Docker
docker run -d --name airbooking-redis -p 6379:6379 redis:7-alpine

# or a local Redis service
redis-server
```

### 3. Backend

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt

copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
# then edit DB_PASSWORD, SECRET_KEY, AIRLABS_API_KEY and the EMAIL_* values

python manage.py migrate
python manage.py migrate token_blacklist
python manage.py seed_data   # creates the admin account and 12 flights

python manage.py runserver   # http://127.0.0.1:8000
```

Start the Celery worker in a second terminal. It is required for approval emails.

```bash
cd backend
venv\Scripts\activate
celery -A airbooking worker --pool=solo --loglevel=info
```

`--pool=solo` is needed on Windows. On Linux it can be dropped.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Vite proxies `/api` to `http://127.0.0.1:8000`, so no extra CORS setup is needed in development.

## Admin credentials for testing

`python manage.py seed_data` creates the admin account:

| Username | Password | Role | Status |
| --- | --- | --- | --- |
| `admin` | `admin123` | Admin (staff + superuser) | approved |

Sign in on the **Admin login** page at `http://localhost:5173/admin/login`.
The Django admin site is at `http://127.0.0.1:8000/admin/` and uses the same account.

To create test users for the approval flow, register them on `/register`; they start as `pending` until you approve them on the admin dashboard.

## API documentation

Base URL: `http://127.0.0.1:8000`

All endpoints return JSON. Everything except `register`, `login`, `token/refresh` and `resend-approval` requires
`Authorization: Bearer <access_token>`. Admin endpoints additionally require a staff account.

### Authentication

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register/` | Public | `{username, email, password, password2, first_name, last_name, phone}`. Returns 201 with status `pending` |
| POST | `/api/auth/login/` | Public | `{username, password}`. Returns `{access, refresh, user}`. 400 for bad credentials, 403 if not approved |
| POST | `/api/auth/token/refresh/` | Public | `{refresh}` returns `{access}`; rotates and blacklists the old refresh token |
| GET | `/api/auth/me/` | Authenticated | Current user |
| POST | `/api/auth/logout/` | Authenticated | `{refresh}` blacklists the refresh token |
| POST | `/api/auth/resend-approval/` | Public | `{email}` queues a reminder email |

### Flights

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/flights/search/` | Authenticated | Query params: `origin`, `destination`, `date` (YYYY-MM-DD), `max_price`, `only_available` |
| GET | `/api/flights/{id}/` | Authenticated | Flight detail |
| GET | `/api/flights/{id}/status/` | Authenticated | Live status from AirLabs (`"source": "AirLabs"`), falls back to schedule-based status (`"source": "Simulated"`) on API errors |
| GET | `/api/flights/my/` | Authenticated | Flights you have booked |

### Bookings

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/bookings/` | Authenticated | Your bookings only |
| POST | `/api/bookings/` | Authenticated | `{flight_id, seats, passenger_name, passenger_email}`. Returns 201 with `reference`, `total_amount`, `payment_status`. Add `"simulate_failure": true` to test the failed payment path |
| GET | `/api/bookings/{id}/` | Authenticated | Owner only; other users get 404 |
| POST | `/api/bookings/{id}/cancel/` | Authenticated | Sets status to Cancelled, releases seats, marks payment Refunded |
| GET | `/api/bookings/stats/` | Authenticated | Personal counts for users, revenue counts for staff |

### Admin

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/admin/users/pending/` | Admin | Registrations waiting for review |
| GET | `/api/admin/users/?status=approved` | Admin | Filter by `pending`, `approved` or `rejected` |
| POST | `/api/admin/users/{id}/approve/` | Admin | Sets approved and queues the Celery email |
| POST | `/api/admin/users/{id}/reject/` | Admin | Sets rejected and queues the Celery email |
| GET | `/api/admin/flights/` | Admin | List all flights |
| POST | `/api/admin/flights/` | Admin | Create a flight |
| GET, PUT, PATCH | `/api/admin/flights/{id}/` | Admin | Edit a flight |
| PUT | `/api/admin/flights/{id}/status/` | Admin | `{status: "Delayed"}` — On Time, Delayed, Boarding, Departed, Landed, Cancelled |
| GET | `/api/admin/flights/stats/` | Admin | Flight, seat, booking and pending user counts |

### Example with curl

```bash
# login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

# pending users
curl -s http://127.0.0.1:8000/api/admin/users/pending/ \
  -H "Authorization: Bearer $TOKEN"

# flights
curl -s "http://127.0.0.1:8000/api/flights/search/?origin=DEL" \
  -H "Authorization: Bearer $TOKEN"
```

## Environment configuration

Copy `backend/.env.example` to `backend/.env` and fill in:

| Key | Default | Meaning |
| --- | --- | --- |
| `SECRET_KEY` | dev value | Django secret; change for production |
| `DEBUG` | `True` | Set to `False` in production |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma separated |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | `air_booking`, `postgres`, `postgres`, `127.0.0.1`, `5432` | PostgreSQL connection |
| `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Redis broker and results |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma separated |
| `AIRLABS_API_KEY` | empty | Free key from https://airlabs.co/. Empty or API errors use simulated status |
| `EMAIL_BACKEND` | console backend | `django.core.mail.backends.smtp.EmailBackend` for real mail; leave unset to print in the worker terminal |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` | `localhost`, `25`, empty, empty, `True` | SMTP server. Gmail uses `smtp.gmail.com`, `587` and a 16-character app password |
| `DEFAULT_FROM_EMAIL` | `no-reply@airbooking.local` | Sender address |

## User flows

### Registration and approval

1. A visitor registers at `/register`. The account is created with `approval_status = pending`.
2. An admin opens `/admin`, Users tab, and clicks Approve or Reject.
3. Celery sends the approval/rejection email via SMTP (with the console backend it is printed in the worker terminal).
4. Only approved users can log in; they receive a JWT access + refresh token pair.

### Booking

1. Search flights on the Search Flights page with filters.
2. Choose a flight and enter seat count and passenger details.
3. Complete the simulated payment to receive a booking reference.
4. Manage bookings on My Booked Trips, including live status and cancellation.

### Admin

- Users tab: filter by pending/approved/rejected, approve or reject (with a result message showing the username).
- Flights tab: create flights, change status from the dropdown, view statistics.
- Staff accounts see only the admin screen and nav link.

## Design notes

- Seat counts are checked twice: in the serializer and inside a `select_for_update()` transaction, so concurrent bookings cannot oversell a flight.
- An axios interceptor refreshes an expired access token and retries the request; a dead refresh token logs the user out. Refresh tokens are rotated and blacklisted.
- Bookings are filtered by `request.user` in `get_queryset()`, so another user's booking id returns 404.
- The AirLabs request has a timeout and try/except; any failure falls back to schedule-based status instead of breaking the page.
- Approval emails are queued with `.delay()` so the admin click returns immediately.

## Running the full system

| Terminal | Command | URL |
| --- | --- | --- |
| 1 | `cd backend && python manage.py runserver` | http://127.0.0.1:8000 |
| 2 | `cd backend && celery -A airbooking worker --pool=solo --loglevel=info` | - |
| 3 | `cd frontend && npm run dev` | http://localhost:5173 |

Redis and PostgreSQL must be running.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `password authentication failed for user "postgres"` | Match `DB_PASSWORD` in `backend/.env` with your PostgreSQL password |
| Celery: `No module named 'packaging'` | `pip install packaging` |
| Celery cannot reach the broker | Start Redis: `docker start airbooking-redis` |
| Approval email never arrives | Check the worker terminal for `Task ... succeeded`; verify `EMAIL_*` values (Gmail needs an app password, not your login password) |
| Login says waiting for admin approval | Log in as `admin` and approve the user first |
| CORS error in the browser | Use `npm run dev` so the Vite proxy applies, or add your origin to `CORS_ALLOWED_ORIGINS` |
| Live status shows "Simulated" | `AIRLABS_API_KEY` may be empty/invalid, or the flight number is not in AirLabs' database |
| Port 8000 busy | `python manage.py runserver 8080` and change the proxy target in `vite.config.js` |
