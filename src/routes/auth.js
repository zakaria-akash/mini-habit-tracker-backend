// Import Express to create a modular, mountable route handler
import express from 'express';

// Import bcrypt for hashing and comparing passwords securely
import bcrypt from 'bcrypt';

// Import jsonwebtoken for creating and verifying JWT authentication tokens
import jwt from 'jsonwebtoken';

// Import the User model to interact with the 'users' collection in MongoDB
import User from '../models/User.js';

// Create a new Express Router instance.
// This router will be mounted at "/auth" in index.js, so all routes here are relative to /auth.
const router = express.Router();

// Number of salt rounds for bcrypt hashing.
// Higher values are more secure but slower; 10 is a good balance per the project spec.
const SALT_ROUNDS = 10;

// How long a JWT token remains valid before it expires (24 hours)
const TOKEN_TTL = '24h';

/**
 * signToken - Creates a signed JWT for an authenticated user.
 * @param {Object} user - The Mongoose user document.
 * @returns {string} A signed JWT string.
 *
 * The token payload contains:
 *   - sub: the user's MongoDB _id (standard JWT "subject" claim)
 *   - email: the user's email address
 * The token is signed with the JWT_SECRET from environment variables and expires after TOKEN_TTL.
 */
function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

/**
 * cookieOptions - Returns configuration options for the httpOnly auth cookie.
 * @returns {Object} Cookie settings object.
 *
 * In production:
 *   - secure: true (cookie only sent over HTTPS)
 *   - sameSite: 'none' (allows cross-site cookies, required when frontend/backend are on different domains)
 * In development:
 *   - secure: false (works over HTTP on localhost)
 *   - sameSite: 'lax' (default browser protection, sufficient for same-site dev)
 *
 * maxAge: cookie lifetime in milliseconds (24 hours = 86,400,000 ms), matching the JWT TTL.
 * httpOnly: true prevents JavaScript on the client from accessing the cookie (XSS protection).
 */
function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  };
}

// ─── POST /auth/signup ──────────────────────────────────────────────────────────
// Registers a new user account.
// Request body: { email: string, password: string }
// Success response: 201 { message: 'User created' }
// Error responses: 400 if fields missing, email already taken, or other failure
router.post('/signup', async (req, res) => {
  try {
    // Destructure email and password from the request body (default to empty object if body is null)
    const { email, password } = (req.body || {});

    // Validate that both fields are provided
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    // Check if a user with this email already exists in the database
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // Hash the plain-text password using bcrypt with the configured salt rounds.
    // This produces a one-way hash that can be verified later but not reversed.
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the new user document in MongoDB with the email and hashed password
    const user = await User.create({ email, password: hashed });

    // Respond with 201 Created (no token returned — user must log in separately)
    return res.status(201).json({ message: 'User created' });
  } catch (err) {
    // Catch any unexpected errors (e.g. validation errors, DB issues) and return 400
    return res.status(400).json({ message: 'Signup failed' });
  }
});

// ─── POST /auth/login ───────────────────────────────────────────────────────────
// Authenticates a user and issues a JWT.
// Request body: { email: string, password: string }
// Success response: 200 { token: string } + sets httpOnly "token" cookie
// Error responses: 400 if fields missing; 401 if credentials are invalid
router.post('/login', async (req, res) => {
  try {
    // Destructure email and password from the request body
    const { email, password } = (req.body || {});

    // Validate that both fields are provided
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    // Look up the user by email in the database
    const user = await User.findOne({ email });

    // If no user found, return 401. Use a generic message to avoid revealing whether the email exists.
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Compare the provided plain-text password against the stored bcrypt hash.
    // bcrypt.compare handles salt extraction and hashing internally.
    const valid = await bcrypt.compare(password, user.password);

    // If the password doesn't match, return 401 with a generic message
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    // Generate a signed JWT for the authenticated user
    const token = signToken(user);

    // Set the JWT as an httpOnly cookie (for browser-based frontend auth)
    res.cookie('token', token, cookieOptions());

    // Also return the token in the JSON response body (for non-browser clients or manual usage)
    return res.json({ token });
  } catch (err) {
    // Catch any unexpected errors and return 400
    return res.status(400).json({ message: 'Login failed' });
  }
});

// ─── POST /auth/logout ──────────────────────────────────────────────────────────
// Logs the user out by clearing the authentication cookie.
// No request body needed.
// Success response: 200 { message: 'Logged out' }
router.post('/logout', (req, res) => {
  // Clear the "token" cookie by setting the same options but with maxAge: 0,
  // which tells the browser to immediately expire/delete the cookie.
  res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });

  // Confirm the logout to the client
  return res.json({ message: 'Logged out' });
});

// ─── GET /auth/me ───────────────────────────────────────────────────────────────
// Returns the currently authenticated user's basic info (id, email).
// Used by the frontend to check if a user is still logged in on page load.
// Token source: Authorization header ("Bearer <token>") or httpOnly cookie.
// Success response: 200 { id: string, email: string }
// Error response: 401 if no valid token
router.get('/me', (req, res) => {
  try {
    // Read the Authorization header (empty string fallback if not set)
    const authHeader = req.get('Authorization') || '';

    // Extract the token from the "Bearer <token>" format, if present
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    // Fallback: try to read the token from the httpOnly cookie
    const cookieToken = req.cookies?.token;

    // Use whichever token source is available (header takes priority)
    const token = headerToken || cookieToken;

    // No token found — user is not authenticated
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    // Verify and decode the JWT. Throws if expired or invalid.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Return the user's id and email extracted from the token payload
    return res.json({ id: payload.sub, email: payload.email });
  } catch {
    // Token verification failed — return 401
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

// Export the router to be mounted in index.js at the "/auth" path
export default router;
