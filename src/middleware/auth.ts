// Import the jsonwebtoken library for verifying JWT (JSON Web Token) authentication tokens
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

/**
 * AuthUser - Shape of the user object attached to req.user after authentication.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extend Express Request to include the user property set by authRequired.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * JwtPayload - Shape of the decoded JWT payload used in this application.
 */
interface AppJwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * authRequired - Express middleware that protects routes by requiring a valid JWT.
 *
 * Token sources (checked in order of priority):
 *   1. Authorization header in the format: "Bearer <token>"
 *   2. httpOnly cookie named "token" (set during login for browser-based clients)
 *
 * On success: attaches the authenticated user's id and email to req.user, then calls next().
 * On failure: responds with 401 Unauthorized.
 */
export const authRequired = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // ── Step 1: Extract token from the Authorization header ──────────────────
    // Read the Authorization header (returns empty string if not present)
    const authHeader = req.get('Authorization') || '';

    // Check if the header follows the "Bearer <token>" format.
    // If yes, extract the token portion (everything after "Bearer "); otherwise set to null.
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    // ── Step 2: Extract token from cookies as a fallback ─────────────────────
    // If no Authorization header token was found, try the httpOnly "token" cookie
    // (set by the login endpoint for browser/frontend usage).
    const cookieToken = req.cookies?.token as string | undefined;

    // ── Step 3: Determine which token to use ─────────────────────────────────
    // Prefer the header token; fall back to the cookie token.
    const token = headerToken || cookieToken;

    // If no token was found in either source, the request is unauthenticated
    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // ── Step 4: Verify the token ─────────────────────────────────────────────
    // jwt.verify() decodes and validates the token using the secret key.
    // If the token is expired, tampered with, or invalid, it throws an error
    // which is caught by the catch block below.
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AppJwtPayload;

    // ── Step 5: Attach user info to the request object ───────────────────────
    // Extract the user's ID (stored in the "sub" claim) and email from the token payload.
    // This makes req.user available to all downstream route handlers.
    req.user = { id: payload.sub, email: payload.email };

    // ── Step 6: Proceed to the next middleware or route handler ───────────────
    next();
  } catch {
    // If token verification fails (expired, invalid signature, malformed, etc.),
    // respond with a 401 status and a generic "Unauthorized" message.
    // A generic message is used intentionally to avoid leaking details about why auth failed.
    res.status(401).json({ message: 'Unauthorized' });
  }
};
