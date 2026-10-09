import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import entryRoutes from './routes/entries.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://garidepallimaheshkumar_db_user:6tsKhy87kwJM70Xz@cluster0.zfe6uvv.mongodb.net/token_ledger-MERN3';
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Allow any localhost / 127.0.0.1 port in development, plus anything listed in CLIENT_URL
const isLocal = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || isLocal(origin) || allowedOrigins.includes(origin)),
  })
);
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, message: 'Token Ledger API is running. Use /api/entries' }));
app.get(['/api/health', '/health'], (req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
);

// Clear message instead of a hanging request when MongoDB is down
app.use(['/api/entries', '/entries'], (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: `Server is running but MongoDB is not connected. Check that MongoDB is running and MONGO_URI in server/.env is correct (${MONGO_URI.replace(/\/\/.*@/, '//***@')}).`,
    });
  }
  next();
});
app.use(['/api/entries', '/entries'], entryRoutes); // works with or without the /api prefix

// JSON 404 for anything else, showing what was requested
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));

// Central error handler
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

// Start the API first so the frontend always gets an answer,
// then connect to MongoDB (retries every 5 seconds if it fails).
mongoose.set('bufferCommands', false);
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

async function connectDb() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}\nRetrying in 5 seconds...`);
    setTimeout(connectDb, 5000);
  }
}
connectDb();