# AirBooking

A full-stack flight booking platform built with Django REST Framework on the backend and React on the frontend. It features user registration with an admin approval workflow, JWT authentication, flight search and booking with seat locking, live flight status tracking, and asynchronous email notifications using Celery and Redis.

## Features

- **User Registration, Email Confirmation & Admin Approval:** Registration emails a 6-digit OTP that must be entered to confirm the email address. New accounts then stay `pending` until an administrator approves them.
- **JWT Authentication:** Access and refresh tokens with automatic token rotation and blacklisting on logout.
- **Flight Search & Filtering:** Search available flights by origin, destination, departure date, maximum price, and seat availability.
- **Seat-Safe Booking System:** Reserves seats inside atomic database transactions (`select_for_update`) to prevent overbooking, processes a simulated payment flow, and generates a booking reference.
- **Trip Management:** Users can view booked trips on "My Booked Trips", track flight statuses, and cancel bookings (automatically releasing seats and refunding payment).
- **Admin Dashboard:** Dedicated admin login (`/admin/login`) and dashboard for approving or rejecting users, creating or editing flights, updating flight status, and monitoring statistics.
- **Live Flight Status:** Fetches real-time flight status from the AirLabs API, falling back automatically to schedule-based simulated status when no API key is configured.
- **Asynchronous Email Notifications:** Queues approval and rejection emails via Celery and Redis so admin actions return immediately.

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| Backend | Python, Django 6, Django REST Framework, SimpleJWT, django-cors-headers |
| Frontend | React 18, React Router 6, Axios, Vite |
| Database | PostgreSQL |
| Task Queue & Broker | Celery, Redis |
| External API | AirLabs API (with simulated fallback) |
| Email Delivery | SMTP / Console Backend via Celery |

## Database Schema

| Model | Table | Key Fields | Description |
| :--- | :--- | :--- | :--- |
| `User` | `accounts_user` | `id`, `username`, `email`, `phone`, `approval_status`, `is_staff`, `is_superuser` | Custom user model extending `AbstractUser`. Login is blocked until `approval_status` is `approved`. |
| `Flight` | `flights_flight` | `id`, `flight_number`, `airline`, `origin`, `destination`, `departure_time`, `arrival_time`, `price`, `total_seats`, `available_seats`, `status` | Stores flight schedules, pricing, seat inventory, and operational status (`On Time`, `Delayed`, `Boarding`, `Departed`, `Landed`, `Cancelled`). |
| `Booking` | `bookings_booking` | `id`, `user_id`, `flight_id`, `reference`, `seats`, `passenger_name`, `passenger_email`, `total_amount`, `payment_status`, `booking_status`, `created_at` | Links a user to a flight booking, recording seat count, payment status (`Paid`, `Failed`, `Refunded`), and booking state (`Confirmed`, `Cancelled`). |

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Redis 6 or higher (or Docker)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/salmandev07/AirBooking.git
cd AirBooking
```

### 2. Database Setup

Create the PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE air_booking;"
```

### 3. Redis Setup

Start a Redis server using Docker or a local Redis installation:

```bash
docker run -d --name airbooking-redis -p 6379:6379 redis:7-alpine
```

### 4. Backend Setup

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt

copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux

python manage.py migrate
python manage.py migrate token_blacklist
python manage.py seed_data
```

### 5. Frontend Setup

Open a new terminal and install frontend dependencies:

```bash
cd frontend
npm install
```

## Running the Application

| Process | Terminal Command | URL |
| :--- | :--- | :--- |
| Django Backend | `cd backend && venv\Scripts\activate && python manage.py runserver` | `http://127.0.0.1:8000` |
| Celery Worker | `cd backend && venv\Scripts\activate && celery -A airbooking worker --pool=solo --loglevel=info` | Background Worker |
| React Frontend | `cd frontend && npm run dev` | `http://localhost:5173` |

*(Note: `--pool=solo` is required on Windows. On macOS/Linux, run `celery -A airbooking worker --loglevel=info`.)*

## Admin Credentials for Testing

Running `python manage.py seed_data` creates the default administrator account and sample flights:

| Username | Password | Role | Approval Status | Login URL |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin123` | Admin (Staff + Superuser) | `approved` | `http://localhost:5173/admin/login` |

