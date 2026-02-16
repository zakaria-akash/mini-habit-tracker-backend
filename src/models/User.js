// Import Mongoose to define the schema and create the model
import mongoose from 'mongoose';

/**
 * User Schema
 * Represents an application user who can register, log in, and own habits.
 * Passwords are stored as hashed strings (hashing is handled at the route/controller level).
 */
const userSchema = new mongoose.Schema(
  {
    // The user's email address, used as their unique login identifier.
    // - required: every user must have an email.
    // - unique: enforces a unique index in MongoDB so no two users share the same email.
    // - lowercase: automatically converts the email to lowercase before saving,
    //   ensuring case-insensitive uniqueness (e.g. "User@Mail.com" becomes "user@mail.com").
    // - trim: strips any leading or trailing whitespace.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // The user's password, stored as a bcrypt (or similar) hash — never in plain text.
    // - required: a password must be provided during registration.
    // Hashing is performed before saving (typically in the auth route/controller).
    password: { type: String, required: true },
  },
  {
    // timestamps option: automatically adds a 'createdAt' field recording when the user registered.
    // updatedAt is disabled (false) since we don't need to track profile update times.
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Create and export the Mongoose model named 'User' based on the userSchema.
// This model provides the interface for querying and manipulating the 'users' collection in MongoDB.
export default mongoose.model('User', userSchema);
