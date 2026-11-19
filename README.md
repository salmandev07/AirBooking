# AirBooking

A full-stack flight booking web application built with Django REST Framework and React. It includes user registration with an admin approval workflow, JWT authentication, flight search and booking with seat locking, live flight status tracking, and asynchronous email notifications using Celery and Redis.

## Features

- **User Registration and Admin Approval:** New accounts are created with a `pending` status and cannot log in until approved by an administrator.
- **JWT Authentication:** Uses SimpleJWT with access and refresh tokens, automatic token refresh, and refresh token blacklisting on logout.
- **Flight Search and Filtering:** Search available flights by origin, destination, departure date, maximum price, and seat availability.
- **Seat-Safe Booking System:** Reserves seats inside database transactions (`select_for_update`) to prevent overbooking, processes a simulated payment flow, and generates a booking reference.
- **Trip Management:** Users can view booked trips, check flight statuses, and cancel bookings (which automatically releases seats and marks the payment as refunded).
- **Admin Dashboard:** Dedicated admin login (`/admin/login`) and dashboard to review/approve/reject pending users, create or edit flights, update flight statuses, and view booking statistics.
- **Live Flight Status:** Fetches real-time flight status from the AirLabs API with an automatic schedule-based simulated fallback when no API key is configured.
- **Asynchronous Email Notifications:** Queues account approval and rejection emails via Celery and Redis so admin actions return immediately.

## Tech Stack

- **Backend:** Python, Django, Django REST Framework, SimpleJWT, django-cors-headers
- **Frontend:** React, React Router, Axios, Vite
- **Database:** PostgreSQL
- **Task Queue & Broker:** Celery, Redis
- **External API:** AirLabs API (with built-in simulated fallback)

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

### 2. Start PostgreSQL and Redis

Create the PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE air_booking;"
```

Start a Redis instance (using Docker or a local Redis server):

```bash
docker run -d --name airbooking-redis -p 6379:6379 redis:7-alpine
```

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
```

Update `backend/.env` with your local database credentials and optional API/SMTP keys:

- `SECRET_KEY`: Django secret key
- `DEBUG`: `True` for local development
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: PostgreSQL connection details (defaults to `air_booking` on `127.0.0.1:5432`)
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`: `redis://localhost:6379/0`
- `AIRLABS_API_KEY`: Optional API key from AirLabs (leave blank to use simulated flight status)
- `EMAIL_BACKEND`: Defaults to console email output in the terminal; set to `django.core.mail.backends.smtp.EmailBackend` along with `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and `EMAIL_USE_TLS` for real SMTP delivery

Run database migrations and seed the initial admin account and sample flights:

```bash
python manage.py migrate
python manage.py seed_data
```

### 4. Frontend Setup

Open a new terminal and install the frontend dependencies:

```bash
cd frontend
npm install
```

## Running the Application

Run the backend server, Celery worker, and React frontend in three separate terminals:

**Terminal 1 — Django Backend (`http://127.0.0.1:8000`):**
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 — Celery Worker:**
```bash
cd backend
venv\Scripts\activate
celery -A airbooking worker --pool=solo --loglevel=info
```
*(Note: `--pool=solo` is required on Windows; on macOS/Linux you can run `celery -A airbooking worker --loglevel=info`.)*

**Terminal 3 — React Frontend (`http://localhost:5173`):**
```bash
cd frontend
npm run dev
```

## Admin Credentials for Testing

Running `python manage.py seed_data` creates the default administrator account:

- **Admin Login URL:** `http://localhost:5173/admin/login`
- **Django Admin URL:** `http://127.0.0.1:8000/admin/`
- **Username:** `admin`
- **Password:** `admin123`

To test the user approval workflow, register a new user at `http://localhost:5173/register`, log in as `admin`, approve the user from the Admin Dashboard, and then log in with the newly approved user account.

## API Overview

Base URL: `http://127.0.0.1:8000`

All protected endpoints require the header `Authorization: Bearer <access_token>`.

**Authentication**
- `POST /api/auth/register/` — Register a new user (status defaults to `pending`)
- `POST /api/auth/login/` — Authenticate an approved user and return JWT tokens
- `POST /api/auth/token/refresh/` — Refresh and rotate JWT tokens
- `POST /api/auth/logout/` — Blacklist the refresh token
- `GET /api/auth/me/` — Retrieve current authenticated user details

**Flights**
- `GET /api/flights/search/` — Search flights (`origin`, `destination`, `date`, `max_price`, `only_available`)
- `GET /api/flights/{id}/` — Retrieve details for a specific flight
- `GET /api/flights/{id}/status/` — Fetch real-time or simulated status for a flight

**Bookings**
- `GET /api/bookings/` — List bookings for the logged-in user
- `POST /api/bookings/` — Create a new booking and process simulated payment
- `GET /api/bookings/{id}/` — View details of a specific booking
- `POST /api/bookings/{id}/cancel/` — Cancel a booking and release reserved seats

**Admin (Staff Only)**
- `GET /api/admin/users/pending/` — List users awaiting approval
- `POST /api/admin/users/{id}/approve/` — Approve a user and trigger activation email via Celery
- `POST /api/admin/users/{id}/reject/` — Reject a user registration
- `GET / POST /api/admin/flights/` — List all flights or create a new flight
- `PUT /api/admin/flights/{id}/status/` — Update flight status (`On Time`, `Delayed`, `Boarding`, `Departed`, `Landed`, `Cancelled`)
- `GET /api/admin/flights/stats/` — Retrieve platform flight and booking statistics

## Additional Features Implemented

- **Concurrent Seat Locking:** Uses database row-level locking (`select_for_update`) during booking creation so multiple simultaneous requests cannot oversell available seats.
- **Booking Cancellation & Seat Restoration:** Users can cancel active trips from "My Booked Trips," automatically returning seats to the flight and updating payment status to refunded.
- **Automatic JWT Token Refresh:** Frontend Axios interceptors automatically refresh expired access tokens and retry failed requests seamlessly.
- **Resilient Live Status Fallback:** Gracefully falls back from the AirLabs API to schedule-based flight status when offline or without an API key.