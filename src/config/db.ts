// Import the Mongoose library, an ODM (Object Data Modeling) tool for MongoDB and Node.js
import mongoose from 'mongoose';

/**
 * connectDB - Establishes a connection to the MongoDB database.
 * @param uri - The MongoDB connection string (e.g. from MONGO_URI env variable).
 * @throws {Error} If the uri parameter is falsy/missing.
 *
 * This function is called once at application startup to open a persistent
 * connection that Mongoose reuses for all subsequent database operations.
 */
export const connectDB = async (uri: string | undefined): Promise<void> => {
  // Guard clause: throw immediately if no connection string was provided
  if (!uri) throw new Error('MONGO_URI is missing');

  try {
    // Attempt to connect to MongoDB using the provided URI.
    // mongoose.connect() returns a promise that resolves when the connection is established.
    await mongoose.connect(uri);

    // Log a success message so the developer knows the DB is ready
    console.log('✅ MongoDB connected');
  } catch (err) {
    // If the connection fails (wrong URI, network issue, auth failure, etc.),
    // log the error message for debugging purposes
    console.error('❌ MongoDB connection error:', (err as Error).message);

    // Exit the process with a failure code (1) because the app cannot
    // function without a database connection
    process.exit(1);
  }
};
