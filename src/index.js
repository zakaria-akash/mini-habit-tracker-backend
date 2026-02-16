// Import Express, the web framework used to create the HTTP server and define routes
import express from "express";

// Import CORS middleware to allow cross-origin requests (e.g. frontend on a different port/domain)
import cors from "cors";

// Import Helmet, which sets various HTTP security headers to protect the app from common web vulnerabilities
import helmet from "helmet";

// Import cookie-parser to parse cookies attached to incoming requests (used for reading auth tokens from cookies)
import cookieParser from "cookie-parser";

// Import Morgan, an HTTP request logger middleware that logs request details to the console for debugging
import morgan from "morgan";

// Import dotenv to load environment variables from the .env file into process.env
import dotenv from "dotenv";

// Load environment variables from the .env file at the project root.
// This makes variables like PORT, MONGO_URI, JWT_SECRET available via process.env.
dotenv.config();

// Create an Express application instance — this is the core object that handles routing and middleware
const app = express();

// Set the port the server will listen on.
// Uses the PORT environment variable if defined; otherwise defaults to 5000.
const PORT = process.env.PORT || 5000;

// ─── Middleware Registration ────────────────────────────────────────────────────
// Middleware functions run in order for every incoming request before reaching route handlers.

// Helmet: adds security-related HTTP headers (e.g. X-Content-Type-Options, Strict-Transport-Security)
app.use(helmet());

// CORS: enables Cross-Origin Resource Sharing so the frontend (running on a different origin) can make API calls
app.use(cors());

// express.json(): parses incoming requests with JSON payloads (Content-Type: application/json)
// and makes the parsed data available on req.body
app.use(express.json());

// cookie-parser: parses the Cookie header and populates req.cookies with key-value pairs
app.use(cookieParser());

// Morgan in "dev" mode: logs concise, color-coded request info (method, URL, status, response time)
app.use(morgan("dev"));

// ─── Routes ─────────────────────────────────────────────────────────────────────

// Health check route: a simple GET endpoint at the root URL ("/") used to verify the API is running.
// Useful for monitoring tools, load balancers, and quick manual checks.
app.get("/", (req, res) => {
  res.json({ message: "Mini Habit Tracker API is running" });
});

// ─── Start Server ───────────────────────────────────────────────────────────────

// Start the Express server and listen for incoming connections on the specified port.
// The callback logs a confirmation message once the server is ready to accept requests.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
