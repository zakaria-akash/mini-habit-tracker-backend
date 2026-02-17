// Import Mongoose to define the schema and create the model
import mongoose, { Document, Types } from 'mongoose';

/**
 * IHabit - TypeScript interface representing a Habit document in MongoDB.
 */
export interface IHabit extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  logs: Date[];
  createdAt: Date;
  // Virtual fields
  todayLogged: boolean;
  totalLogs: number;
  currentStreak: number;
}

/**
 * Habit Schema
 * Represents a single habit that belongs to a specific user.
 * Each habit tracks its title, optional description, and an array of
 * date-based logs indicating when the habit was completed.
 */
const habitSchema = new mongoose.Schema<IHabit>(
  {
    // Reference to the User who owns this habit.
    // - ObjectId: MongoDB's unique identifier type, linking to the 'User' collection.
    // - ref: 'User' enables Mongoose population (joining) with the User model.
    // - required: every habit must belong to a user.
    // - index: creates a database index for fast lookups by userId.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // The name/title of the habit (e.g. "Drink 8 glasses of water").
    // - required: a habit must have a title.
    // - trim: removes leading/trailing whitespace automatically.
    // - maxlength: limits the title to 120 characters to keep it concise.
    title: { type: String, required: true, trim: true, maxlength: 120 },

    // An optional longer description providing more detail about the habit.
    // - trim: strips whitespace from both ends.
    // - maxlength: capped at 500 characters.
    description: { type: String, trim: true, maxlength: 500 },

    // An array of Date objects, each representing a day the habit was completed.
    // Daily uniqueness (one log per day) is enforced at the route/controller level
    // rather than at the schema level, with an optional schema-level guard.
    logs: [{ type: Date }],
  },
  {
    // timestamps option: automatically adds a 'createdAt' field with the document creation date.
    // updatedAt is disabled (set to false) since we don't need to track update times.
    timestamps: { createdAt: 'createdAt', updatedAt: false },

    // toJSON option: includes virtual properties when the document is converted to JSON
    // (e.g. when sending the response to the client via res.json()).
    toJSON: { virtuals: true },
  }
);

/**
 * toDayStartUTC - Utility function that normalizes a Date to midnight (00:00:00.000) UTC.
 * This allows comparing two dates on a "same calendar day" basis regardless of time.
 * @param d - The date to normalize. Defaults to the current date/time.
 * @returns A new Date object set to the start of that UTC day.
 */
function toDayStartUTC(d: Date = new Date()): Date {
  // Create a copy to avoid mutating the original date
  const dd = new Date(d);

  // Zero out hours, minutes, seconds, and milliseconds in UTC
  dd.setUTCHours(0, 0, 0, 0);
  return dd;
}

/**
 * Virtual: todayLogged
 * A computed boolean property that indicates whether the habit
 * has already been logged/completed for today (UTC).
 * Virtuals are not stored in the database; they are calculated on the fly.
 */
habitSchema.virtual('todayLogged').get(function (this: IHabit) {
  // If there are no logs at all, the habit was not logged today
  if (!this.logs?.length) return false;

  // Get the start of today in UTC (midnight)
  const today = toDayStartUTC();

  // Check if any log entry, when normalized to day-start UTC,
  // matches today's date (compare timestamps as numbers for accuracy)
  return this.logs.some((d) => toDayStartUTC(d).getTime() === today.getTime());
});

/**
 * Virtual: totalLogs
 * A computed property returning the total number of times
 * the habit has been logged/completed (i.e. the length of the logs array).
 */
habitSchema.virtual('totalLogs').get(function (this: IHabit) {
  return this.logs?.length || 0;
});

/**
 * Virtual: currentStreak
 * A computed property that calculates the current consecutive-day streak
 * for this habit, based on UTC dates.
 *
 * Streak rules:
 * - The streak requires today to be logged; if not, streak is 0.
 * - It counts backwards from today, day by day, as long as each
 *   previous day also has a log entry.
 */
habitSchema.virtual('currentStreak').get(function (this: IHabit) {
  // No logs means no streak
  if (!this.logs?.length) return 0;

  // Sort logs in descending order (newest first) and normalize each to day-start UTC.
  // .slice() creates a shallow copy so we don't mutate the original array.
  const sorted = this.logs.slice().sort((a, b) => b.getTime() - a.getTime()).map((d) => toDayStartUTC(d).getTime());

  // Remove duplicate days using a Set (in case multiple logs exist for the same day)
  const uniqDays = [...new Set(sorted)];

  let streak = 0;

  // Get today's date as a UTC-midnight timestamp for comparison
  const day = toDayStartUTC().getTime();

  // If today is not in the log list, the streak is broken — return 0
  if (!uniqDays.includes(day)) return 0;

  // Today is logged, so the streak starts at 1
  streak = 1;

  // Walk backwards one day at a time (86,400,000 ms = 24 hours).
  // As long as the previous day exists in the unique days set, increment the streak.
  while (uniqDays.includes(day - streak * 24 * 60 * 60 * 1000)) {
    streak += 1;
  }

  return streak;
});

// Create and export the Mongoose model named 'Habit' based on the habitSchema.
// This model provides the interface for querying and manipulating the 'habits' collection in MongoDB.
export default mongoose.model<IHabit>('Habit', habitSchema);
