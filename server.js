import express from 'express';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { initDb } from './db.js';

dotenv.config();

const app = express();
app.use(express.json());

let db;

async function startServer() {
  db = await initDb();

  const users = db.collection('users');
  const tokens = db.collection('tokens');

  // Optional: separate register endpoint if you still want it
  app.post('/register', async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

    const existing = await users.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const id = uuidv4();
    await users.insertOne({ _id: id, name, email });
    res.json({ id, name, email });
  });

  // Token endpoint with auto-register
  app.post('/token', async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

    // Look for existing user
    let user = await users.findOne({ email });

    // Auto-create user if not found
    if (!user) {
      const id = uuidv4();
      await users.insertOne({ _id: id, name, email });
      user = { _id: id, name, email };
      console.log(`[Backend] Created new user: ${name} (${email})`);
    }

    // Generate token
    const token = uuidv4();
    await tokens.insertOne({ token, userId: user._id, createdAt: new Date() });

    res.json({ token });
  });

  // Protected route example
  app.get('/me', async (req, res) => {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    const tokenEntry = await tokens.findOne({ token: auth });
    if (!tokenEntry) return res.status(401).json({ error: 'Invalid token' });

    const user = await users.findOne({ _id: tokenEntry.userId }, { projection: { _id: 0 } });
    res.json(user);
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

startServer();