- **Django Admin Panel:** `http://127.0.0.1:8000/admin/` (uses the same credentials).
- **Testing User Approval:** Register a new account at `http://localhost:5173/register`, enter the 6-digit code emailed to you on the confirm-email page, then approve the account from the Admin Dashboard and log in at `http://localhost:5173/login`.

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure the following variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | dev key | Django cryptographic secret key |
| `DEBUG` | `True` | Set to `False` in production |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated list of allowed hosts |
| `DB_NAME` | `air_booking` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host address |
| `DB_PORT` | `5432` | PostgreSQL port |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Redis broker URL for Celery tasks |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Redis result store URL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |
| `AIRLABS_API_KEY` | empty | Optional AirLabs API key; uses simulated flight status if empty |
| `EMAIL_BACKEND` | console backend | Set to `django.core.mail.backends.smtp.EmailBackend` for real email delivery |
| `EMAIL_HOST` | `localhost` | SMTP server host (e.g., `smtp.gmail.com`) |
| `EMAIL_PORT` | `25` | SMTP server port (e.g., `587` for TLS) |
| `EMAIL_HOST_USER` | empty | SMTP account username/email |
| `EMAIL_HOST_PASSWORD` | empty | SMTP password or Gmail App Password |
| `EMAIL_USE_TLS` | `True` | Enable TLS encryption for SMTP |
| `DEFAULT_FROM_EMAIL` | `no-reply@airbooking.local` | Sender email address |

## API Documentation

Base URL: `http://127.0.0.1:8000`

All endpoints return JSON. Protected endpoints require the `Authorization: Bearer <access_token>` header, and Admin endpoints require a staff account.

### Authentication Endpoints

| Method | Endpoint | Access | Request / Response Details |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Public | Body: `{username, email, password, password2, first_name, last_name, phone}`. Returns `201 Created` with status `pending` and emails a 6-digit email-confirmation code. |
| `POST` | `/api/auth/verify-email/` | Public | Body: `{email, otp}`. Confirms the registration code and marks the email as verified (codes expire after 10 minutes). |
| `POST` | `/api/auth/resend-verification/` | Public | Body: `{email}`. Sends a new email-confirmation code. |
| `POST` | `/api/auth/login/` | Public | Body: `{username, password}` (username can also be the email). Returns `{access, refresh, user}`, or `403` if the email is unconfirmed or the account is not approved. |
| `POST` | `/api/auth/token/refresh/` | Public | Body: `{refresh}`. Returns a new `{access}` token and blacklists the old refresh token. |
| `GET` | `/api/auth/me/` | Authenticated | Returns the current authenticated user's profile. |
| `POST` | `/api/auth/logout/` | Authenticated | Body: `{refresh}`. Blacklists the refresh token to end the session. |
| `POST` | `/api/auth/resend-approval/` | Public | Body: `{email}`. Queues an approval reminder email. |
| `POST` | `/api/auth/forgot-password/` | Public | Body: `{email}`. Emails a 6-digit password-reset code. |
| `POST` | `/api/auth/reset-password/` | Public | Body: `{email, otp, password, password2}`. Verifies the code and sets a new password. |

### Flight Endpoints

| Method | Endpoint | Access | Request / Response Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/flights/search/` | Authenticated | Query params: `origin`, `destination`, `date` (`YYYY-MM-DD`), `max_price`, `only_available`. |
| `GET` | `/api/flights/{id}/` | Authenticated | Returns details for a specific flight. |
| `GET` | `/api/flights/{id}/status/` | Authenticated | Returns live status from AirLabs (`"source": "AirLabs"`) or schedule-based fallback (`"source": "Simulated"`). |
| `GET` | `/api/flights/my/` | Authenticated | Lists flights booked by the logged-in user. |

### Booking Endpoints

| Method | Endpoint | Access | Request / Response Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/` | Authenticated | Lists all bookings for the authenticated user. |
| `POST` | `/api/bookings/` | Authenticated | Body: `{flight_id, seats, passenger_name, passenger_email}`. Returns `201` with `reference`, `total_amount`, `payment_status`. Optional `"simulate_failure": true` tests failed payment handling. |
| `GET` | `/api/bookings/{id}/` | Authenticated | Returns booking details for the owner (`404` for other users). |
| `POST` | `/api/bookings/{id}/cancel/` | Authenticated | Cancels booking, restores flight seats, and updates payment to `Refunded`. |
| `GET` | `/api/bookings/stats/` | Authenticated | Returns personal trip counts for users or revenue metrics for staff. |

