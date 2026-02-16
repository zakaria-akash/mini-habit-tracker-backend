# Mini Habit Tracker — Backend API

A RESTful API built with **Express.js** and **MongoDB** that powers the Mini Habit Tracker application. Users can sign up, log in, create daily habits, and track completion streaks.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Available Scripts](#available-scripts)
7. [API Endpoints](#api-endpoints)
8. [Authentication](#authentication)
9. [Data Models](#data-models)

---

## Tech Stack

| Technology   | Purpose                              |
| ------------ | ------------------------------------ |
| Node.js      | JavaScript runtime (>= 18.18.0)     |
| Express.js   | Web framework for REST API           |
| MongoDB      | NoSQL database (via MongoDB Atlas)   |
| Mongoose     | ODM for MongoDB                      |
| JWT          | Stateless authentication tokens      |
| bcrypt       | Password hashing                     |
| cookie-parser| Parse HTTP cookies                   |
| cors         | Cross-Origin Resource Sharing        |
| helmet       | Security HTTP headers                |
| morgan       | HTTP request logger                  |
| dotenv       | Environment variable management      |
| nodemon      | Auto-restart during development      |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js            # MongoDB connection setup
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── models/
│   │   ├── Habit.js         # Habit schema with virtuals (streak, todayLogged, etc.)
│   │   └── User.js          # User schema (email + hashed password)
│   ├── routes/
│   │   ├── auth.js          # Signup, login, logout, and session check routes
│   │   └── habits.js        # CRUD + log/unlog routes for habits
│   └── index.js             # App entry point — middleware, routes, and server startup
├── .env.example             # Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18.18.0 — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas** account (free tier works) — [Sign up](https://www.mongodb.com/cloud/atlas)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd mini-habit-tracker/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection string and a secure JWT secret (see [Environment Variables](#environment-variables) below).

### 4. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:4000`.

### 5. Verify it's running

```bash
curl http://localhost:4000/health
# Expected response: {"status":"ok"}
```

---

## Environment Variables

| Variable      | Description                                      | Example                                              |
| ------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `PORT`        | Port the server listens on                       | `4000`                                               |
| `NODE_ENV`    | Environment mode (`development` or `production`) | `development`                                        |
| `MONGO_URI`   | MongoDB Atlas connection string                  | `mongodb+srv://user:pass@cluster.mongodb.net/habits` |
| `JWT_SECRET`  | Secret key for signing JWT tokens                | A long random string (64+ characters recommended)    |
| `CORS_ORIGIN` | Allowed frontend origin for CORS                 | `http://localhost:3000`                               |

> **Important:** Never commit your `.env` file. It is already listed in `.gitignore`.

---

## Available Scripts

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `npm run dev`   | Start the server with **nodemon** (auto-restart)     |
| `npm start`     | Start the server with **node** (production)          |

---

## API Endpoints

### Health Check

| Method | Endpoint  | Description             |
| ------ | --------- | ----------------------- |
| GET    | `/health` | Returns `{"status":"ok"}` |

### Authentication (`/auth`)

| Method | Endpoint        | Body                        | Description                            |
| ------ | --------------- | --------------------------- | -------------------------------------- |
| POST   | `/auth/signup`  | `{ email, password }`       | Register a new user (201)              |
| POST   | `/auth/login`   | `{ email, password }`       | Log in and receive JWT + cookie (200)  |
| POST   | `/auth/logout`  | —                           | Clear the auth cookie (200)            |
| GET    | `/auth/me`      | —                           | Get current user info (requires token) |

### Habits (`/habits`) — All routes require authentication

| Method | Endpoint             | Body                          | Description                              |
| ------ | -------------------- | ----------------------------- | ---------------------------------------- |
| GET    | `/habits`            | —                             | List all habits for the logged-in user   |
| POST   | `/habits`            | `{ title, description? }`    | Create a new habit (201)                 |
| POST   | `/habits/:id/log`    | —                             | Mark habit as done for today (409 if duplicate) |
| POST   | `/habits/:id/unlog`  | —                             | Undo today's completion                  |
| DELETE | `/habits/:id`        | —                             | Permanently delete a habit               |

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for stateless authentication.

### How it works

1. **Sign up** — `POST /auth/signup` creates a user with a bcrypt-hashed password.
2. **Log in** — `POST /auth/login` returns a JWT in both:
   - The JSON response body (`{ token }`) — for API clients
   - An **httpOnly cookie** named `token` — for browser-based frontends
3. **Access protected routes** — Include the token via either:
   - `Authorization: Bearer <token>` header
   - The httpOnly cookie (sent automatically by the browser)
4. **Log out** — `POST /auth/logout` clears the auth cookie.

### Token details

- **Payload:** `{ sub: userId, email: userEmail }`
- **Expiry:** 24 hours
- **Algorithm:** HS256 (default)

---

## Data Models

### User

| Field      | Type   | Constraints                        |
| ---------- | ------ | ---------------------------------- |
| `email`    | String | Required, unique, lowercase, trimmed |
| `password` | String | Required (stored as bcrypt hash)   |
| `createdAt`| Date   | Auto-generated                     |

### Habit

| Field         | Type       | Constraints                             |
| ------------- | ---------- | --------------------------------------- |
| `userId`      | ObjectId   | Required, indexed, references User      |
| `title`       | String     | Required, trimmed, max 120 chars        |
| `description` | String     | Optional, trimmed, max 500 chars        |
| `logs`        | [Date]     | Array of UTC-midnight dates             |
| `createdAt`   | Date       | Auto-generated                          |

### Habit Virtual Fields (computed, not stored)

| Virtual         | Type    | Description                                        |
| --------------- | ------- | -------------------------------------------------- |
| `todayLogged`   | Boolean | Whether the habit has been logged today (UTC)      |
| `totalLogs`     | Number  | Total number of completion entries                 |
| `currentStreak` | Number  | Consecutive days logged ending today (UTC-based)   |
