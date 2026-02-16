// Import Express 5, the web framework used to create the HTTP server and define routes.
// Express 5 includes built-in async error handling — rejected promises in async route handlers
// are automatically forwarded to the Express error handler without needing explicit try/catch.
import express from 'express';

// Import CORS middleware to allow cross-origin requests (frontend on a different port/domain)
import cors from 'cors';

// Import cookie-parser to parse cookies from incoming requests (used for reading auth tokens)
import cookieParser from 'cookie-parser';

// Import dotenv to load environment variables from the .env file into process.env
import dotenv from 'dotenv';

// Import the database connection function to establish a MongoDB connection at startup
import { connectDB } from './config/db.js';

// Import the authentication route handlers (signup, login, logout, me)
import authRoutes from './routes/auth.js';

// Import the habit route handlers (CRUD operations and log/unlog)
import habitRoutes from './routes/habits.js';

// Load environment variables from the .env file at the project root.
// This makes variables like PORT, MONGO_URI, JWT_SECRET, CORS_ORIGIN available via process.env.
dotenv.config();

// Create an Express application instance — the core object that handles routing and middleware
const app = express();

// Set the port the server will listen on.
// Uses the PORT environment variable if defined; otherwise defaults to 4000.
const PORT = process.env.PORT || 4000;

// ─── Middleware Registration ────────────────────────────────────────────────────
// Middleware functions run in order for every incoming request before reaching route handlers.

// express.json(): parses incoming requests with JSON payloads (Content-Type: application/json)
// and makes the parsed data available on req.body
app.use(express.json());

// cookie-parser: parses the Cookie header and populates req.cookies with key-value pairs.
// This is needed for reading the httpOnly "token" cookie set during login.
app.use(cookieParser());

// Read the allowed frontend origin from environment variables, defaulting to localhost:3000 for development
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Configure CORS (Cross-Origin Resource Sharing) with specific settings:
app.use(
  cors({
    // origin: restricts which frontend domain can make requests to this API
    origin: corsOrigin,

    // credentials: true allows the browser to send/receive cookies in cross-origin requests.
    // Required for the httpOnly auth cookie to work across different origins.
    credentials: true,

    // allowedHeaders: specifies which request headers the client is allowed to send.
    // Content-Type for JSON bodies, Authorization for Bearer token authentication.
    allowedHeaders: ['Content-Type', 'Authorization'],

    // methods: restricts which HTTP methods are permitted for cross-origin requests.
    // OPTIONS is included for CORS preflight requests sent automatically by browsers.
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  })
);

// ─── Routes ─────────────────────────────────────────────────────────────────────

// Health check endpoint: a simple GET route used to verify the API is running.
// Useful for monitoring tools, load balancers, and deployment health checks.
// The _req prefix indicates the request parameter is intentionally unused.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Mount the authentication routes at /auth (e.g. POST /auth/signup, POST /auth/login, etc.)
app.use('/auth', authRoutes);

// Mount the habit routes at /habits (e.g. GET /habits, POST /habits, POST /habits/:id/log, etc.)
app.use('/habits', habitRoutes);

// ─── Start Server ───────────────────────────────────────────────────────────────

// First connect to MongoDB, then start the Express server.
// connectDB returns a promise — .then() ensures the server only starts after a successful DB connection.
// This prevents the API from accepting requests before the database is ready.
connectDB(process.env.MONGO_URI).then(() => {
  // Start listening for incoming HTTP connections on the specified port
  app.listen(PORT, () => console.log(`🚀 Backend listening on :${PORT}`));
});
