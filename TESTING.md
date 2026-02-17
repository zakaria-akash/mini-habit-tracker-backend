# Testing Guide — Mini Habit Tracker Backend

This document provides step-by-step instructions for manually testing every API endpoint using **cURL** and **Postman**. Follow the sections in order, as later tests depend on data created in earlier ones.

> **Note:** The backend is written in TypeScript. During development, use `npm run dev` (which runs `tsx watch`) to start the server. For production testing, first build with `npm run build`, then start with `npm start`.

---

## Table of Contents

1. [Setup](#setup)
2. [Health Check](#1-health-check)
3. [Auth: Signup](#2-auth-signup)
4. [Auth: Login](#3-auth-login)
5. [Auth: Get Current User](#4-auth-get-current-user)
6. [Habits: Create](#5-habits-create)
7. [Habits: List All](#6-habits-list-all)
8. [Habits: Log Today](#7-habits-log-today)
9. [Habits: Unlog Today](#8-habits-unlog-today)
10. [Habits: Delete](#9-habits-delete)
11. [Auth: Logout](#10-auth-logout)
12. [Error Scenarios](#11-error-scenarios)
13. [Postman Setup](#postman-setup)
14. [Testing Checklist](#testing-checklist)

---

## Setup

1. Make sure the backend is running:
   ```bash
   npm run dev
   ```
   Or for production mode:
   ```bash
   npm run build
   npm start
   ```
2. Confirm the server is up at `http://localhost:4000`.
3. Have a terminal (for cURL) or Postman ready.
4. Throughout this guide:
   - Replace `<token>` with the JWT you receive from the login endpoint.
   - Replace `<habit_id>` with the `_id` returned when creating a habit.

---

## 1. Health Check

Verify the API is running and reachable.

**cURL:**
```bash
curl http://localhost:4000/health
```

**Expected response (200):**
```json
{ "status": "ok" }
```

---

## 2. Auth: Signup

Register a new user account.

**cURL:**
```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "MySecurePass123"}'
```

**Expected response (201):**
```json
{ "message": "User created" }
```

**Verify duplicate prevention — run the same command again:**

**Expected response (400):**
```json
{ "message": "Email already registered" }
```

---

## 3. Auth: Login

Authenticate and receive a JWT token.

**cURL:**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "MySecurePass123"}' \
  -c cookies.txt
```

> The `-c cookies.txt` flag saves the httpOnly cookie to a file for use in subsequent requests.

**Expected response (200):**
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..." }
```

**Save the token** from the response for use in the next steps:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

---

## 4. Auth: Get Current User

Check the authenticated user's identity.

**cURL (using Authorization header):**
```bash
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**cURL (using cookie):**
```bash
curl http://localhost:4000/auth/me \
  -b cookies.txt
```

**Expected response (200):**
```json
{ "id": "664f1a2b3c4d5e6f7a8b9c0d", "email": "test@example.com" }
```

---

## 5. Habits: Create

Create a new habit for the logged-in user.

**cURL:**
```bash
curl -X POST http://localhost:4000/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Drink 8 glasses of water", "description": "Stay hydrated throughout the day"}'
```

**Expected response (201):**
```json
{
  "_id": "664f1b2c3d4e5f6a7b8c9d0e",
  "userId": "664f1a2b3c4d5e6f7a8b9c0d",
  "title": "Drink 8 glasses of water",
  "description": "Stay hydrated throughout the day",
  "logs": [],
  "createdAt": "2026-02-16T10:30:00.000Z"
}
```

**Save the `_id`** for use in the next steps:
```bash
HABIT_ID="664f1b2c3d4e5f6a7b8c9d0e"
```

Create a second habit to have multiple items to list:
```bash
curl -X POST http://localhost:4000/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Read for 15 minutes"}'
```

---

## 6. Habits: List All

Retrieve all habits for the authenticated user.

**cURL:**
```bash
curl http://localhost:4000/habits \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response (200):**
```json
[
  {
    "_id": "...",
    "title": "Read for 15 minutes",
    "logs": [],
    "todayLogged": false,
    "totalLogs": 0,
    "currentStreak": 0,
    ...
  },
  {
    "_id": "...",
    "title": "Drink 8 glasses of water",
    "logs": [],
    "todayLogged": false,
    "totalLogs": 0,
    "currentStreak": 0,
    ...
  }
]
```

**Things to verify:**
- Results are sorted newest-first (by `createdAt` descending).
- Virtual fields `todayLogged`, `totalLogs`, and `currentStreak` are present.
- Only habits belonging to the authenticated user are returned.

---

## 7. Habits: Log Today

Mark a habit as completed for today.

**cURL:**
```bash
curl -X POST http://localhost:4000/habits/$HABIT_ID/log \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response (200):**
```json
{
  "_id": "...",
  "title": "Drink 8 glasses of water",
  "logs": ["2026-02-16T00:00:00.000Z"],
  ...
}
```

**Verify duplicate prevention — run the same command again:**

**Expected response (409):**
```json
{ "message": "Already logged today" }
```

**Now list habits again and verify:**
```bash
curl http://localhost:4000/habits \
  -H "Authorization: Bearer $TOKEN"
```
- `todayLogged` should be `true` for the logged habit.
- `totalLogs` should be `1`.
- `currentStreak` should be `1`.

---

## 8. Habits: Unlog Today

Undo today's completion for a habit.

**cURL:**
```bash
curl -X POST http://localhost:4000/habits/$HABIT_ID/unlog \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response (200):**
```json
{
  "_id": "...",
  "title": "Drink 8 glasses of water",
  "logs": [],
  ...
}
```

**Verify unlog when no log exists — run the same command again:**

**Expected response (404):**
```json
{ "message": "No log for today" }
```

---

## 9. Habits: Delete

Permanently delete a habit.

**cURL:**
```bash
curl -X DELETE http://localhost:4000/habits/$HABIT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response (200):**
```json
{ "message": "Deleted" }
```

**Verify deletion — try to delete the same habit again:**

**Expected response (404):**
```json
{ "message": "Habit not found" }
```

---

## 10. Auth: Logout

Clear the authentication cookie.

**cURL:**
```bash
curl -X POST http://localhost:4000/auth/logout \
  -b cookies.txt -c cookies.txt
```

**Expected response (200):**
```json
{ "message": "Logged out" }
```

**Verify the cookie is cleared — try accessing a protected route with the cookie:**
```bash
curl http://localhost:4000/auth/me \
  -b cookies.txt
```

**Expected response (401):**
```json
{ "message": "Unauthorized" }
```

---

## 11. Error Scenarios

Test these additional error cases to ensure the API handles them correctly.

### Missing fields on signup
```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```
**Expected:** 400 — `{ "message": "Email and password are required" }`

### Wrong password on login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "WrongPassword"}'
```
**Expected:** 401 — `{ "message": "Invalid credentials" }`

### Non-existent email on login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "nobody@example.com", "password": "anything"}'
```
**Expected:** 401 — `{ "message": "Invalid credentials" }`

### Access protected route without token
```bash
curl http://localhost:4000/habits
```
**Expected:** 401 — `{ "message": "Unauthorized" }`

### Access protected route with invalid token
```bash
curl http://localhost:4000/habits \
  -H "Authorization: Bearer invalid.token.here"
```
**Expected:** 401 — `{ "message": "Unauthorized" }`

### Create habit without title
```bash
curl -X POST http://localhost:4000/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description": "No title provided"}'
```
**Expected:** 400 — `{ "message": "Title is required" }`

### Access another user's habit
Log in as a different user and try to log/delete a habit ID that belongs to the first user.

**Expected:** 404 — `{ "message": "Habit not found" }`

> The API returns 404 (not 403) intentionally to avoid revealing whether the habit exists.

---

## Postman Setup

For those who prefer a GUI-based testing tool:

### 1. Create a new Postman collection
Name it **Mini Habit Tracker API**.

### 2. Set up environment variables
Create a Postman environment with these variables:

| Variable   | Initial Value                |
| ---------- | ---------------------------- |
| `base_url` | `http://localhost:4000`      |
| `token`    | *(leave empty, set after login)* |
| `habit_id` | *(leave empty, set after create)* |

### 3. Add requests
Create requests for each endpoint using `{{base_url}}` as the base:

- `GET {{base_url}}/health`
- `POST {{base_url}}/auth/signup`
- `POST {{base_url}}/auth/login`
- `GET {{base_url}}/auth/me`
- `POST {{base_url}}/auth/logout`
- `GET {{base_url}}/habits`
- `POST {{base_url}}/habits`
- `POST {{base_url}}/habits/{{habit_id}}/log`
- `POST {{base_url}}/habits/{{habit_id}}/unlog`
- `DELETE {{base_url}}/habits/{{habit_id}}`

### 4. Auto-set token after login
In the **Login** request, go to the **Scripts > Post-response** tab and add:

```javascript
const response = pm.response.json();
if (response.token) {
  pm.environment.set("token", response.token);
}
```

### 5. Auto-set habit_id after creation
In the **Create Habit** request, add this post-response script:

```javascript
const response = pm.response.json();
if (response._id) {
  pm.environment.set("habit_id", response._id);
}
```

### 6. Set Authorization for protected routes
For all protected requests, go to the **Authorization** tab:
- Type: **Bearer Token**
- Token: `{{token}}`

---

## Testing Checklist

Use this checklist to track your testing progress:

### Health
- [ ] `GET /health` returns `{"status":"ok"}`

### Auth
- [ ] Signup with valid email and password returns 201
- [ ] Signup with duplicate email returns 400
- [ ] Signup with missing fields returns 400
- [ ] Login with valid credentials returns 200 + token
- [ ] Login with wrong password returns 401
- [ ] Login with non-existent email returns 401
- [ ] Login with missing fields returns 400
- [ ] `GET /auth/me` with valid token returns user info
- [ ] `GET /auth/me` with valid cookie returns user info
- [ ] `GET /auth/me` without token returns 401
- [ ] Logout clears the cookie

### Habits
- [ ] Create habit with title returns 201
- [ ] Create habit without title returns 400
- [ ] List habits returns array with virtual fields
- [ ] List habits returns only the authenticated user's habits
- [ ] List habits sorted by newest first
- [ ] Log today returns updated habit with new date in logs
- [ ] Log today twice returns 409 (duplicate prevention)
- [ ] Unlog today removes the date from logs
- [ ] Unlog when not logged returns 404
- [ ] Delete habit returns 200
- [ ] Delete non-existent habit returns 404
- [ ] All habit routes return 401 without authentication
- [ ] Cannot access another user's habits (returns 404)

### Streaks & Virtuals
- [ ] `todayLogged` is `false` when not logged today
- [ ] `todayLogged` is `true` after logging today
- [ ] `totalLogs` reflects the correct count
- [ ] `currentStreak` is `0` when not logged today
- [ ] `currentStreak` is `1` after logging only today
- [ ] `currentStreak` counts consecutive days correctly

### TypeScript Build
- [ ] `npm run build` compiles without errors
- [ ] `npm start` runs the compiled output from `dist/`
- [ ] `npm run dev` starts the development server with `tsx watch`
