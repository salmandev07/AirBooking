# Air Booking

A flight booking platform built with Django REST Framework on the backend and React on the frontend.

## Features

- Registration with admin approval. New accounts start as `pending` and can only log in after an administrator approves them.
- JWT authentication with access and refresh tokens.
- Flight search by origin, destination, date, price and seat availability.
- Booking creation with seat locking, a simulated payment step and a booking reference.
- "My Booked Trips" page with live flight status and cancellation.
- Admin dashboard for approving users, creating flights and changing flight status.
- Live flight status from the AirLabs API, falling back to schedule based status when no API key is set.
- Approval emails sent through Celery and Redis.

## Tech stack

| Layer | Tools |
| --- | --- |
| Backend | Django 6, Django REST Framework, SimpleJWT, django-cors-headers |
| Tasks | Celery, Redis |
| Database | PostgreSQL |
| Frontend | React 18, React Router 6, Axios, Vite |
| Flight status | AirLabs (optional) |

## Project structure

```
AIR BOOKING/
├── backend/
│   ├── airbooking/          # settings, urls, celery
│   ├── accounts/            # custom User, register, login, approval
│   ├── flights/             # Flight model, search, live status
│   ├── bookings/            # Booking model, create, cancel
│   ├── requirements.txt
│   ├── .env.example
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api.js           # axios instance and token refresh
│   │   ├── context/         # AuthContext
│   │   ├── components/      # Navbar, StatusBadge
│   │   └── pages/           # Login, Register, Dashboard, FlightList,
│   │                        # BookFlight, MyTrips, AdminDashboard
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
# then edit DB_PASSWORD, SECRET_KEY and AIRLABS_API_KEY

python manage.py migrate
python manage.py seed_data   # demo accounts and 12 flights

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

Vite proxies `/api` to `http://127.0.0.1:8000`, so CORS does not need extra configuration during development.

## Test accounts

Created by `python manage.py seed_data`.

| Username | Password | Role | Status |
| --- | --- | --- | --- |
| `admin` | `admin123` | Admin | approved |
| `demo` | `demo123` | Regular user | approved |
| `newuser` | `newuser123` | Regular user | pending |

The Django admin site is at `/admin/` and uses the same `admin` account.

## API documentation

Base URL: `http://127.0.0.1:8000`

All endpoints return JSON. Everything except `register`, `login` and `token/refresh` requires
`Authorization: Bearer <access_token>`.

### Authentication

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register/` | Public | `{username, email, password, password2, first_name, last_name, phone}`. Returns 201 with status `pending` |
| POST | `/api/auth/login/` | Public | `{username, password}`. Returns `{access, refresh, user}`. 400 for bad credentials, 403 if not approved |
| POST | `/api/auth/token/refresh/` | Public | `{refresh}` returns `{access}` |
| GET | `/api/auth/me/` | Authenticated | Current user |
| POST | `/api/auth/logout/` | Authenticated | Blacklists the refresh token |
| POST | `/api/auth/resend-approval/` | Public | `{email}` queues a reminder email |

### Flights

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/flights/search/` | Authenticated | Query params: `origin`, `destination`, `date` (YYYY-MM-DD), `max_price`, `only_available` |
| GET | `/api/flights/{id}/` | Authenticated | Flight detail |
| GET | `/api/flights/{id}/status/` | Authenticated | Live status. Uses AirLabs when `AIRLABS_API_KEY` is set, otherwise simulated. The response includes `source` |
| GET | `/api/flights/my/` | Authenticated | Flights you have booked |

### Bookings

| Method | Endpoint | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/bookings/` | Authenticated | Your bookings only |
| POST | `/api/bookings/` | Authenticated | `{flight_id, seats, passenger_name, passenger_email}`. Returns 201 with `reference`, `total_amount`, `payment_status`. Add `"simulate_failure": true` to test the failed payment path |
| GET | `/api/bookings/{id}/` | Authenticated | Owner only. Other users get 404 |
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
| PUT | `/api/admin/flights/{id}/status/` | Admin | `{status: "Delayed"}`. One of On Time, Delayed, Boarding, Departed, Landed, Cancelled |
| GET | `/api/admin/flights/stats/` | Admin | Flight, seat, booking and pending user counts |

### Example with curl

```bash
# login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access'])")

# search
curl -s "http://127.0.0.1:8000/api/flights/search/?origin=DEL" \
  -H "Authorization: Bearer $TOKEN"

# book
curl -s -X POST http://127.0.0.1:8000/api/bookings/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"flight_id":1,"seats":1,"passenger_name":"Demo","passenger_email":"demo@airbooking.local"}'
```

## Environment configuration

`backend/.env`

| Key | Default | Meaning |
| --- | --- | --- |
| `SECRET_KEY` | dev value | Django secret. Change it for production |
| `DEBUG` | `True` | Set to `False` in production |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma separated |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | `air_booking`, `postgres`, `postgres`, `127.0.0.1`, `5432` | PostgreSQL connection |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Redis broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Redis result store |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma separated |
| `AIRLABS_API_KEY` | empty | Free key from https://airlabs.co/. Leave empty for simulated status |
| `EMAIL_BACKEND` | console backend | Prints approval emails in the terminal. Swap for SMTP in production |

## User flows

### Registration and approval

1. A visitor registers. The account is created with `approval_status = pending`.
2. An admin opens the Admin page, Users tab, and clicks Approve.
3. Celery sends the approval email. With the console email backend it appears in the worker terminal.
4. The user logs in and receives a JWT.

### Booking

1. Search flights on the Search Flights page.
2. Choose a flight and enter the seat count and passenger details.
3. Complete the simulated payment to receive a booking reference.
4. Manage bookings on My Booked Trips.

### Admin

- Users tab: filter by pending, approved or rejected, then approve or reject.
- Flights tab: create a flight, change status from the dropdown.
- Statistics tab: flights, bookings, pending users and seat occupancy.

## Design notes

- Seat counts are checked twice. The serializer rejects a booking when there are not enough seats, and the view rechecks inside a `select_for_update()` transaction so two concurrent bookings cannot oversell a flight.
- One axios interceptor refreshes an expired access token and retries the original request. A dead refresh token sends the user back to `/login`.
- Bookings are filtered by `request.user` in `get_queryset()`, so another user's booking id returns 404 rather than 403.
- The AirLabs request has a timeout and is wrapped in try/except. Any failure falls back to schedule based status instead of breaking the page.
- Approval emails are queued with `.delay()` so the admin click returns immediately.

## Running the full system

| Terminal | Command | URL |
| --- | --- | --- |
| 1 | `cd backend && python manage.py runserver` | http://127.0.0.1:8000 |
| 2 | `cd backend && celery -A airbooking worker --pool=solo --loglevel=info` | - |
| 3 | `cd frontend && npm run dev` | http://localhost:5173 |

Redis must be running. With Docker: `docker start airbooking-redis`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `password authentication failed for user "postgres"` | Match `DB_PASSWORD` in `backend/.env` with your PostgreSQL password |
| Celery: `No module named 'packaging'` | `pip install packaging` |
| Celery cannot reach the broker | Start Redis: `docker start airbooking-redis` |
| Approval email never arrives | The Celery worker terminal must be running and show `Task ... succeeded` |
| Login says waiting for admin approval | Log in as `admin` and approve the user first |
| CORS error in the browser | Use `npm run dev` so the Vite proxy applies, or add your origin to `CORS_ALLOWED_ORIGINS` |
| `EBUSY` during `npm install` | Close other terminals and editors, then run `npm install` again |
| Port 8000 busy | `python manage.py runserver 8080` and change the proxy target in `vite.config.js` |
