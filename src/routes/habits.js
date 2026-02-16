// Import Express to create a modular, mountable route handler
import express from 'express';

// Import the Habit model to interact with the 'habits' collection in MongoDB
import Habit from '../models/Habit.js';

// Import the auth middleware to protect all habit routes — only authenticated users can access them
import { authRequired } from '../middleware/auth.js';

// Create a new Express Router instance.
// This router will be mounted at "/habits" in index.js, so all routes here are relative to /habits.
const router = express.Router();

/**
 * toDayStartUTC - Utility function that normalizes a Date to midnight (00:00:00.000) UTC.
 * Used to compare dates on a "same calendar day" basis, ignoring the time component.
 * @param {Date} d - The date to normalize. Defaults to the current date/time.
 * @returns {Date} A new Date object set to the start of that UTC day.
 */
function toDayStartUTC(d = new Date()) {
  // Create a copy so we don't mutate the original date
  const dd = new Date(d);

  // Zero out hours, minutes, seconds, and milliseconds in UTC
  dd.setUTCHours(0, 0, 0, 0);
  return dd;
}

// ─── GET /habits ────────────────────────────────────────────────────────────────
// Retrieves all habits belonging to the authenticated user.
// The response includes Mongoose virtuals (todayLogged, totalLogs, currentStreak)
// thanks to .lean({ virtuals: true }), which returns plain JS objects with virtuals attached.
// Results are sorted by creation date in descending order (newest first).
router.get('/', authRequired, async (req, res) => {
  // Find all habits where userId matches the authenticated user's id.
  // .sort({ createdAt: -1 }) orders results newest-first.
  // .lean({ virtuals: true }) converts Mongoose documents to plain objects while preserving virtual fields.
  const habits = await Habit.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean({ virtuals: true });

  // Return the array of habit objects as JSON
  return res.json(habits);
});

// ─── POST /habits ───────────────────────────────────────────────────────────────
// Creates a new habit for the authenticated user.
// Request body: { title: string, description?: string }
// Success response: 201 with the created habit object
// Error response: 400 if title is missing
router.post('/', authRequired, async (req, res) => {
  // Destructure title and optional description from the request body
  const { title, description } = req.body || {};

  // Title is required — return 400 if missing
  if (!title) return res.status(400).json({ message: 'Title is required' });

  // Create a new habit document in MongoDB with the user's id, title, description, and an empty logs array
  const habit = await Habit.create({ userId: req.user.id, title, description, logs: [] });

  // Respond with 201 Created and the newly created habit
  return res.status(201).json(habit);
});

// ─── POST /habits/:id/log ───────────────────────────────────────────────────────
// Logs the habit as completed for today (UTC).
// Prevents duplicate entries: if today is already logged, returns 409 Conflict.
// URL param: :id = the habit's MongoDB _id
// Success response: 200 with the updated habit
// Error responses: 404 if habit not found; 409 if already logged today
router.post('/:id/log', authRequired, async (req, res) => {
  // Extract the habit id from the URL parameters
  const { id } = req.params;

  // Find the habit by its _id AND the authenticated user's id (ensures ownership)
  const habit = await Habit.findOne({ _id: id, userId: req.user.id });

  // If no matching habit found, return 404
  if (!habit) return res.status(404).json({ message: 'Habit not found' });

  // Get today's date normalized to midnight UTC
  const today = toDayStartUTC();

  // Check if any existing log entry already matches today's date
  const exists = habit.logs.some((d) => toDayStartUTC(d).getTime() === today.getTime());

  // If already logged today, return 409 Conflict to prevent duplicates
  if (exists) return res.status(409).json({ message: 'Already logged today' });

  // Add today's normalized date to the logs array
  habit.logs.push(today);

  // Save the updated habit document to MongoDB
  await habit.save();

  // Return the updated habit (virtuals like todayLogged/currentStreak will reflect the new log)
  return res.json(habit);
});

// ─── POST /habits/:id/unlog ─────────────────────────────────────────────────────
// Removes today's log entry for a habit (undo a completion).
// URL param: :id = the habit's MongoDB _id
// Success response: 200 with the updated habit
// Error responses: 404 if habit not found or no log exists for today
router.post('/:id/unlog', authRequired, async (req, res) => {
  // Extract the habit id from the URL parameters
  const { id } = req.params;

  // Find the habit by its _id AND the authenticated user's id (ensures ownership)
  const habit = await Habit.findOne({ _id: id, userId: req.user.id });

  // If no matching habit found, return 404
  if (!habit) return res.status(404).json({ message: 'Habit not found' });

  // Get today's date as a UTC-midnight timestamp for comparison
  const today = toDayStartUTC().getTime();

  // Store the current log count before filtering, so we can detect if anything was actually removed
  const before = habit.logs.length;

  // Filter out any log entries that match today's date, effectively "unlogging" today
  habit.logs = habit.logs.filter((d) => toDayStartUTC(d).getTime() !== today);

  // If the log count didn't change, there was no entry for today to remove
  if (habit.logs.length === before) return res.status(404).json({ message: 'No log for today' });

  // Save the updated habit document to MongoDB
  await habit.save();

  // Return the updated habit
  return res.json(habit);
});

// ─── DELETE /habits/:id ─────────────────────────────────────────────────────────
// Permanently deletes a habit and all its log history.
// URL param: :id = the habit's MongoDB _id
// Success response: 200 { message: 'Deleted' }
// Error response: 404 if habit not found or doesn't belong to the user
router.delete('/:id', authRequired, async (req, res) => {
  // Extract the habit id from the URL parameters
  const { id } = req.params;

  // Find and delete the habit in a single atomic operation.
  // The userId check ensures a user can only delete their own habits.
  const deleted = await Habit.findOneAndDelete({ _id: id, userId: req.user.id });

  // If no document was found and deleted, return 404
  if (!deleted) return res.status(404).json({ message: 'Habit not found' });

  // Confirm deletion to the client
  return res.json({ message: 'Deleted' });
});

// Export the router to be mounted in index.js at the "/habits" path
export default router;
