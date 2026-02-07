import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Mini Habit Tracker API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