### Admin Endpoints

| Method | Endpoint | Access | Request / Response Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users/pending/` | Admin | Lists registrations awaiting admin approval. |
| `GET` | `/api/admin/users/` | Admin | Lists users; supports `?status=pending`, `approved`, or `rejected`. |
| `POST` | `/api/admin/users/{id}/approve/` | Admin | Approves the user and dispatches the activation email via Celery. |
| `POST` | `/api/admin/users/{id}/reject/` | Admin | Rejects the user and dispatches a notification email via Celery. |
| `GET` | `/api/admin/flights/` | Admin | Lists all flights. |
| `POST` | `/api/admin/flights/` | Admin | Creates a new flight schedule. |
| `GET`, `PUT`, `PATCH` | `/api/admin/flights/{id}/` | Admin | Retrieves or updates an existing flight. |
| `PUT` | `/api/admin/flights/{id}/status/` | Admin | Body: `{status}`. Updates status (`On Time`, `Delayed`, `Boarding`, `Departed`, `Landed`, `Cancelled`). |
| `GET` | `/api/admin/flights/stats/` | Admin | Returns overall flight, seat capacity, booking, and pending user counts. |

## End-to-End User Flows

### 1. Registration and Admin Approval

1. A visitor submits the registration form at `/register`, creating an account with `approval_status = pending`.
2. The backend generates a 6-digit code and emails it via Celery. The visitor enters it on `/verify-email` to confirm the address (`email_verified = true`).
3. Attempting to log in before email confirmation or before approval returns `403 Forbidden` with a clear message.
4. An admin logs in at `/admin/login`, reviews pending registrations on the Admin Dashboard, and clicks **Approve** or **Reject**.
5. Django updates the user status and queues a Celery email task via Redis.
6. Once approved, the user logs in at `/login` and receives JWT access and refresh tokens.

### 2. Flight Search, Booking, and Trip Management

1. Authenticated users search flights on `/flights` using origin, destination, date, price, and availability filters.
2. Users select a flight, enter passenger details and seat count, and complete the simulated payment flow.
3. Bookings lock the flight record (`select_for_update`), deduct available seats, and generate a unique booking reference.
4. Users monitor flight status updates and cancel bookings from `/my-trips`.

## Additional Features Implemented

- **Concurrent Seat Locking:** Validates seat availability inside an atomic `select_for_update()` database transaction so simultaneous requests cannot oversell flights.
- **Automatic JWT Token Refresh:** Frontend Axios interceptors automatically refresh expired access tokens, retry failed requests, and log out cleanly if the refresh token is invalid.
- **Booking Cancellation & Seat Restoration:** Canceling a booking automatically releases reserved seats back to the flight and updates the payment record to `Refunded`.
- **Payment Failure Simulation:** Supports testing failed payment scenarios (`simulate_failure: true`) without deducting seat inventory.
- **Resilient Live Status Fallback:** Automatically falls back from the AirLabs API to schedule-based flight status if the API key is missing or unreachable.

## Troubleshooting

| Issue | Solution |
| :--- | :--- |
| `password authentication failed for user "postgres"` | Ensure `DB_PASSWORD` in `backend/.env` matches your local PostgreSQL password. |
| Celery fails with `No module named 'packaging'` | Activate your virtual environment and run `pip install packaging`. |
| Celery cannot connect to Redis | Start the Redis container with `docker start airbooking-redis`. |
| Approval email does not arrive in inbox | Verify `EMAIL_*` settings in `backend/.env` (Gmail requires a 16-character App Password) or inspect the Celery worker terminal when using the console backend. |
| Login fails with pending approval message | Log in as `admin` at `/admin/login` and approve the user account first. |
| Live flight status displays `Simulated` | Provide a valid `AIRLABS_API_KEY` in `backend/.env`, or use simulated mode for local testing. |